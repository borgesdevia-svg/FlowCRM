// Cifra da password das contas de e-mail (só SERVIDOR).
// AES-256-GCM com a chave EMAIL_CHAVE (64 caracteres hex = 32 bytes), que está no .env.local
// e na Vercel. Guardado na coluna contas_email.password_cifrada como
//   "v1:<iv em base64>:<tag em base64>:<dados em base64>"
// O "v1" permite mudar de método um dia sem estragar as passwords antigas.
// Se a EMAIL_CHAVE mudar, as passwords guardadas deixam de se poder ler: cada pessoa
// tem de ligar a conta outra vez.

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function chave() {
  const hex = process.env.EMAIL_CHAVE ?? "";
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("Falta a EMAIL_CHAVE (64 caracteres hex) no .env.local / na Vercel.");
  }
  return Buffer.from(hex, "hex");
}

export function cifrar(texto) {
  const iv = randomBytes(12);
  const cifra = createCipheriv("aes-256-gcm", chave(), iv);
  const dados = Buffer.concat([cifra.update(String(texto), "utf8"), cifra.final()]);
  const tag = cifra.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${dados.toString("base64")}`;
}

export function decifrar(guardado) {
  const partes = String(guardado ?? "").split(":");
  if (partes.length !== 4 || partes[0] !== "v1") throw new Error("Password cifrada num formato desconhecido.");
  const [, iv, tag, dados] = partes.map((p, i) => (i === 0 ? p : Buffer.from(p, "base64")));
  const decifra = createDecipheriv("aes-256-gcm", chave(), iv);
  decifra.setAuthTag(tag);
  return Buffer.concat([decifra.update(dados), decifra.final()]).toString("utf8");
}
