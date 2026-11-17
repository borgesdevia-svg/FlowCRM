-- 14 — Visita guiada (aplicada a 2026-11-16, no trabalho feito na escola)
-- Guarda se a pessoa já viu a visita guiada do painel.
-- Nota: o tutorial atual (components/painel/Tutorial.js) guarda isto no user_metadata da conta.
alter table public.perfis
  add column if not exists visita_vista boolean not null default false;
grant update (visita_vista) on public.perfis to authenticated;
