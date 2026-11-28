-- =====================================================================
-- FlowCRM · 44 · Entrada: os leads sem responsável ficam à espera
-- Decisão do aluno (2026-11-28): os leads novos (formulário, marcações online ou criados
-- sem responsável) ficam na aba "Entrada" até o admin os aceitar (escolher quem fica com
-- eles) ou rejeitar. Enquanto estão lá NÃO contam em Leads, Pipeline nem Visão geral.
-- Com a distribuição automática do Pro ligada, já chegam com responsável e saltam a Entrada.
-- Aqui: os totais por fase (resumo_clientes) passam a ignorar os leads sem responsável.
-- =====================================================================

create or replace function public.resumo_clientes(termo text default '')
returns table (estado text, n bigint, soma numeric)
language sql
stable
set search_path = ''
as $$
  select c.estado, count(*), coalesce(sum(c.valor_previsto), 0)
  from public.clientes c
  where c.responsavel_id is not null
    and (coalesce(termo, '') = '' or c.pesquisa like '%' || public.f_unaccent(lower(termo)) || '%')
  group by c.estado
$$;
