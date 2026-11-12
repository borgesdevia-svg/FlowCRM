-- =====================================================================
-- FlowCRM · 04 · Índices para as ligações "da mesma empresa"
-- As chaves estrangeiras de 2 colunas (ex.: cliente_id + empresa_id)
-- precisam de um índice com as mesmas 2 colunas para serem rápidas.
-- (aviso do "Performance Advisor" do Supabase)
-- Substituem os índices de 1 coluna criados no ficheiro 01.
-- =====================================================================

drop index public.clientes_responsavel_id_idx;
drop index public.interacoes_cliente_id_idx;
drop index public.interacoes_autor_id_idx;
drop index public.tarefas_cliente_id_idx;
drop index public.tarefas_responsavel_id_idx;

create index on public.clientes (responsavel_id, empresa_id);
create index on public.interacoes (cliente_id, empresa_id);
create index on public.interacoes (autor_id, empresa_id);
create index on public.tarefas (cliente_id, empresa_id);
create index on public.tarefas (responsavel_id, empresa_id);
