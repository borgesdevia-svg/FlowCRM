-- =====================================================================
-- FlowCRM · 31 · Sem teste grátis
-- Decisão do aluno (2026-11-24): deixa de haver os 14 dias grátis do Pro.
-- Com o teste, bastava usar 14 dias, exportar os leads e criar outra conta.
-- Agora uma empresa nova nasce sem plano (bloqueada, como em lib/planos.js):
-- só abre a página Plano até escolher um plano e pagar com a Stripe.
--
-- As empresas que já estão a meio do teste ficam como estão (o teste acaba na data
-- que já tinham). Se pagarem antes, a Stripe cobra logo (já não guarda os dias que faltam).
-- =====================================================================

alter table public.empresas
  alter column teste_ate set default now();
