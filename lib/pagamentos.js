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

// ---------- mudanças de plano no fim do período ----------
// Quem já paga não muda de plano a meio do período: a mudança fica AGENDADA na Stripe
// (uma "subscription schedule" com duas fases) e só acontece no dia do próximo pagamento.
// Até lá a empresa continua com o plano que já pagou. Quando a fase nova começa, a Stripe
// muda a assinatura e avisa o webhook (customer.subscription.updated) -> aplicarAssinatura.

const idDe = (x) => (typeof x === "string" ? x : x?.id ?? null);

// Agenda a passagem para outro preço quando o período atual acabar.
// Se já havia uma mudança agendada, é substituída por esta.
export async function agendarMudanca(assinaturaId, precoNovo, empresaId) {
  const s = obterStripe();
  let assinatura = await s.subscriptions.retrieve(assinaturaId);
  if (assinatura.schedule) {
    await s.subscriptionSchedules.release(idDe(assinatura.schedule));
    assinatura = await s.subscriptions.retrieve(assinaturaId);
  }
  // um cancelamento pedido antes fica anulado: a empresa escolheu continuar
  if (assinatura.cancel_at_period_end || assinatura.cancel_at) {
    assinatura = await s.subscriptions.update(assinaturaId, { cancel_at_period_end: false });
  }

  const item = assinatura.items.data[0];
  const novo = await s.prices.retrieve(precoNovo);
  const agenda = await s.subscriptionSchedules.create({ from_subscription: assinaturaId });
  const faseAtual = agenda.phases[0];
  const metadata = { empresa_id: empresaId };

  await s.subscriptionSchedules.update(agenda.id, {
    end_behavior: "release", // depois da mudança, a assinatura continua a renovar sozinha
    phases: [
      {
        // o que já está pago, até ao fim do período
        items: [{ price: item.price.id, quantity: item.quantity ?? 1 }],
        start_date: faseAtual.start_date,
        end_date: item.current_period_end,
        ...(faseAtual.trial_end ? { trial_end: faseAtual.trial_end } : {}),
        proration_behavior: "none",
        metadata,
      },
      {
        // o plano novo, a partir do próximo pagamento
        items: [{ price: precoNovo, quantity: 1 }],
        duration: { interval: novo.recurring.interval, interval_count: 1 },
        proration_behavior: "none",
        metadata,
      },
    ],
  });
}

// Anula a mudança agendada: a empresa fica com o plano que tem.
export async function anularMudancaAgendada(assinaturaId) {
  const s = obterStripe();
  const assinatura = await s.subscriptions.retrieve(assinaturaId);
  if (assinatura.schedule) await s.subscriptionSchedules.release(idDe(assinatura.schedule));
}

// A mudança agendada (ou null): { plano, ciclo, em } — "em" é a data (ISO) em que acontece.
export async function lerMudancaAgendada(assinaturaId) {
  if (!assinaturaId) return null;
  const s = obterStripe();
  const assinatura = await s.subscriptions.retrieve(assinaturaId);
  if (!assinatura.schedule) return null;
  const agenda = await s.subscriptionSchedules.retrieve(idDe(assinatura.schedule), {
    expand: ["phases.items.price"],
  });
  if (!["active", "not_started"].includes(agenda.status)) return null;
  const agora = Date.now() / 1000;
  const proxima = agenda.phases.find((f) => f.start_date > agora);
  const preco = proxima?.items?.[0]?.price;
  const plano = preco?.metadata?.flowcrm_plano;
  if (!PLANOS[plano]) return null;
  return {
    plano,
    ciclo: preco.metadata.flowcrm_ciclo,
    em: new Date(proxima.start_date * 1000).toISOString(),
  };
}

// ---------- cancelar e retomar ----------
// Cancelar NÃO tira o plano: a assinatura fica até ao fim do período já pago e só nesse dia
// acaba (a Stripe avisa o webhook com customer.subscription.deleted -> a empresa fica bloqueada).
export async function cancelarNoFim(assinaturaId) {
  const s = obterStripe();
  const assinatura = await s.subscriptions.retrieve(assinaturaId);
  // com uma mudança agendada a Stripe não deixa cancelar: a mudança deixa de fazer sentido
  if (assinatura.schedule) await s.subscriptionSchedules.release(idDe(assinatura.schedule));
  return s.subscriptions.update(assinaturaId, { cancel_at_period_end: true });
}

export async function retomarAssinatura(assinaturaId) {
  return obterStripe().subscriptions.update(assinaturaId, { cancel_at_period_end: false });
}

