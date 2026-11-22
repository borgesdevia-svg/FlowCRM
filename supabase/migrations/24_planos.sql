-- =====================================================================
-- FlowCRM · 24 · Planos (CRM Essencial e CRM Pro) e design livre do formulário
--
-- Cada empresa tem um plano:
--   plano = 'pro' e teste_ate no futuro  -> a experimentar o Pro (14 dias, ao registar)
--   plano = 'pro' e teste_ate vazio      -> Pro pago (por agora, posto à mão)
--   plano = 'essencial', ou o teste acabou -> Essencial
-- Ainda não há pagamentos: quando o teste acaba, a empresa passa a ter só o Essencial
-- (não perde dados nem o acesso).
--
-- O que é só do Pro, e é travado AQUI na base de dados (não só no site):
--   - as 3 automações (tarefa "Contactar", distribuir à vez, leads parados);
--   - o logótipo e o design livre do formulário público.
-- O administrador NÃO pode mudar o plano (a coluna não está no "grant update").
-- =====================================================================

alter table public.empresas
  add column plano text not null default 'pro'
    check (plano in ('essencial', 'pro')),
  add column teste_ate timestamptz default (now() + interval '14 days'),
  -- design do formulário (só conta no Pro): disposição, logótipo, cor, fundo, cantos, letra...
  -- os valores são validados no servidor (lib/formularioDesign.js) e lidos sempre de listas fixas
  add column form_design jsonb not null default '{}'::jsonb
    check (jsonb_typeof(form_design) = 'object' and pg_column_size(form_design) <= 2000);

-- o administrador pode mudar o design (o plano e o teste não)
grant update (form_design) on public.empresas to authenticated;

-- ---------- a empresa tem o Pro neste momento? ----------
create function privado.tem_pro(p_empresa uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(
    (select plano = 'pro' and (teste_ate is null or teste_ate > now())
     from public.empresas where id = p_empresa),
    false);
$$;

revoke all on function privado.tem_pro(uuid) from public, anon, authenticated;

-- ---------- automações: só correm no Pro ----------
create or replace function privado.criar_tarefa_contactar(p_cliente public.clientes)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not privado.tem_pro(p_cliente.empresa_id) then
    return;
  end if;
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

create or replace function privado.distribuir_lead()
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
  if not privado.tem_pro(new.empresa_id) then
    return new;
  end if;
  if not coalesce((select distribuir_ligada from public.automacoes where empresa_id = new.empresa_id), false) then
    return new;
  end if;

  select perfil_id into v_perfil
  from public.automacoes_distribuicao
  where empresa_id = new.empresa_id
  order by ultimo_lead_em asc nulls first, perfil_id
  limit 1
  for update;

  if v_perfil is null then
    return new;
  end if;

  update public.automacoes_distribuicao
  set ultimo_lead_em = clock_timestamp()
  where empresa_id = new.empresa_id and perfil_id = v_perfil;

  new.responsavel_id := v_perfil;
  return new;
end;
$$;

create or replace function privado.verificar_clientes_parados()
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
    where privado.tem_pro(c.empresa_id)
      and c.estado in ('novo', 'negociacao')
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

-- ---------- formulário público: logótipo e design só no Pro ----------
create or replace function public.formulario_publico(p_slug text)
returns json
language sql stable security definer
set search_path = ''
as $$
  select json_build_object(
    'nome', nome,
    'logo_url', case when privado.tem_pro(id) then logo_url end,
    'design', case when privado.tem_pro(id) then form_design end,
    'perguntas', perguntas,
    'cor', form_cor,
    'titulo', form_titulo,
    'texto', form_texto,
    'obrigado_texto', obrigado_texto,
    'obrigado_botao_texto', obrigado_botao_texto,
    'obrigado_botao_link', obrigado_botao_link
  )
  from public.empresas where slug = p_slug;
$$;
