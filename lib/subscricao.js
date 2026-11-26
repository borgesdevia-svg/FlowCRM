// Confirma a subscrição de avisos que vem do browser antes de a guardar (migração 34).
// Função pura, testada com npm test.
// Forma: { endpoint: "https://...", keys: { p256dh: "...", auth: "..." } }
const BASE64URL = /^[A-Za-z0-9_-]+=*$/;

// Google (Chrome, Edge no Android, Brave, Opera), Mozilla (Firefox), Microsoft (Edge) e Apple (Safari)
const SERVICOS_AVISOS = ["fcm.googleapis.com", "push.services.mozilla.com", "notify.windows.com", "push.apple.com"];

export function subscricaoValida(s) {
  if (!s || typeof s !== "object") return false;
  const { endpoint, keys } = s;
  if (typeof endpoint !== "string" || endpoint.length > 1000 || !endpoint.startsWith("https://")) return false;
  // só os serviços de avisos dos browsers: o servidor envia pedidos para este endereço,
  // e não pode ser um endereço qualquer escolhido por quem liga os avisos
  let anfitriao;
  try {
    anfitriao = new URL(endpoint).hostname;
  } catch {
    return false;
  }
  if (!SERVICOS_AVISOS.some((s) => anfitriao === s || anfitriao.endsWith(`.${s}`))) return false;
  if (!keys || typeof keys !== "object") return false;
  const { p256dh, auth } = keys;
  return (
    typeof p256dh === "string" &&
    p256dh.length <= 200 &&
    BASE64URL.test(p256dh) &&
    typeof auth === "string" &&
    auth.length <= 100 &&
    BASE64URL.test(auth)
  );
}
