"use server";
// Ações da página Plano (só administradores):
//  - escolherPlano: sem assinatura -> abre o pagamento da Stripe; com assinatura -> AGENDA a
//    mudança para o fim do período já pago (até lá fica o plano atual)
//  - anularMudanca: desfaz a mudança agendada
//  - alterarCartao, removerCartao, cancelarAssinatura, retomarAssinatura, editarFaturacao:
//    página Cobrança (/painel/cobranca, item próprio no menu)
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
  portalCartao,
  portalFaturacao,
  removerCartoes,
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
    // paga logo: não há teste grátis na Stripe (decisão de 2026-11-24, migração 31)
    subscription_data: { metadata: { empresa_id: empresa.id } },
    locale: "pt",
    success_url: `${origem}/painel/plano?sessao={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origem}/painel/plano?cancelado=1`,
  });
  redirect(pagamento.url);
}

// os dados da empresa na Stripe (cliente e assinatura)
async function dadosStripe(destino, { precisaAssinatura = false } = {}) {
  const { supabase, perfil } = await exigirAdmin();
  const { data: empresa } = await supabase
    .from("empresas")
    .select("id, stripe_cliente, stripe_assinatura")
    .eq("id", perfil.empresa_id)
    .single();
  if (!empresa?.stripe_cliente) redirect(`${destino}?erro=sem-cliente`);
  if (precisaAssinatura && !empresa.stripe_assinatura) redirect(`${destino}?erro=sem-assinatura`);
  return empresa;
}

// Desfaz a mudança de plano agendada: fica o plano atual.
export async function anularMudanca() {
  const empresa = await dadosStripe("/painel/plano", { precisaAssinatura: true });
  await anularMudancaAgendada(empresa.stripe_assinatura);
  redirect("/painel/plano?mantido=1");
}

// Cancelar: o plano NÃO é tirado logo. Fica até ao fim do período já pago e só nesse dia acaba
// (a Stripe avisa o webhook e a empresa fica bloqueada até escolher um plano outra vez).
// O cartão fica guardado (para retomar ou escolher um plano mais tarde).
export async function cancelarAssinatura() {
  const empresa = await dadosStripe("/painel/cobranca", { precisaAssinatura: true });
  await aplicarAssinatura(await cancelarNoFim(empresa.stripe_assinatura));
  redirect("/painel/cobranca?cancelou=1");
}

// Voltar atrás no cancelamento (antes de o período acabar): a assinatura volta a renovar.
export async function retomarAssinatura() {
  const empresa = await dadosStripe("/painel/cobranca", { precisaAssinatura: true });
  await aplicarAssinatura(await retomarNaStripe(empresa.stripe_assinatura));
  redirect("/painel/cobranca?retomou=1");
}

// Remover o cartão: apaga os cartões guardados na Stripe e cancela a renovação
// (sem cartão não dá para cobrar). O plano fica até ao fim do período já pago.
export async function removerCartao() {
  const empresa = await dadosStripe("/painel/cobranca");
  const assinatura = await removerCartoes(empresa.stripe_cliente, empresa.stripe_assinatura);
  if (assinatura) await aplicarAssinatura(assinatura);
  redirect("/painel/cobranca?removido=1");
}

// Mudar (ou adicionar) o cartão: abre a página segura da Stripe só com o passo do cartão
// (o FlowCRM nunca vê os números do cartão). No fim volta à página Cobrança.
export async function alterarCartao() {
  const empresa = await dadosStripe("/painel/cobranca");
  const portal = await portalCartao(empresa.stripe_cliente, `${await origemDoSite()}/painel/cobranca?cartao=1`);
  redirect(portal.url);
}

// Nome, email e NIF que aparecem nas faturas: muda-se na página da Stripe.
export async function editarFaturacao() {
  const empresa = await dadosStripe("/painel/cobranca");
  const portal = await portalFaturacao(empresa.stripe_cliente, `${await origemDoSite()}/painel/cobranca?voltou=1`);
  redirect(portal.url);
}
