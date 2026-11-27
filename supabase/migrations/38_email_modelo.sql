-- =====================================================================
-- FlowCRM · 38 · Texto pré-escrito do e-mail (A minha conta › Definições de e-mail)
-- Decisão do aluno (2026-11-27): cada pessoa guarda o início que escreve sempre
-- nos e-mails (ex.: "{saudacao}, {nome}. Aqui fala o {eu}, da {empresa}.").
-- O botão de e-mail da ficha abre o Gmail com este texto já escrito.
-- Cada um só muda o SEU (a política "editar o meu nome" já limita à própria linha).
-- =====================================================================

alter table public.perfis
  add column if not exists email_modelo text check (email_modelo is null or char_length(email_modelo) between 1 and 1000);

grant update (email_modelo) on public.perfis to authenticated;