// ---------- dados da página Cobrança ----------
// Tudo o que a página Cobrança mostra, lido na Stripe: o estado da assinatura, o cartão
// (só a marca, os 4 últimos números e a validade: o FlowCRM nunca vê o número inteiro),
// os dados de faturação e as últimas faturas.
const resumoCartao = (metodo) =>
  metodo?.card
    ? {
        id: metodo.id,
        marca: metodo.card.brand,
        ultimos: metodo.card.last4,
        mes: metodo.card.exp_month,
        ano: metodo.card.exp_year,
        titular: metodo.billing_details?.name ?? null,
      }
    : null;

export async function lerCobranca(clienteId, assinaturaId) {
  const s = obterStripe();
  const [cliente, assinatura, faturas, cartoes] = await Promise.all([
    s.customers.retrieve(clienteId, { expand: ["invoice_settings.default_payment_method", "tax_ids"] }),
    assinaturaId ? s.subscriptions.retrieve(assinaturaId, { expand: ["default_payment_method"] }) : null,
    s.invoices.list({ customer: clienteId, limit: 12 }),
    s.paymentMethods.list({ customer: clienteId, type: "card", limit: 10 }),
  ]);

  // o cartão que vai ser cobrado: o da assinatura, senão o principal do cliente, senão o último guardado.
  // Um cartão removido continua ligado à assinatura na Stripe, mas já não é do cliente: não conta.
  const doCliente = (m) => (m && typeof m === "object" && idDe(m.customer) === clienteId ? m : null);
  const metodo =
    doCliente(assinatura?.default_payment_method) ||
    doCliente(cliente?.invoice_settings?.default_payment_method) ||
    cartoes.data[0] ||
    null;

  return {
    cartao: resumoCartao(metodo),
    // "active" | "trialing" | "past_due" (o cartão falhou) | "canceled" | ...
    estado: assinatura?.status ?? null,
    faturacao: cliente?.deleted
      ? null
      : {
          nome: cliente?.name ?? null,
          email: cliente?.email ?? null,
          nif: cliente?.tax_ids?.data?.[0]?.value ?? null,
        },
    faturas: faturas.data
      .filter((f) => f.status !== "draft")
      .map((f) => ({
        id: f.id,
        numero: f.number,
        data: new Date(f.created * 1000).toISOString(),
        valor: f.total / 100,
        estado: f.status, // "paid" | "open" | "void" | "uncollectible"
        ver: f.hosted_invoice_url,
        pdf: f.invoice_pdf,
      })),
  };
}

// Remove todos os cartões guardados do cliente na Stripe. Sem cartão não há como cobrar
// a renovação, por isso a assinatura (se houver) fica cancelada no fim do período já pago:
// a empresa continua com o plano até esse dia, como num cancelamento normal.
export async function removerCartoes(clienteId, assinaturaId) {
  const s = obterStripe();
  const assinatura = assinaturaId ? await cancelarNoFim(assinaturaId) : null;
  const { data } = await s.paymentMethods.list({ customer: clienteId, type: "card", limit: 100 });
  for (const metodo of data) await s.paymentMethods.detach(metodo.id);
  return assinatura;
}

// Portal da Stripe para mudar o nome, o email e o NIF das faturas.
export async function portalFaturacao(clienteId, voltar) {
  const s = obterStripe();
  return s.billingPortal.sessions.create({
    customer: clienteId,
    configuration: (await configuracaoPortal()).id,
    locale: "pt",
    return_url: voltar,
  });
}

// Portal da Stripe aberto só no passo de mudar (ou adicionar) o cartão.
export async function portalCartao(clienteId, voltar) {
  const s = obterStripe();
  return s.billingPortal.sessions.create({
    customer: clienteId,
    configuration: (await configuracaoPortal()).id,
    locale: "pt",
    return_url: voltar,
    flow_data: {
      type: "payment_method_update",
      after_completion: { type: "redirect", redirect: { return_url: voltar } },
    },
  });
}

// O portal precisa de uma configuração. Usamos uma só do FlowCRM (metadata flowcrm=cobranca),
// criada na primeira vez: dá para mudar o cartão, os dados de faturação e ver faturas,
// mas NÃO para cancelar nem mudar de plano (isso faz-se no FlowCRM, nas páginas Plano e Cobrança).
async function configuracaoPortal() {
  const s = obterStripe();
  const { data } = await s.billingPortal.configurations.list({ active: true, limit: 100 });
  const nossa = data.find((c) => c.metadata?.flowcrm === "cobranca");
  if (nossa) return nossa;
  return s.billingPortal.configurations.create({
    metadata: { flowcrm: "cobranca" },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ["email", "address", "tax_id", "name"] },
      subscription_cancel: { enabled: false },
      subscription_update: { enabled: false },
    },
  });
}
