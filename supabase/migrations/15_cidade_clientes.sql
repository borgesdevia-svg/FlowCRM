-- 15 — Cidade dos clientes (aplicada a 2026-11-16, no trabalho feito na escola)
alter table public.clientes
  add column if not exists cidade text
  check (cidade is null or char_length(cidade) between 1 and 100);
