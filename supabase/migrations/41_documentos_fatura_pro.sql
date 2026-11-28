-- =====================================================================
-- FlowCRM · 41 · Documentos: a categoria "Fatura" é só do CRM Pro
-- Decisão do aluno (grilling 2026-11-27, PLANO-EMAIL-DOCUMENTOS.md):
--   · Proposta, Contrato e Outro: nos dois planos.
--   · Fatura: só o Pro carrega. Uma empresa que passa a Essencial continua a ver,
--     descarregar e apagar as faturas que já tinha (só a política de INSERIR muda).
-- O site já esconde a opção no Essencial; isto trava também quem chame a API diretamente.
-- =====================================================================

drop policy if exists "criar documentos" on public.documentos;
create policy "criar documentos"
  on public.documentos for insert to authenticated
  with check (
    empresa_id = (select privado.minha_empresa())
    and autor_id = (select auth.uid())
    and exists (select 1 from public.clientes c where c.id = cliente_id)
    and (categoria <> 'fatura' or (select privado.minha_empresa_tem_pro()))
  );
-- Nota: usa privado.minha_empresa_tem_pro() (migração 26) e não privado.tem_pro(), que os
-- utilizadores não podem chamar. A 1.ª versão desta migração usava tem_pro e dava
-- "permission denied for function tem_pro" ao guardar QUALQUER documento.
