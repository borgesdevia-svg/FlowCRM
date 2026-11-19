-- =====================================================================
-- FlowCRM · 20 · Aparência do painel (página Configurações)
-- O administrador escolhe, para toda a empresa:
--   - o modelo de design (grafite, preto-branco, executivo, floresta, terracota,
--     bordeaux, nordico), cada um já com a sua cor de destaque;
--   - o modo: claro ou escuro (cada modelo tem as duas versões);
--   - o tipo de gráfico de clientes por semana no Início;
--   - o nome e a ordem dos itens do menu lateral.
-- Guarda-se tudo num só jsonb: { "modelo", "modo", "grafico", "menu": { "principal": [{id,nome}], "empresa": [...] } }
-- O site valida e limpa os valores (lib/aparencia.js) antes de guardar e ao ler.
-- =====================================================================

alter table public.empresas
  add column aparencia jsonb not null default '{}'::jsonb
    check (jsonb_typeof(aparencia) = 'object' and pg_column_size(aparencia) <= 4000);

-- o administrador pode mudar esta coluna (a migração 18 limitou as colunas editáveis;
-- o RLS continua a dizer que só o administrador muda a linha da sua empresa)
grant update (aparencia) on public.empresas to authenticated;
