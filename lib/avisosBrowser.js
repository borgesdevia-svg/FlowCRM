// Ligar os avisos de leads novos NESTE browser (só corre no browser).
// Usado pelo interruptor em A minha conta (components/conta/InterruptorAvisos.js) e por
// components/painel/LigarAvisos.js, que os liga sozinho: por predefinição os avisos estão
// LIGADOS (decisão do aluno, 2026-11-28) até a pessoa os desligar no interruptor.
//
// Dois modos, escolhidos sozinhos conforme o browser:
//  - "ligado": avisos mesmo com o FlowCRM fechado (web push, service worker /sw.js);
//  - "aba": o browser não deixa (Brave com a opção desligada, Vivaldi, …): os avisos aparecem
//    enquanto houver uma aba do FlowCRM aberta (components/painel/VigiaLeads.js).

import { ligarAvisos } from "@/lib/acoes/avisos";

export const CHAVE_AVISOS_ABA = "flowcrm_avisos_aba"; // "1" = modo aba ligado neste browser
export const CHAVE_AVISOS_DESLIGADOS = "flowcrm_avisos_desligados"; // "1" = a pessoa desligou-os aqui

// .trim() e sem aspas: uma chave colada na Vercel com um espaço ou aspas a mais estragava tudo
const CHAVE_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim().replace(/^["']|["']$/g, "");

// a chave pública vem em base64url; o browser quer os bytes
function chaveEmBytes(base64) {
  const preenchimento = "=".repeat((4 - (base64.length % 4)) % 4);
  const normal = (base64 + preenchimento).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(normal), (c) => c.charCodeAt(0));
}

export const temPush = () => Boolean(CHAVE_PUBLICA) && "serviceWorker" in navigator && "PushManager" in window;

// regista o service worker e espera que fique ATIVO: na primeira vez ainda está a instalar,
// e o Chrome recusa criar a subscrição sem um service worker ativo
export async function registo() {
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  return navigator.serviceWorker.ready;
}

// Pede a permissão (se ainda não houver) e liga os avisos.
// Devolve "ligado" | "aba" | "bloqueado" | "desligado" (a pessoa não deu permissão) | { erro }
export async function ativarAvisos() {
  const permissao = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permissao !== "granted") return permissao === "denied" ? "bloqueado" : "desligado";
  localStorage.removeItem(CHAVE_AVISOS_DESLIGADOS);

  // 1.º tenta os avisos com o CRM fechado; se o browser não deixar, fica no modo "aba"
  if (temPush()) {
    try {
      const reg = await registo();
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveEmBytes(CHAVE_PUBLICA) }));
      const resposta = await ligarAvisos(sub.toJSON());
      if (resposta.erro) {
        await sub.unsubscribe();
        return { erro: resposta.erro };
      }
      localStorage.removeItem(CHAVE_AVISOS_ABA);
      return "ligado";
    } catch (e) {
      // ex.: AbortError no Brave com o serviço de avisos desligado
      console.warn("avisos com o CRM fechado indisponíveis:", e?.name, e?.message);
    }
  }
  localStorage.setItem(CHAVE_AVISOS_ABA, "1");
  return "aba";
}
