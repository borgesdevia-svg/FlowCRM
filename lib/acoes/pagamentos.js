"use server";
// Ações da página Plano (só administradores):
//  - escolherPlano: sem assinatura -> abre o pagamento da Stripe; com assinatura -> muda o plano/ciclo
//  - gerirPagamento: abre o portal da Stripe (cartão, faturas, cancelar)
// O resultado volta sempre à página Plano com uma mensagem no endereço (?pago=1, ?erro=...).

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { PLANOS } from "@/lib/planos";
import { aplicarAssinatura, obterPreco, obterStripe, stripeConfigurada } from "@/lib/pagamentos";

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

  // ---------- já paga: muda o plano da assinatura que existe ----------
  if (atual.pago && empresa.stripe_assinatura) {
    if (atual.chave === plano && atual.ciclo === ciclo && !atual.cancelaNoFim) redirect("/painel/plano");
    const assinatura = await stripe.subscriptions.retrieve(empresa.stripe_assinatura);
    const atualizada = await stripe.subscriptions.update(assinatura.id, {
      items: [{ id: assinatura.items.data[0].id, price: preco }],
      // cobra (ou devolve em crédito) logo a diferença dos dias que faltam
      proration_behavior: "always_invoice",
      cancel_at_period_end: false, // escolher um plano anula um cancelamento pedido antes
      metadata: { empresa_id: empresa.id },
    });
    await aplicarAssinatura(atualizada);
    redirect("/painel/plano?mudou=1");
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

// Portal da Stripe: o cliente muda o cartão, vê as faturas e cancela.
export async function gerirPagamento() {
  const { supabase, perfil } = await exigirAdmin();
  const { data: empresa } = await supabase
    .from("empresas")
    .select("stripe_cliente")
    .eq("id", perfil.empresa_id)
    .single();
  if (!empresa?.stripe_cliente) redirect("/painel/plano?erro=sem-cliente");

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
        // cancelar fica até ao fim do período já pago (depois a empresa fica bloqueada)
        subscription_cancel: { enabled: true, mode: "at_period_end" },
      },
    }));

  const origem = await origemDoSite();
  const portal = await stripe.billingPortal.sessions.create({
    customer: empresa.stripe_cliente,
    configuration: configuracao.id,
    locale: "pt",
    return_url: `${origem}/painel/plano?voltou=1`,
  });
  redirect(portal.url);
}
