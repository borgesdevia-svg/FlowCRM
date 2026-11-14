-- 12: números da página Equipa contados na base de dados
-- (a página deixava de estar certa com mais de 1000 clientes, porque lia-os todos
--  e o Supabase devolve no máximo 1000 linhas por pedido)
-- As duas funções são "security invoker": correm com as permissões de quem as chama,
-- por isso o RLS continua a aplicar-se (só contam dados da empresa de quem pede).

-- clientes por responsável e por estado, com a soma do valor previsto
create or replace function public.resumo_equipa()
returns table (responsavel_id uuid, estado text, n bigint, soma numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.responsavel_id, c.estado, count(*), coalesce(sum(c.valor_previsto), 0)
  from public.clientes c
  group by c.responsavel_id, c.estado
$$;

-- tarefas por fazer de cada responsável
create or replace function public.tarefas_por_pessoa()
returns table (responsavel_id uuid, n bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select t.responsavel_id, count(*)
  from public.tarefas t
  where not t.concluida
  group by t.responsavel_id
$$;

revoke execute on function public.resumo_equipa() from public, anon;
revoke execute on function public.tarefas_por_pessoa() from public, anon;
grant execute on function public.resumo_equipa() to authenticated;
grant execute on function public.tarefas_por_pessoa() to authenticated;
