-- 07: preparar a lista de clientes e o pipeline para milhares de clientes
-- (as páginas deixam de carregar todos os clientes de uma vez)

-- ---------- coluna de pesquisa sem acentos ----------
-- unaccent() não é "imutável" para o Postgres; esta função embrulha-a com o
-- dicionário fixo, para poder ser usada numa coluna gerada e num índice.
create or replace function public.f_unaccent(texto text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, texto)
$$;

-- nome + email, em minúsculas e sem acentos: "Clínica Sol" -> "clinica sol clinicasol@..."
alter table public.clientes
  add column if not exists pesquisa text
  generated always as (public.f_unaccent(lower(nome || ' ' || coalesce(email, '')))) stored;

-- índice "trigram": a pesquisa "contém" (like '%...%') fica rápida mesmo com muitos clientes
create extension if not exists pg_trgm with schema extensions;
create index if not exists clientes_pesquisa_trgm_idx
  on public.clientes using gin (pesquisa extensions.gin_trgm_ops);

-- lista por estado, mais recentes primeiro (separadores e colunas do pipeline)
create index if not exists clientes_empresa_estado_criado_idx
  on public.clientes (empresa_id, estado, criado_em desc);

-- ---------- totais por estado ----------
-- Quantos clientes e quanto valor há em cada estado, sem trazer os clientes todos.
-- Opcionalmente só os que encaixam numa pesquisa. Corre com as permissões de quem
-- pede (security invoker): o RLS decide que clientes entram nas contas.
create or replace function public.resumo_clientes(termo text default '')
returns table (estado text, n bigint, soma numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.estado, count(*), coalesce(sum(c.valor_previsto), 0)
  from public.clientes c
  where coalesce(termo, '') = ''
     or c.pesquisa like '%' || public.f_unaccent(lower(termo)) || '%'
  group by c.estado
$$;

revoke execute on function public.resumo_clientes(text) from public, anon;
grant execute on function public.resumo_clientes(text) to authenticated;
