// Pagamentos com a Stripe (Fase 2). Só corre no SERVIDOR: usa a chave secreta da Stripe
// (STRIPE_SECRET_KEY, no .env.local e na Vercel) e o cliente Supabase com a chave secreta.
//
// Como funciona:
//  1. O administrador escolhe um plano na página Plano -> criamos uma "Checkout Session"
//     e mandamos para a página de pagamento da Stripe (o cartão nunca passa pelo FlowCRM).
//  2. Quando o pagamento fica feito, a Stripe avisa-nos (webhook: app/api/stripe/webhook)
//     e, ao voltar, a página Plano também confirma (para funcionar mesmo sem webhook no PC).
//  3. aplicarAssinatura() copia o estado da assinatura para a tabela empresas:
//     plano, ciclo, próximo pagamento e teste_ate (vazio = pago; no passado = bloqueada).
//
// Em modo de teste (chave sk_test_...) não há dinheiro real: usa-se o cartão 4242 4242 4242 4242.

import Stripe from "stripe";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { PLANOS, precoPlano } from "@/lib/planos";

let stripe = null;
export function obterStripe() {
  const chave = process.env.STRIPE_SECRET_KEY;
  if (!chave) throw new Error("Falta a STRIPE_SECRET_KEY no ficheiro .env.local");
  if (!stripe) stripe = new Stripe(chave);
  return stripe;
}

export function stripeConfigurada() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export const CICLOS = { mensal: "month", anual: "year" };

// nome do preço na Stripe (lookup_key): "pro_mensal", "essencial_anual"...
const chavePreco = (plano, ciclo) => `flowcrm_${plano}_${ciclo}`;

// Devolve o id do preço na Stripe. Na primeira vez cria o produto e o preço sozinho,
// a partir de lib/planos.js (não é preciso criar nada à mão no painel da Stripe).
// Se mudares um preço em lib/planos.js, o preço antigo deixa de servir e é criado um novo.
export async function obterPreco(plano, ciclo) {
  const s = obterStripe();
  const euros = precoPlano(plano, ciclo);
  if (!euros || !CICLOS[ciclo]) throw new Error("Plano ou ciclo inválido");
  const chave = chavePreco(plano, ciclo);
  const centimos = euros * 100;

  const { data } = await s.prices.list({ lookup_keys: [chave], active: true, limit: 1 });
  if (data[0] && data[0].unit_amount === centimos) return data[0].id;

  // produto do plano (um por plano, reaproveitado entre mensal e anual)
  // (list em vez de search: a pesquisa da Stripe demora a ver produtos acabados de criar)
  const produtos = await s.products.list({ active: true, limit: 100 });
  const produto =
    produtos.data.find((p) => p.metadata?.flowcrm_plano === plano) ??
    (await s.products.create({ name: PLANOS[plano].nome, metadata: { flowcrm_plano: plano } }));

  const preco = await s.prices.create({
    product: produto.id,
    currency: "eur",
    unit_amount: centimos,
    recurring: { interval: CICLOS[ciclo] },
    lookup_key: chave,
    transfer_lookup_key: true, // tira a chave ao preço antigo, se o valor mudou
    metadata: { flowcrm_plano: plano, flowcrm_ciclo: ciclo },
  });
  return preco.id;
}

// Estados da assinatura na Stripe que dão acesso ao CRM.
// "past_due" (o cartão falhou e a Stripe está a tentar outra vez) ainda dá acesso;
// quando a Stripe desiste, a assinatura passa a "canceled" ou "unpaid" e a empresa fica bloqueada.
const COM_ACESSO = ["active", "trialing", "past_due"];
const SEM_ACESSO = ["canceled", "unpaid", "incomplete_expired"];

// Copia o estado de uma assinatura da Stripe para a empresa. Usada pelo webhook e pela
// página Plano ao voltar do pagamento. Devolve true se mudou alguma coisa.
export async function aplicarAssinatura(assinatura) {
  const empresaId = assinatura.metadata?.empresa_id;
  if (!empresaId) return false; // não é uma assinatura do FlowCRM

  const admin = criarClienteAdmin();
  const { data: empresa } = await admin
    .from("empresas")
    .select("id, stripe_assinatura")
    .eq("id", empresaId)
    .maybeSingle();
  if (!empresa) return false;

  // um aviso atrasado sobre uma assinatura antiga não mexe na empresa
  if (empresa.stripe_assinatura && empresa.stripe_assinatura !== assinatura.id) {
    if (!COM_ACESSO.includes(assinatura.status)) return false;
  }

  const item = assinatura.items?.data?.[0];
  const plano = item?.price?.metadata?.flowcrm_plano;
  const ciclo = item?.price?.metadata?.flowcrm_ciclo;
  // na API atual da Stripe, o fim do período pago está em cada item da assinatura
  const fimPeriodo = item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null;
  const cliente = typeof assinatura.customer === "string" ? assinatura.customer : assinatura.customer?.id;

  let alteracoes;
  if (COM_ACESSO.includes(assinatura.status) && PLANOS[plano]) {
    alteracoes = {
      plano,
      ciclo: ciclo ?? null,
      teste_ate: null, // pago: deixa de estar a experimentar e deixa de estar bloqueada
      stripe_assinatura: assinatura.id,
      stripe_cliente: cliente ?? null,
      proximo_pagamento: fimPeriodo,
      cancela_no_fim: Boolean(assinatura.cancel_at_period_end || assinatura.cancel_at),
    };
  } else if (SEM_ACESSO.includes(assinatura.status)) {
    // acabou: o CRM fica bloqueado até a empresa escolher um plano outra vez
    alteracoes = {
      teste_ate: new Date().toISOString(),
      stripe_assinatura: null,
      proximo_pagamento: null,
      cancela_no_fim: false,
    };
  } else {
    return false; // "incomplete": o primeiro pagamento ainda não acabou
  }

  const { error } = await admin.from("empresas").update(alteracoes).eq("id", empresaId);
  if (error) throw new Error(`Não foi possível guardar a assinatura: ${error.message}`);
  return true;
}

// Ao voltar da página de pagamento (?sessao=cs_...): confirma na Stripe que o pagamento
// é mesmo desta empresa e aplica a assinatura logo, sem esperar pelo webhook.
// Devolve true se a empresa ficou com o plano pago.
export async function confirmarPagamento(sessaoId, empresaId) {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessaoId ?? "")) return false;
  const pagamento = await obterStripe().checkout.sessions.retrieve(sessaoId, { expand: ["subscription"] });
  if (pagamento.metadata?.empresa_id !== empresaId) return false;
  if (pagamento.status !== "complete" || typeof pagamento.subscription !== "object" || !pagamento.subscription) return false;
  return aplicarAssinatura(pagamento.subscription);
}

// Ao voltar do portal (?voltou=1): lê a assinatura na Stripe e atualiza a empresa
// (ex.: cancelou ou mudou o cartão). No servidor da Vercel o webhook também o faz.
export async function sincronizarAssinatura(assinaturaId) {
  if (!assinaturaId) return false;
  const assinatura = await obterStripe().subscriptions.retrieve(assinaturaId);
  return aplicarAssinatura(assinatura);
}
