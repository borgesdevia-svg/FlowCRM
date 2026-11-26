-- 34: avisos no telemóvel/PC (web push) quando entra um lead novo pelo formulário (aplicada a 2026-11-26).
--
-- Cada browser onde alguém liga os avisos (em A minha conta) guarda aqui uma "subscrição":
-- o endereço do serviço de avisos do browser (endpoint) e as duas chaves para cifrar a mensagem.
-- Uma pessoa pode ter várias (telemóvel + PC).
--
-- Regras:
--  - cada pessoa só vê, cria e apaga as SUAS subscrições;
--  - quem envia os avisos é o servidor (chave secreta), que lê as do responsável e dos admins;
--  - se a pessoa sair da empresa (perfil apagado), as subscrições vão com ela.

create table public.subscricoes_push (
  id          uuid primary key default gen_random_uuid(),
  perfil_id   uuid not null references public.perfis (id) on delete cascade,
  endpoint    text not null unique check (char_length(endpoint) <= 1000 and endpoint like 'https://%'),
  p256dh      text not null check (char_length(p256dh) <= 200),
  auth        text not null check (char_length(auth) <= 100),
  criado_em   timestamptz not null default now()
);

create index subscricoes_push_perfil on public.subscricoes_push (perfil_id);

alter table public.subscricoes_push enable row level security;

create policy "ver as minhas subscricoes"
  on public.subscricoes_push for select to authenticated
  using (perfil_id = (select auth.uid()));

create policy "criar as minhas subscricoes"
  on public.subscricoes_push for insert to authenticated
  with check (perfil_id = (select auth.uid()));

create policy "apagar as minhas subscricoes"
  on public.subscricoes_push for delete to authenticated
  using (perfil_id = (select auth.uid()));
