// IP de quem envia o formulário público, para o limite de envios (migração 33).
// Funções puras, testadas com npm test.
import { createHash } from "node:crypto";

// Na Vercel, o IP real do visitante vem em "x-real-ip" (e é o primeiro de "x-forwarded-for").
// Recebe um objeto com .get(nome), como o headers() do Next.js. Sem IP devolve "desconhecido"
// (todos os pedidos sem IP partilham o mesmo limite).
export function ipDoPedido(cabecalhos) {
  const real = cabecalhos.get("x-real-ip")?.trim();
  if (real) return real;
  const encaminhado = cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim();
  return encaminhado || "desconhecido";
}

// O IP não se guarda: só o seu hash SHA-256 (64 letras hexadecimais).
export function hashIp(ip) {
  return createHash("sha256").update(`flowcrm-formulario:${ip}`).digest("hex");
}
