-- =====================================================================
-- FlowCRM · 16 · Automações
-- Três automações, todas feitas AQUI na base de dados (triggers e uma tarefa
-- agendada), para funcionarem venha o cliente de onde vier (formulário público,
-- painel, importação...):
--   1) Tarefa automática: cliente novo com responsável -> tarefa "Contactar <nome>" para hoje
--   2) Distribuir leads: lead do formulário sem responsável -> vai para a próxima pessoa da roda
--   3) Cliente parado: todos os dias às 8h, clientes Novo/Em negociação sem nada há X dias
--      -> tarefa "Retomar contacto com <nome>"
-- Cada empresa liga e desliga cada uma na página /painel/automacoes (só administradores).
-- Tudo o que as automações fazem fica escrito em automacoes_log (o "Registo").
-- =====================================================================

-- ---------- configuração (uma linha por empresa) ----------
create table public.automacoes (
  empresa_id         uuid primary key references public.empresas (id) on delete cascade,
  tarefa_ligada      boolean not null default true,   -- ligada numa empresa nova
  distribuir_ligada  boolean not null default false,
  parado_ligado      boolean not null default false,
  parado_dias        integer not null default 7 check (parado_dias between 1 and 90),
  atualizado_em      timestamptz not null default now()
);

-- quem entra na roda da distribuição. "ultimo_lead_em" diz quando cada um recebeu
-- o último lead: o próximo é sempre quem recebeu há mais tempo (assim vão à vez).
-- Se a pessoa sair da equipa, sai sozinha da roda (on delete cascade).
create table public.automacoes_distribuicao (
  empresa_id      uuid not null references public.empresas (id) on delete cascade,
  perfil_id       uuid not null,
  ultimo_lead_em  timestamptz,
  primary key (empresa_id, perfil_id),
  foreign key (perfil_id, empresa_id)
    references public.perfis (id, empresa_id) on delete cascade
);

-- empresas que já existem ficam com a configuração por defeito
insert into public.automacoes (empresa_id)
select id from public.empresas
on conflict do nothing;

-- empresas novas: a configuração é criada logo no registo
create function privado.nova_empresa_automacoes()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.automacoes (empresa_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger ao_criar_empresa_automacoes
  after insert on public.empresas
  for each row execute function privado.nova_empresa_automacoes();

-- ---------- registo: tipos novos e mais detalhe ----------
alter table public.automacoes_log drop constraint automacoes_log_tipo_check;
alter table public.automacoes_log
  add constraint automacoes_log_tipo_check
  check (tipo in ('boas_vindas', 'tarefa_novo_cliente', 'distribuir', 'cliente_parado'));

alter table public.automacoes_log drop constraint automacoes_log_estado_check;
alter table public.automacoes_log
  add constraint automacoes_log_estado_check
  check (estado in ('pendente', 'enviado', 'erro', 'feito'));

-- a quem foi entregue (o lead, ou a tarefa criada)
alter table public.automacoes_log
  add column perfil_id uuid references public.perfis (id) on delete set null;

create index on public.automacoes_log (empresa_id, criado_em desc);

-- ---------- RLS ----------
alter table public.automacoes enable row level security;
alter table public.automacoes_distribuicao enable row level security;
revoke all on public.automacoes, public.automacoes_distribuicao from anon;

create policy "admin ve as automacoes"
  on public.automacoes for select to authenticated
  using (empresa_id = (select privado.minha_empresa()) and (select privado.sou_admin()));

create policy "admin muda as automacoes"
  on public.automacoes for update to authenticated
  using (empresa_id = (select privado.minha_empresa()) and (select privado.sou_admin()))
  with check (empresa_id = (select privado.minha_empresa()));

-- o admin só muda os interruptores e os dias (a linha e a empresa não se mexem)
revoke update on public.automacoes from authenticated;
grant update (tarefa_ligada, distribuir_ligada, parado_ligado, parado_dias, atualizado_em)
  on public.automacoes to authenticated;

create policy "admin ve a roda"
  on public.automacoes_distribuicao for select to authenticated
  using (empresa_id = (select privado.minha_empresa()) and (select privado.sou_admin()));

create policy "admin poe pessoas na roda"
  on public.automacoes_distribuicao for insert to authenticated
  with check (empresa_id = (select privado.minha_empresa()) and (select privado.sou_admin()));

create policy "admin tira pessoas da roda"
  on public.automacoes_distribuicao for delete to authenticated
  using (empresa_id = (select privado.minha_empresa()) and (select privado.sou_admin()));

-- ---------- data de hoje em Portugal ----------
create function privado.hoje_portugal()
returns date
language sql stable
set search_path = ''
as $$
  select (now() at time zone 'Europe/Lisbon')::date;
$$;

-- ---------- tarefa "Contactar <nome>" (usada pelos dois triggers abaixo) ----------
create function privado.criar_tarefa_contactar(p_cliente public.clientes)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not coalesce((select tarefa_ligada from public.automacoes where empresa_id = p_cliente.empresa_id), true) then
    return;
  end if;

  insert into public.tarefas (empresa_id, cliente_id, responsavel_id, titulo, data_limite)
  values (p_cliente.empresa_id, p_cliente.id, p_cliente.responsavel_id,
          left('Contactar ' || p_cliente.nome, 200), privado.hoje_portugal());

  insert into public.automacoes_log (empresa_id, cliente_id, tipo, estado, perfil_id)
  values (p_cliente.empresa_id, p_cliente.id, 'tarefa_novo_cliente', 'feito', p_cliente.responsavel_id);
end;
$$;

-- ---------- 2) distribuir: ANTES de o cliente ser gravado ----------
create function privado.distribuir_lead()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_perfil uuid;
begin
  if new.origem <> 'formulario' or new.responsavel_id is not null then
    return new;
  end if;
  if not coalesce((select distribuir_ligada from public.automacoes where empresa_id = new.empresa_id), false) then
    return new;
  end if;

  -- quem recebeu há mais tempo (ou nunca recebeu). "for update" tranca a linha:
  -- dois leads ao mesmo tempo não vão parar à mesma pessoa
  select perfil_id into v_perfil
  from public.automacoes_distribuicao
  where empresa_id = new.empresa_id
  order by ultimo_lead_em asc nulls first, perfil_id
  limit 1
  for update;

  if v_perfil is null then
    return new; -- ninguém na roda: fica sem responsável (aparece o aviso aos administradores)
  end if;

  update public.automacoes_distribuicao
  set ultimo_lead_em = clock_timestamp()
  where empresa_id = new.empresa_id and perfil_id = v_perfil;

  new.responsavel_id := v_perfil;
  return new;
