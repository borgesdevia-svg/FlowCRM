-- =====================================================================
-- FlowCRM · 43 · Modelos de e-mail (página E-mails)
-- Pedido do aluno (2026-11-27): além da mensagem do início (perfis.email_modelo, migração 38),
-- cada pessoa pode guardar alguns e-mails pré-definidos (nome, assunto e texto) e usá-los na
-- janela de escrever da ficha do lead. Cada pessoa só vê e mexe nos SEUS modelos.
-- O limite de 30 modelos por pessoa é verificado no servidor (lib/acoes/emailModelos.js).
-- =====================================================================

create table public.email_modelos (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references public.empresas (id) on delete cascade,
  perfil_id      uuid not null,
  nome           text not null check (char_length(nome) between 1 and 80),
  assunto        text not null default '' check (char_length(assunto) <= 300),
  corpo          text not null check (char_length(corpo) between 1 and 10000),
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  foreign key (perfil_id, empresa_id)
    references public.perfis (id, empresa_id) on delete cascade
);
create index on public.email_modelos (perfil_id, nome);
create index on public.email_modelos (empresa_id);
alter table public.email_modelos enable row level security;

create policy "ver os meus modelos de e-mail"
  on public.email_modelos for select to authenticated
  using (perfil_id = (select auth.uid()) and empresa_id = (select privado.minha_empresa()));

create policy "criar os meus modelos de e-mail"
  on public.email_modelos for insert to authenticated
  with check (perfil_id = (select auth.uid()) and empresa_id = (select privado.minha_empresa()));

create policy "editar os meus modelos de e-mail"
  on public.email_modelos for update to authenticated
  using (perfil_id = (select auth.uid()) and empresa_id = (select privado.minha_empresa()))
  with check (perfil_id = (select auth.uid()) and empresa_id = (select privado.minha_empresa()));

create policy "apagar os meus modelos de e-mail"
  on public.email_modelos for delete to authenticated
  using (perfil_id = (select auth.uid()) and empresa_id = (select privado.minha_empresa()));

revoke all on public.email_modelos from anon;
grant select, insert, update, delete on public.email_modelos to authenticated;
