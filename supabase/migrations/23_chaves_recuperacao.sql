-- 23: chave de recuperação da password, sem email (2026-11-22)
--
-- Cada pessoa recebe uma chave de 30 caracteres que guarda no computador.
-- Em "Esqueci-me da password" escreve o email + a chave e escolhe uma password nova.
--
-- A chave NUNCA é guardada: só o seu hash SHA-256 (64 caracteres em hexadecimal).
-- Mesmo quem conseguisse ler esta tabela não ficava com as chaves.
-- guardada = a pessoa já confirmou "Já guardei a chave" (senão o painel volta a mostrá-la).
-- Cada chave só serve uma vez: depois de usada, a linha é apagada e o painel gera outra.
--
-- RLS ligado e SEM políticas: pela API ninguém lê nem escreve aqui (nem o próprio).
-- Só o servidor do site, com a chave secreta do Supabase (lib/supabase/admin.js), mexe nesta tabela.

create table public.chaves_recuperacao (
  perfil_id  uuid primary key references public.perfis (id) on delete cascade,
  hash       text not null check (hash ~ '^[0-9a-f]{64}$'),
  guardada   boolean not null default false,
  criada_em  timestamptz not null default now()
);

alter table public.chaves_recuperacao enable row level security;
revoke all on public.chaves_recuperacao from anon, authenticated;
