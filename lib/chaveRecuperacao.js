// Chave de recuperação da password (sem email). Funções puras, usadas no servidor.
//
// A chave tem 30 caracteres aleatórios, mostrados em 6 grupos de 5:
//   K7QM2-XH9PD-RT4WB-N8CZF-3YVJG-6SAEU
// O alfabeto não tem caracteres que se confundem (0/O, 1/I/L), para se copiar à mão sem erros.
// 31 símbolos ^ 30 posições ≈ 2^148 chaves possíveis: impossível de adivinhar.
// Na base de dados só fica o hash SHA-256 (ver migração 23).

import { createHash, randomInt, timingSafeEqual } from "node:crypto";

const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sem I, L, O, 0, 1
export const TAMANHO_CHAVE = 30;
const GRUPO = 5;

// chave nova, já com os traços: "K7QM2-XH9PD-..."
// randomInt usa o gerador criptográfico do Node (não o Math.random, que é previsível)
export function gerarChave() {
  let chave = "";
  for (let i = 0; i < TAMANHO_CHAVE; i++) chave += ALFABETO[randomInt(ALFABETO.length)];
  return chave.match(new RegExp(`.{${GRUPO}}`, "g")).join("-");
}

// o que a pessoa escreveu -> só os 30 caracteres, em maiúsculas
// (aceita a chave com ou sem traços, com espaços e em minúsculas)
export function normalizarChave(texto) {
  return String(texto ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

// tem o tamanho certo e só letras/números do alfabeto?
export function chaveValida(texto) {
  const c = normalizarChave(texto);
  return c.length === TAMANHO_CHAVE && [...c].every((ch) => ALFABETO.includes(ch));
}

// hash SHA-256 da chave normalizada (64 caracteres em hexadecimal)
export function hashChave(texto) {
  return createHash("sha256").update(normalizarChave(texto)).digest("hex");
}

// compara dois hashes sem "fugas de tempo" (timingSafeEqual demora o mesmo
// quer os hashes difiram no 1.º caracter quer no último)
export function hashesIguais(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
