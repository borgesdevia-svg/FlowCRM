// Confirma a subscrição de avisos que vem do browser antes de a guardar (migração 34).
// Função pura, testada com npm test.
// Forma: { endpoint: "https://...", keys: { p256dh: "...", auth: "..." } }
const BASE64URL = /^[A-Za-z0-9_-]+=*$/;

export function subscricaoValida(s) {
  if (!s || typeof s !== "object") return false;
  const { endpoint, keys } = s;
  if (typeof endpoint !== "string" || endpoint.length > 1000 || !endpoint.startsWith("https://")) return false;
  try {
    new URL(endpoint);
  } catch {
    return false;
  }
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
