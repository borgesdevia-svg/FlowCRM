// Webhook da Stripe: a Stripe chama este endereço sempre que uma assinatura muda
// (pagamento feito, renovação, mudança de plano, cancelamento, cartão recusado de vez).
// Configurar no painel da Stripe: Developers -> Webhooks -> endereço
//   https://<o-teu-site>/api/stripe/webhook
// com os eventos checkout.session.completed e customer.subscription.* .
// O segredo do webhook (whsec_...) vai para STRIPE_WEBHOOK_SECRET.
//
// A assinatura do pedido é verificada: só a Stripe consegue chamar isto com sucesso.

import { aplicarAssinatura, obterStripe } from "@/lib/pagamentos";

export async function POST(request) {
  const segredo = process.env.STRIPE_WEBHOOK_SECRET;
  if (!segredo) return new Response("Webhook não configurado", { status: 500 });

  const corpo = await request.text(); // a verificação precisa do texto exato, sem converter
  const stripe = obterStripe();

  let evento;
  try {
    evento = stripe.webhooks.constructEvent(corpo, request.headers.get("stripe-signature"), segredo);
  } catch {
    return new Response("Assinatura inválida", { status: 400 });
  }

  try {
    switch (evento.type) {
      case "checkout.session.completed": {
        const id = evento.data.object.subscription;
        if (id) await aplicarAssinatura(await stripe.subscriptions.retrieve(id));
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await aplicarAssinatura(evento.data.object);
        break;
      default:
        break; // os outros eventos não interessam
    }
  } catch (erro) {
    // 500 = a Stripe volta a tentar mais tarde
    console.error("Webhook da Stripe falhou:", erro);
    return new Response("Erro ao processar", { status: 500 });
  }

  return Response.json({ recebido: true });
}
