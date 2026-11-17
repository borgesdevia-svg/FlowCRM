-- 18 · Revisão de segurança: só se podem mudar as colunas que o site muda mesmo
--
-- Problema encontrado (2026-11-17): o RLS deixava o administrador editar a empresa,
-- mas TODAS as colunas. Um administrador que não é dono podia fazer, pela API,
--   update empresas set dono_id = '<o seu id>'
-- e passar a ser o dono: a partir daí podia tirar o papel de administrador ao dono
-- verdadeiro (a função mudar_papel protege quem está em dono_id). Também podia
-- mudar o slug e partir o link do formulário público.
-- Correção: o RLS diz QUE LINHAS se podem mudar; estas permissões dizem QUE COLUNAS.

-- ---------- empresas: só o nome, o logótipo e as perguntas do formulário ----------
revoke update on public.empresas from authenticated;
grant update (nome, logo_url, perguntas) on public.empresas to authenticated;

-- ---------- clientes: id, empresa, origem e data de criação ficam fixos ----------
-- (a "origem" diz se veio do formulário e a data conta para o alerta de cliente parado)
revoke update on public.clientes from authenticated;
grant update (nome, email, telefone, cidade, estado, valor_previsto, responsavel_id)
  on public.clientes to authenticated;
