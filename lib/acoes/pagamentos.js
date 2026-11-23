"use server";
// Ações da página Plano (só administradores):
//  - escolherPlano: sem assinatura -> abre o pagamento da Stripe; com assinatura -> AGENDA a
//    mudança para o fim do período já pago (até lá fica o plano atual)
//  - anularMudanca: desfaz a mudança agendada
//  - alterarCartao, cancelarAssinatura, retomarAssinatura: aba Cobrança (/painel/plano/cobranca)
// O resultado volta sempre à página com uma mensagem no endereço (?pago=1, ?erro=...).

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { PLANOS } from "@/lib/planos";
import {
  agendarMudanca,
  anularMudancaAgendada,
  aplicarAssinatura,
  cancelarNoFim,
  obterPreco,
  obterStripe,
  retomarAssinatura as retomarNaStripe,
  stripeConfigurada,
} from "@/lib/pagamentos";

// endereço do site (localhost no PC, o domínio da Vercel em produção), para a Stripe voltar
async function origemDoSite() {
  const h = await headers();
  const origem = h.get("origin");
  if (origem) return origem;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protocolo = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${protocolo}://${host}`;
}

const DOIS_DIAS = 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000; // + 1 hora de margem

async function exigirAdmin() {
  const sessao = await obterSessao();
  if (!sessao.eAdmin) redirect("/painel/plano?erro=so-admin");
  if (!stripeConfigurada()) redirect("/painel/plano?erro=sem-stripe");
  return sessao;
}

export async function escolherPlano(formData) {
  const { supabase, perfil, plano: atual } = await exigirAdmin();
  const plano = String(formData.get("plano") ?? "");
  const ciclo = String(formData.get("ciclo") ?? "");
  if (!PLANOS[plano] || !["mensal", "anual"].includes(ciclo)) redirect("/painel/plano?erro=invalido");

  // não dá para passar ao Essencial com mais pessoas do que o limite
  const { count: pessoas } = await supabase.from("perfis").select("id", { count: "exact", head: true });
  if ((pessoas ?? 0) > PLANOS[plano].pessoas) redirect(`/painel/plano?erro=pessoas&plano=${plano}`);

  const { data: empresa } = await supabase
    .from("empresas")
    .select("id, stripe_cliente, stripe_assinatura")
    .eq("id", perfil.empresa_id)
    .single();

  const stripe = obterStripe();
  const preco = await obterPreco(plano, ciclo);

  // ---------- já paga: a mudança fica agendada para o fim do período ----------
  // (não se muda a meio: a empresa continua com o plano que pagou até ao próximo pagamento)
  if (atual.pago && empresa.stripe_assinatura) {
    if (atual.chave === plano && atual.ciclo === ciclo) {
      // escolheu o plano que já tem: desfaz a mudança agendada e um cancelamento pedido antes
      await anularMudancaAgendada(empresa.stripe_assinatura);
      if (atual.cancelaNoFim) await aplicarAssinatura(await retomarNaStripe(empresa.stripe_assinatura));
      redirect("/painel/plano?mantido=1");
    }
    await agendarMudanca(empresa.stripe_assinatura, preco, empresa.id);
    await aplicarAssinatura(await stripe.subscriptions.retrieve(empresa.stripe_assinatura));
    redirect("/painel/plano?agendado=1");
  }

  // ---------- ainda não paga: vai para a página de pagamento da Stripe ----------
  const origem = await origemDoSite();
  const pagamento = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: preco, quantity: 1 }],
    // as contas novas da Stripe vêm com os "Managed Payments" ligados (a Stripe passa a ser
    // o vendedor e trata do IVA), que pedem um código de imposto em cada produto.
    // O FlowCRM usa os pagamentos normais: a empresa (nós) é quem vende.
    managed_payments: { enabled: false },
    ...(empresa.stripe_cliente ? { customer: empresa.stripe_cliente } : { customer_email: perfil.email }),
    client_reference_id: empresa.id,
    metadata: { empresa_id: empresa.id },
    subscription_data: {
      metadata: { empresa_id: empresa.id },
      // ainda a experimentar: os dias grátis que faltam não se perdem, só paga quando acabarem
      // (a Stripe só aceita um fim de teste daqui a mais de 2 dias)
      ...(atual.emTeste && new Date(atual.fimTeste) - Date.now() > DOIS_DIAS
        ? { trial_end: Math.floor(new Date(atual.fimTeste).getTime() / 1000) }
        : {}),
    },
    locale: "pt",
    success_url: `${origem}/painel/plano?sessao={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origem}/painel/plano?cancelado=1`,
  });
  redirect(pagamento.url);
}

// a assinatura da empresa (só para quem já paga)
async function empresaComAssinatura(destino) {
  const { supabase, perfil } = await exigirAdmin();
  const { data: empresa } = await supabase
    .from("empresas")
    .select("id, stripe_assinatura")
    .eq("id", perfil.empresa_id)
    .single();
  if (!empresa?.stripe_assinatura) redirect(`${destino}?erro=sem-assinatura`);
  return empresa;
}

// Desfaz a mudança de plano agendada: fica o plano atual.
export async function anularMudanca() {
  const empresa = await empresaComAssinatura("/painel/plano");
  await anularMudancaAgendada(empresa.stripe_assinatura);
  redirect("/painel/plano?mantido=1");
}

// Cancelar: o plano NÃO é tirado logo. Fica até ao fim do período já pago e só nesse dia acaba
// (a Stripe avisa o webhook e a empresa fica bloqueada até escolher um plano outra vez).
export async function cancelarAssinatura() {
  const empresa = await empresaComAssinatura("/painel/plano/cobranca");
  await aplicarAssinatura(await cancelarNoFim(empresa.stripe_assinatura));
  redirect("/painel/plano/cobranca?cancelou=1");
}

// Voltar atrás no cancelamento (antes de o período acabar): a assinatura volta a renovar.
export async function retomarAssinatura() {
  const empresa = await empresaComAssinatura("/painel/plano/cobranca");
  await aplicarAssinatura(await retomarNaStripe(empresa.stripe_assinatura));
  redirect("/painel/plano/cobranca?retomou=1");
}

// Mudar o cartão: abre a página segura da Stripe só com o passo do cartão
// (o FlowCRM nunca vê os números do cartão). No fim volta à aba Cobrança.
export async function alterarCartao() {
  const { supabase, perfil } = await exigirAdmin();
  const { data: empresa } = await supabase
    .from("empresas")
    .select("stripe_cliente")
    .eq("id", perfil.empresa_id)
    .single();
  if (!empresa?.stripe_cliente) redirect("/painel/plano/cobranca?erro=sem-cliente");

  const stripe = obterStripe();
  // o portal precisa de uma configuração; em modo de teste criamo-la na primeira vez
  const { data: configuracoes } = await stripe.billingPortal.configurations.list({ active: true, limit: 1 });
  const configuracao =
    configuracoes[0] ??
    (await stripe.billingPortal.configurations.create({
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        customer_update: { enabled: true, allowed_updates: ["email", "address", "tax_id", "name"] },
      },
    }));

  const origem = await origemDoSite();
  const voltar = `${origem}/painel/plano/cobranca?cartao=1`;
  const portal = await stripe.billingPortal.sessions.create({
    customer: empresa.stripe_cliente,
    configuration: configuracao.id,
    locale: "pt",
    return_url: voltar,
    // abre logo no passo de mudar o cartão e, no fim, volta sozinho ao FlowCRM
    flow_data: {
      type: "payment_method_update",
      after_completion: { type: "redirect", redirect: { return_url: voltar } },
    },
  });
  redirect(portal.url);
}
