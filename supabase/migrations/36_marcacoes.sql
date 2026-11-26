-- 36: marcações online (página pública /m/<slug>).
--
-- marcacoes_config: o horário de cada empresa (uma linha por empresa).
-- marcacoes: cada reunião/consulta marcada por um cliente.
--
-- Quem cria as marcações é o servidor (Server Action marcar, com a chave secreta), depois de
-- confirmar que a hora está livre e dentro do horário. Por isso não há política de "insert"
-- para os utilizadores: pela API só se lê e se cancela.

-- ---------- horário ----------
create table public.marcacoes_config (
  empresa_id          uuid primary key references public.empresas (id) on delete cascade,
  ligada              boolean not null default false,
  -- dias da semana em que se marca: 0 = domingo, 1 = segunda, ..., 6 = sábado
  dias                smallint[] not null default '{1,2,3,4,5}'
                      check (dias <@ '{0,1,2,3,4,5,6}'::smallint[] and cardinality(dias) between 1 and 7),
  hora_inicio         time not null default '09:00',
  hora_fim            time not null default '18:00',
  duracao             smallint not null default 30 check (duracao in (15, 20, 30, 45, 60, 90, 120)),
  antecedencia_horas  smallint not null default 2 check (antecedencia_horas between 0 and 168),
  dias_frente         smallint not null default 30 check (dias_frente between 1 and 90),
  atualizado_em       timestamptz not null default now(),
  check (hora_fim > hora_inicio)
);

alter table public.marcacoes_config enable row level security;

create policy "ver horario"
  on public.marcacoes_config for select to authenticated
  using (empresa_id = (select privado.minha_empresa()));

create policy "criar horario"
  on public.marcacoes_config for insert to authenticated
  with check (
    empresa_id = (select privado.minha_empresa())
    and (select privado.sou_admin())
    and (select privado.minha_empresa_ativa())
  );

create policy "mudar horario"
  on public.marcacoes_config for update to authenticated
  using (
    empresa_id = (select privado.minha_empresa())
    and (select privado.sou_admin())
    and (select privado.minha_empresa_ativa())
  )
  with check (empresa_id = (select privado.minha_empresa()));

-- ---------- marcações ----------
create table public.marcacoes (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  cliente_id  uuid not null,
  inicio      timestamptz not null,
  fim         timestamptz not null,
  nota        text check (nota is null or char_length(nota) <= 1000),
  estado      text not null default 'marcada' check (estado in ('marcada', 'cancelada')),
  criado_em   timestamptz not null default now(),
  check (fim > inicio),
  foreign key (cliente_id, empresa_id) references public.clientes (id, empresa_id) on delete cascade
);

-- duas marcações ativas nunca começam à mesma hora na mesma empresa
create unique index marcacoes_sem_repetir on public.marcacoes (empresa_id, inicio) where estado = 'marcada';
create index marcacoes_empresa_inicio on public.marcacoes (empresa_id, inicio);
create index marcacoes_cliente on public.marcacoes (cliente_id);

alter table public.marcacoes enable row level security;

-- vê as marcações dos leads que pode ver (o admin todos; o comercial os seus, pelo RLS dos clientes)
create policy "ver marcacoes"
  on public.marcacoes for select to authenticated
  using (
    empresa_id = (select privado.minha_empresa())
    and exists (select 1 from public.clientes c where c.id = marcacoes.cliente_id)
  );

-- cancelar (só a coluna "estado"), com a empresa ativa
create policy "cancelar marcacoes"
  on public.marcacoes for update to authenticated
  using (
    empresa_id = (select privado.minha_empresa())
    and (select privado.minha_empresa_ativa())
    and exists (select 1 from public.clientes c where c.id = marcacoes.cliente_id)
  )
  with check (empresa_id = (select privado.minha_empresa()));

revoke insert, update, delete on public.marcacoes from anon, authenticated;
grant update (estado) on public.marcacoes to authenticated;
