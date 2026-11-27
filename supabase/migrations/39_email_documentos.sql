-- =====================================================================
-- FlowCRM · 39 · E-mail e documentos na ficha do cliente
-- Aplicada no Supabase a 2026-11-27 (versão 20261127155303).
-- Ficheiro recriado a partir do SQL guardado em supabase_migrations.schema_migrations,
-- porque a migração foi aplicada sem ficar no repositório.
--   · contas_email: conta de e-mail ligada por pessoa (SMTP/IMAP, password cifrada);
--     sem acesso direto pelo browser (só o servidor lê).
--   · emails: e-mails enviados/recebidos associados a um cliente.
--   · documentos: ficheiros do cliente (fatura, proposta, contrato, outro)
--     + bucket privado "documentos" (máx. 10 MB).
-- =====================================================================

create table public.contas_email (
  perfil_id          uuid primary key,
  empresa_id         uuid not null references public.empresas (id) on delete cascade,
  email              text not null check (char_length(email) between 3 and 254),
  nome_remetente     text check (nome_remetente is null or char_length(nome_remetente) <= 100),
  smtp_host          text not null check (char_length(smtp_host) between 3 and 253),
  smtp_porta         int  not null check (smtp_porta between 1 and 65535),
  imap_host          text not null check (char_length(imap_host) between 3 and 253),
  imap_porta         int  not null check (imap_porta between 1 and 65535),
  utilizador         text not null check (char_length(utilizador) between 1 and 254),
  password_cifrada   text not null check (char_length(password_cifrada) <= 2000),
  assinatura         text check (assinatura is null or char_length(assinatura) <= 1000),
  ligada_em          timestamptz not null default now(),
  foreign key (perfil_id, empresa_id)
    references public.perfis (id, empresa_id) on delete cascade
);
alter table public.contas_email enable row level security;
revoke all on public.contas_email from anon, authenticated;

create table public.emails (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references public.empresas (id) on delete cascade,
  cliente_id     uuid not null,
  autor_id       uuid,
  direcao        text not null check (direcao in ('enviado', 'recebido')),
  de             text not null check (char_length(de) <= 320),
  para           text not null check (char_length(para) <= 1000),
  assunto        text not null default '' check (char_length(assunto) <= 300),
  corpo          text not null default '' check (char_length(corpo) <= 50000),
  message_id     text check (message_id is null or char_length(message_id) <= 500),
  em_resposta_a  text check (em_resposta_a is null or char_length(em_resposta_a) <= 500),
  anexos         jsonb not null default '[]'::jsonb check (jsonb_typeof(anexos) = 'array'),
  enviado_em     timestamptz not null default now(),
  criado_em      timestamptz not null default now(),
  unique (empresa_id, message_id),
  foreign key (cliente_id, empresa_id)
    references public.clientes (id, empresa_id) on delete cascade,
  foreign key (autor_id, empresa_id)
    references public.perfis (id, empresa_id) on delete set null (autor_id)
);
create index on public.emails (cliente_id, enviado_em desc);
create index on public.emails (autor_id);
alter table public.emails enable row level security;

create policy "ver emails"
  on public.emails for select to authenticated
  using (
    empresa_id = (select privado.minha_empresa())
    and exists (select 1 from public.clientes c where c.id = cliente_id)
  );

create policy "registar emails enviados"
  on public.emails for insert to authenticated
  with check (
    empresa_id = (select privado.minha_empresa())
    and autor_id = (select auth.uid())
    and direcao = 'enviado'
    and exists (select 1 from public.clientes c where c.id = cliente_id)
  );

grant select, insert on public.emails to authenticated;

create table public.documentos (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  cliente_id  uuid not null,
  autor_id    uuid,
  categoria   text not null default 'outro' check (categoria in ('fatura', 'proposta', 'contrato', 'outro')),
  nome        text not null check (char_length(nome) between 1 and 200),
  caminho     text not null unique check (char_length(caminho) <= 300),
  tamanho     int  not null check (tamanho between 1 and 10485760),
  tipo_mime   text not null check (char_length(tipo_mime) <= 100),
  criado_em   timestamptz not null default now(),
  foreign key (cliente_id, empresa_id)
    references public.clientes (id, empresa_id) on delete cascade,
  foreign key (autor_id, empresa_id)
    references public.perfis (id, empresa_id) on delete set null (autor_id)
);
create index on public.documentos (cliente_id, criado_em desc);
create index on public.documentos (autor_id);
alter table public.documentos enable row level security;

create policy "ver documentos"
  on public.documentos for select to authenticated
  using (
    empresa_id = (select privado.minha_empresa())
    and exists (select 1 from public.clientes c where c.id = cliente_id)
  );

create policy "criar documentos"
  on public.documentos for insert to authenticated
  with check (
    empresa_id = (select privado.minha_empresa())
    and autor_id = (select auth.uid())
    and exists (select 1 from public.clientes c where c.id = cliente_id)
  );

create policy "apagar documentos"
  on public.documentos for delete to authenticated
  using (
    empresa_id = (select privado.minha_empresa())
    and (autor_id = (select auth.uid()) or (select privado.sou_admin()))
  );

grant select, insert, delete on public.documentos to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos', 'documentos', false, 10485760,
  array[
    'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv', 'application/zip'
  ]
)
on conflict (id) do nothing;