end;
$$;

create trigger antes_de_criar_cliente_distribuir
  before insert on public.clientes
  for each row execute function privado.distribuir_lead();

-- ---------- 1) tarefa automática: DEPOIS de o cliente ser gravado ----------
create function privado.depois_de_criar_cliente()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  -- o lead foi distribuído (veio do formulário e já tem responsável): fica registado
  if new.origem = 'formulario' and new.responsavel_id is not null then
    insert into public.automacoes_log (empresa_id, cliente_id, tipo, estado, perfil_id)
    values (new.empresa_id, new.id, 'distribuir', 'feito', new.responsavel_id);
  end if;

  -- sem responsável não há tarefa: os administradores recebem o aviso
  if new.responsavel_id is not null then
    perform privado.criar_tarefa_contactar(new);
  end if;
  return new;
end;
$$;

create trigger depois_de_criar_cliente
  after insert on public.clientes
  for each row execute function privado.depois_de_criar_cliente();

-- cliente que estava sem responsável e acabou de ser atribuído (ex.: pelo aviso):
-- ainda ninguém o contactou, por isso a tarefa "Contactar" é criada agora
create function privado.depois_de_atribuir_cliente()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if old.responsavel_id is null and new.responsavel_id is not null and new.estado = 'novo' then
    perform privado.criar_tarefa_contactar(new);
  end if;
  return new;
end;
$$;

create trigger depois_de_atribuir_cliente
  after update of responsavel_id on public.clientes
  for each row execute function privado.depois_de_atribuir_cliente();

-- ---------- 3) clientes parados ----------
-- "Parado" = Novo ou Em negociação, com responsável, sem tarefas por fazer,
-- e nada aconteceu há X dias: nem notas, nem mudanças de fase (eventos 'sistema'),
-- nem tarefas criadas ou concluídas, nem o próprio cliente foi criado nesse tempo.
create function privado.verificar_clientes_parados()
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_total integer;
begin
  with parados as (
    select c.id, c.empresa_id, c.responsavel_id, c.nome
    from public.clientes c
    join public.automacoes a on a.empresa_id = c.empresa_id and a.parado_ligado
    where c.estado in ('novo', 'negociacao')
      and c.responsavel_id is not null
      and c.criado_em < now() - make_interval(days => a.parado_dias)
      and not exists (
        select 1 from public.tarefas t
        where t.cliente_id = c.id
          and (not t.concluida
               or t.criado_em >= now() - make_interval(days => a.parado_dias)
               or t.concluida_em >= now() - make_interval(days => a.parado_dias)))
      and not exists (
        select 1 from public.interacoes i
        where i.cliente_id = c.id
          and i.criado_em >= now() - make_interval(days => a.parado_dias))
  ),
  novas as (
    insert into public.tarefas (empresa_id, cliente_id, responsavel_id, titulo, data_limite)
    select empresa_id, id, responsavel_id, left('Retomar contacto com ' || nome, 200), privado.hoje_portugal()
    from parados
    returning empresa_id, cliente_id, responsavel_id
  )
  insert into public.automacoes_log (empresa_id, cliente_id, tipo, estado, perfil_id)
  select empresa_id, cliente_id, 'cliente_parado', 'feito', responsavel_id from novas;

  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

-- ninguém de fora chama as funções internas
revoke all on function privado.nova_empresa_automacoes() from public;
revoke all on function privado.hoje_portugal() from public;
revoke all on function privado.criar_tarefa_contactar(public.clientes) from public;
revoke all on function privado.distribuir_lead() from public;
revoke all on function privado.depois_de_criar_cliente() from public;
revoke all on function privado.depois_de_atribuir_cliente() from public;
revoke all on function privado.verificar_clientes_parados() from public;

-- ---------- agendamento: pg_cron ----------
-- O pg_cron conta as horas em UTC; Portugal muda a hora no verão.
-- Por isso corre de hora a hora e só faz o trabalho quando são 8h em Lisboa.
create extension if not exists pg_cron;

select cron.schedule(
  'flowcrm-clientes-parados',
  '0 * * * *',
  $$select privado.verificar_clientes_parados()
    where extract(hour from now() at time zone 'Europe/Lisbon') = 8$$
);
