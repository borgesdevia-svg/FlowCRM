-- =====================================================================
-- FlowCRM · 29 · Pagamentos (Stripe) e bloqueio quando acaba o teste
-- Decisões do aluno (2026-11-22):
--   - ao registar, 14 dias do CRM Pro grátis (como antes);
--   - quando os 14 dias acabam sem pagar, o CRM fica BLOQUEADO: só dá para
--     escolher um plano e pagar, exportar os leads em CSV e mudar a própria conta;
--   - o formulário público continua a receber leads (entram por uma função
--     security definer, que não passa por estas regras);
--   - a empresa escolhe o Essencial ou o Pro, por mês ou por ano.
--
-- Como fica cada empresa (lib/planos.js -> estadoPlano):
--   teste_ate no futuro            -> a experimentar o Pro
--   teste_ate no passado           -> bloqueada (teste acabou, ou a assinatura foi cancelada)
--   teste_ate vazio                -> plano pago (o da coluna "plano")
-- O pagamento muda estas colunas só no servidor (webhook da Stripe, com a chave secreta):
-- o administrador não as pode mudar (não estão no "grant update").
-- =====================================================================

alter table public.empresas
  add column stripe_cliente text unique,                 -- cus_... (cliente na Stripe)
  add column stripe_assinatura text unique,              -- sub_... (assinatura na Stripe)
  add column ciclo text check (ciclo in ('mensal', 'anual')),
  add column proximo_pagamento timestamptz,              -- fim do período já pago
  add column cancela_no_fim boolean not null default false;

-- ---------- a empresa pode usar o CRM? (não está bloqueada) ----------
create function privado.empresa_ativa(p_empresa uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(
    (select teste_ate is null or teste_ate > now() from public.empresas where id = p_empresa),
    false);
$$;

revoke all on function privado.empresa_ativa(uuid) from public, anon, authenticated;

-- versão para as regras (RLS) de quem tem sessão iniciada: só sobre a própria empresa
create function privado.minha_empresa_ativa()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select privado.empresa_ativa(
    (select empresa_id from public.perfis where id = (select auth.uid())));
$$;

revoke all on function privado.minha_empresa_ativa() from public, anon;
grant execute on function privado.minha_empresa_ativa() to authenticated;

-- ---------- bloqueio: regras "restritivas" ----------
-- Uma regra restritiva junta-se às que já existem com "E": além de tudo o resto,
-- a empresa tem de estar ativa. Ler continua a dar (para exportar os leads).
do $$
declare
  t text;
  op text;
begin
  foreach t in array array['clientes', 'tarefas', 'interacoes', 'propostas', 'automacoes', 'automacoes_distribuicao', 'empresas']
  loop
    foreach op in array array['insert', 'update', 'delete']
    loop
      execute format(
        'create policy %I on public.%I as restrictive for %s to authenticated %s',
        'empresa ativa (' || op || ')',
        t,
        op,
        case op
          when 'insert' then 'with check ((select privado.minha_empresa_ativa()))'
          when 'update' then 'using ((select privado.minha_empresa_ativa())) with check ((select privado.minha_empresa_ativa()))'
          else 'using ((select privado.minha_empresa_ativa()))'
        end
      );
    end loop;
  end loop;
end $$;
