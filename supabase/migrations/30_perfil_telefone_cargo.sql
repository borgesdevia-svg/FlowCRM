-- =====================================================================
-- FlowCRM · 30 · Telefone e cargo no perfil (página A minha conta)
-- Decisão do aluno (2026-11-23): cada pessoa pode guardar o seu telefone e o
-- seu cargo (ex.: "Comercial sénior"); a equipa vê-os na página Equipa.
-- Cada um só muda os SEUS (a política "editar o meu nome" já limita à própria
-- linha); o papel e a empresa continuam protegidos.
-- =====================================================================

alter table public.perfis
  add column if not exists telefone text check (telefone is null or char_length(telefone) between 6 and 30),
  add column if not exists cargo text check (cargo is null or char_length(cargo) between 2 and 60);

grant update (telefone, cargo) on public.perfis to authenticated;
