-- =====================================================================
-- FlowCRM · 40 · Segurança dos e-mails e documentos
-- Aplicada no Supabase a 2026-11-27 (versão 20261127160330).
-- Ficheiro recriado a partir do SQL guardado em supabase_migrations.schema_migrations,
-- porque a migração foi aplicada sem ficar no repositório.
--   · emails: o browser deixa de poder inserir/alterar/apagar (só o servidor regista).
--   · message_id passa a ser único por cliente (em vez de por empresa).
--   · apagar documentos: só documentos de clientes que a pessoa consegue ver.
-- =====================================================================

drop policy if exists "registar emails enviados" on public.emails;
revoke insert, update, delete on public.emails from anon, authenticated;
alter table public.emails drop constraint if exists emails_empresa_id_message_id_key;
alter table public.emails add constraint emails_cliente_id_message_id_key unique (cliente_id, message_id);
drop policy if exists "apagar documentos" on public.documentos;
create policy "apagar documentos"
  on public.documentos for delete to authenticated
  using (
    empresa_id = (select privado.minha_empresa())
    and (autor_id = (select auth.uid()) or (select privado.sou_admin()))
    and exists (select 1 from public.clientes c where c.id = cliente_id)
  );

-- Verificação (só leitura): lista as restrições únicas de public.emails.
select conname from pg_constraint where conrelid = 'public.emails'::regclass and contype = 'u';
