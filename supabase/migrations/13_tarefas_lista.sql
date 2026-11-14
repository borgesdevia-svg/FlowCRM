-- 13: lista de tarefas preparada para centenas/milhares de tarefas
--
-- Vista "tarefas_lista": cada tarefa com o nome do cliente, o nome do responsável e
-- uma coluna "pesquisa" (título + nome do cliente, em minúsculas e sem acentos).
-- Assim a página Tarefas pesquisa nos dois ao mesmo tempo e conta/pagina na base de dados.
--
-- security_invoker = true: a vista corre com as permissões de quem a consulta,
-- por isso o RLS das tabelas tarefas, clientes e perfis continua a aplicar-se
-- (sem isto, uma vista mostraria os dados de todas as empresas).
create or replace view public.tarefas_lista
with (security_invoker = true)
as
select
  t.id,
  t.empresa_id,
  t.cliente_id,
  t.responsavel_id,
  t.titulo,
  t.data_limite,
  t.concluida,
  t.concluida_em,
  t.criado_em,
  c.nome as cliente_nome,
  p.nome as responsavel_nome,
  public.f_unaccent(lower(t.titulo || ' ' || c.nome)) as pesquisa
from public.tarefas t
join public.clientes c on c.id = t.cliente_id
left join public.perfis p on p.id = t.responsavel_id;

revoke all on public.tarefas_lista from public, anon;
grant select on public.tarefas_lista to authenticated;

-- índice para as consultas mais comuns: por fazer/feitas, ordenadas pela data limite
create index if not exists tarefas_estado_data_idx
  on public.tarefas (empresa_id, concluida, data_limite);
