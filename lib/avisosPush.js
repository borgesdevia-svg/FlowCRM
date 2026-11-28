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

// Envia um aviso aos administradores da empresa e ao responsável do lead (se houver).
// "mensagem(paraMim)" devolve { titulo, texto, url }; paraMim = true para o responsável.
// "origem" = endereço do site (identifica quem envia, como pedem os serviços de avisos).
// Nunca lança erro: um aviso que falha não pode estragar o que o cliente estava a fazer.
export async function enviarAvisos({ empresaId, responsavelId, origem, mensagem, soResponsavel = false }) {
  if (!avisosConfigurados()) return;
  try {
    // quem envia tem de se identificar com um endereço https:// ou um email.
    // No PC (http://localhost) usa-se o email de contacto, senão o envio é recusado.
    const remetente = origem.startsWith("https://") && !origem.includes("localhost") ? origem : "mailto:contacto@flowcrm.pt";
    setVapidDetails(remetente, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const admin = criarClienteAdmin();

    // quem recebe: os admins e o responsável (ou só o responsável, ex.: lead aceite na Entrada)
    const { data: pessoas } = await admin.from("perfis").select("id, papel").eq("empresa_id", empresaId);
    const destinatarios = (pessoas ?? [])
      .filter((p) => p.id === responsavelId || (!soResponsavel && p.papel === "admin"))
      .map((p) => p.id);
    if (!destinatarios.length) return;

    const { data: subscricoes } = await admin
      .from("subscricoes_push")
      .select("id, perfil_id, endpoint, p256dh, auth")
      .in("perfil_id", destinatarios);

    for (const s of subscricoes ?? []) {
      // a tabela também aceita linhas criadas pela API: só se envia para serviços de avisos conhecidos
      if (!subscricaoValida({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } })) continue;
      const corpo = JSON.stringify(mensagem(s.perfil_id === responsavelId));
      try {
        await sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, corpo, {
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
    console.error("enviarAvisos:", erro.message);
  }
}

// Lead novo pelo formulário público: procura o lead acabado de criar e avisa.
export async function avisarLeadNovo({ slug, email, origem, canal = null }) {
  if (!avisosConfigurados()) return;
  try {
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

    await enviarAvisos({
      empresaId: empresa.id,
      responsavelId: lead.responsavel_id,
      origem,
      mensagem: (paraMim) => ({
        titulo: `Lead novo: ${lead.nome}`,
        texto: `Chegou pelo ${canal ? nomeCanal(canal) : "formulário"}${
          paraMim ? " e ficou para ti" : lead.responsavel_id ? "" : ". Está na Entrada à espera de ser aceite"
        }.`,
        // sem responsável, o lead está na Entrada (o admin aceita-o lá e escolhe quem fica com ele)
        url: lead.responsavel_id ? `/painel/clientes/${lead.id}` : "/painel/entrada",
      }),
    });
  } catch (erro) {
    console.error("avisarLeadNovo:", erro.message);
  }
}
