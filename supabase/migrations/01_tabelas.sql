-- =====================================================================
-- FlowCRM · 01 · Tabelas
-- Todas as tabelas de negócio têm empresa_id (multiempresa).
-- As regras de acesso (RLS) estão no ficheiro 02.
-- =====================================================================

-- ---------- empresas ----------
create table public.empresas (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null check (char_length(nome) between 2 and 100),
  -- slug = nome "limpo" usado no link do formulário público: /f/padaria-central
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  criado_em  timestamptz not null default now()
);

-- ---------- perfis (1 por utilizador do Supabase Auth) ----------
create table public.perfis (
  -- o id é o MESMO do utilizador em auth.users (o Supabase guarda lá a password, encriptada)
  id          uuid primary key references auth.users (id) on delete cascade,
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  nome        text not null check (char_length(nome) between 1 and 100),
  email       text not null,
  papel       text not null default 'comercial' check (papel in ('admin', 'comercial')),
  criado_em   timestamptz not null default now(),
  -- necessário para as outras tabelas poderem exigir "perfil DA MESMA empresa"
  unique (id, empresa_id)
);

-- ---------- clientes ----------
create table public.clientes (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references public.empresas (id) on delete cascade,
  responsavel_id  uuid,
  nome            text not null check (char_length(nome) between 1 and 150),
  email           text check (email is null or char_length(email) <= 254),
  telefone        text check (telefone is null or char_length(telefone) <= 30),
  estado          text not null default 'novo'
                  check (estado in ('novo', 'negociacao', 'ativo', 'perdido')),
  valor_previsto  numeric(12, 2) check (valor_previsto is null or valor_previsto >= 0),
  origem          text not null default 'manual' check (origem in ('manual', 'formulario')),
  criado_em       timestamptz not null default now(),
  unique (id, empresa_id),
  -- o responsável tem de ser um perfil da MESMA empresa do cliente.
  -- se o perfil for apagado, só o responsavel_id fica vazio (o cliente fica).
  foreign key (responsavel_id, empresa_id)
    references public.perfis (id, empresa_id) on delete set null (responsavel_id)
);

-- ---------- interações / notas ----------
create table public.interacoes (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  cliente_id  uuid not null,
  autor_id    uuid,
  tipo        text not null default 'nota' check (tipo in ('nota', 'chamada', 'email', 'reuniao')),
  nota        text not null check (char_length(nota) between 1 and 5000),
  criado_em   timestamptz not null default now(),
  -- o cliente e o autor têm de ser da MESMA empresa da interação
  foreign key (cliente_id, empresa_id)
    references public.clientes (id, empresa_id) on delete cascade,
  foreign key (autor_id, empresa_id)
    references public.perfis (id, empresa_id) on delete set null (autor_id)
);

-- ---------- tarefas / lembretes ----------
create table public.tarefas (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references public.empresas (id) on delete cascade,
  cliente_id      uuid not null,
  responsavel_id  uuid,
  titulo          text not null check (char_length(titulo) between 1 and 200),
  data_limite     date,
  concluida       boolean not null default false,
  criado_em       timestamptz not null default now(),
  foreign key (cliente_id, empresa_id)
    references public.clientes (id, empresa_id) on delete cascade,
  foreign key (responsavel_id, empresa_id)
    references public.perfis (id, empresa_id) on delete set null (responsavel_id)
);

-- ---------- registo das automações (ex.: email de boas-vindas) ----------
create table public.automacoes_log (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  cliente_id  uuid references public.clientes (id) on delete set null,
  tipo        text not null check (tipo in ('boas_vindas')),
  estado      text not null default 'pendente' check (estado in ('pendente', 'enviado', 'erro')),
  criado_em   timestamptz not null default now()
);

-- ---------- índices (tornam as pesquisas por empresa/cliente rápidas) ----------
create index on public.perfis (empresa_id);
create index on public.clientes (empresa_id);
create index on public.clientes (responsavel_id);
create index on public.interacoes (empresa_id);
create index on public.interacoes (cliente_id);
create index on public.interacoes (autor_id);
create index on public.tarefas (empresa_id);
create index on public.tarefas (cliente_id);
create index on public.tarefas (responsavel_id);
create index on public.automacoes_log (empresa_id);
create index on public.automacoes_log (cliente_id);
