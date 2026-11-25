-- 31: deixa de haver 14 dias grátis (decisão de 2026-11-25).
-- Uma empresa nova é criada com teste_ate = agora, ou seja, já "sem plano ativo":
-- o painel só abre a página Plano até a empresa escolher um plano e pagar com a Stripe
-- (o webhook põe teste_ate a null quando o pagamento entra: lib/pagamentos.js).
-- As empresas que já estavam a experimentar mantêm os dias que tinham.

alter table public.empresas
  alter column teste_ate set default now();
