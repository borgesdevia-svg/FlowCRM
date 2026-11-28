-- =====================================================================
-- FlowCRM · 42 · Receber e-mails por IMAP (Fase 3 de PLANO-EMAIL-DOCUMENTOS.md)
--   · contas_email ganha o estado da sincronização (até onde já se leu a caixa de entrada).
--   · pg_net + pg_cron: de 5 em 5 minutos o Supabase chama o site
--     (POST /api/emails/receber), que lê as caixas e guarda as respostas dos leads.
-- O segredo do pedido NÃO está neste ficheiro: foi criado à parte no Vault do Supabase
--   select vault.create_secret('<segredo>', 'cron_emails_segredo');
-- e é o mesmo valor da variável EMAIL_CRON_SEGREDO (.env.local e Vercel).
-- =====================================================================

alter table public.contas_email
  add column if not exists imap_uid_validade  bigint,
  add column if not exists imap_ultimo_uid    bigint,
  add column if not exists sincronizada_em    timestamptz,
  add column if not exists erro_sincronizacao text check (erro_sincronizacao is null or char_length(erro_sincronizacao) <= 500);

create extension if not exists pg_net;

-- (re)cria o job: se já existir com o mesmo nome, é substituído
select cron.unschedule(jobid) from cron.job where jobname = 'receber-emails';
select cron.schedule(
  'receber-emails',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://flow-crm-blush-psi.vercel.app/api/emails/receber',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_emails_segredo')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);
