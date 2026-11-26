// Envio dos avisos no telemóvel/PC (web push, migração 34). Só corre no SERVIDOR.
// Usa o pacote web-push e as chaves VAPID (NEXT_PUBLIC_VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY):
// o browser só aceita avisos assinados com a chave privada que corresponde à pública
// com que a pessoa ligou os avisos.

import { sendNotification, setVapidDetails } from "web-push";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { nomeCanal } from "@/lib/canais";
import { subscricaoValida } from "@/lib/subscricao";

// os avisos só funcionam com as duas chaves; sem elas (ex.: falta pô-las na Vercel) não se envia nada
export function avisosConfigurados() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

// Avisa o responsável do lead e os administradores da empresa de que entrou um lead novo.
// "origem" = endereço do site (identifica quem envia, como pedem os serviços de avisos).
// Nunca lança erro: um aviso que falha não pode estragar o envio do formulário.
export async function avisarLeadNovo({ slug, email, origem, canal = null }) {
  if (!avisosConfigurados()) return;
  try {
    // quem envia tem de se identificar com um endereço https:// ou um email.
    // No PC (http://localhost) usa-se o email de contacto, senão o envio é recusado.
    const remetente = origem.startsWith("https://") && !origem.includes("localhost") ? origem : "mailto:contacto@flowcrm.pt";
    setVapidDetails(remetente, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const admin = criarClienteAdmin();

    // o lead acabado de criar (o mais recente desta empresa com este email)
    const { data: empresa } = await admin.from("empresas").select("id").eq("slug", slug).maybeSingle();
    if (!empresa) return;
    const { data: lead } = await admin
      .from("clientes")
      .select("id, nome, responsavel_id")
      .eq("empresa_id", empresa.id)
      .eq("email", email)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!lead) return;

    // quem recebe: os admins e o responsável (se o lead já foi entregue a alguém)
    const { data: pessoas } = await admin
      .from("perfis")
      .select("id, papel")
      .eq("empresa_id", empresa.id);
    const destinatarios = (pessoas ?? [])
      .filter((p) => p.papel === "admin" || p.id === lead.responsavel_id)
      .map((p) => p.id);
    if (!destinatarios.length) return;

    const { data: subscricoes } = await admin
      .from("subscricoes_push")
      .select("id, perfil_id, endpoint, p256dh, auth")
      .in("perfil_id", destinatarios);

    for (const s of subscricoes ?? []) {
      // a tabela também aceita linhas criadas pela API: só se envia para serviços de avisos conhecidos
      if (!subscricaoValida({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } })) continue;
      const paraMim = s.perfil_id === lead.responsavel_id;
      const mensagem = JSON.stringify({
        titulo: `Lead novo: ${lead.nome}`,
        texto: `Chegou pelo ${canal ? nomeCanal(canal) : "formulário"}${paraMim ? " e ficou para ti" : ""}.`,
        url: `/painel/clientes/${lead.id}`,
      });
      try {
        await sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, mensagem, {
          TTL: 60 * 60 * 24, // se o telemóvel estiver desligado, o aviso espera até 1 dia
        });
      } catch (erro) {
        // 404/410 = a pessoa desligou os avisos nesse browser (ou desinstalou): apaga a subscrição
        if (erro.statusCode === 404 || erro.statusCode === 410) {
          await admin.from("subscricoes_push").delete().eq("id", s.id);
        } else {
          console.error("aviso push:", erro.statusCode ?? erro.message);
        }
      }
    }
  } catch (erro) {
    console.error("avisarLeadNovo:", erro.message);
  }
}
