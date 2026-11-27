// O botão de e-mail da ficha: link que abre o Gmail (no browser) já na janela de escrever,
// com o destinatário e o texto pré-escrito da pessoa (A minha conta › Definições de e-mail).
// Se a pessoa não tiver sessão no Gmail, o Gmail pede o login primeiro.
// Funções puras: testadas em testes/linkEmail.test.mjs.

import { preencherModelo } from "./whatsapp.js";

export const MAX_MODELO_EMAIL = 1000;

// palavras que se preenchem sozinhas no texto pré-escrito (mostradas na página A minha conta)
export const VARIAVEIS_EMAIL = [
  { chave: "{saudacao}", descricao: "Bom dia, Boa tarde ou Boa noite" },
  { chave: "{nome}", descricao: "primeiro nome do lead" },
  { chave: "{empresa}", descricao: "nome da tua empresa" },
  { chave: "{eu}", descricao: "o teu primeiro nome" },
];

// "Bom dia" das 6h às 12h, "Boa tarde" das 12h às 20h, "Boa noite" no resto (hora de Portugal)
export function saudacao(data = new Date()) {
  const hora = Number(
    new Intl.DateTimeFormat("pt-PT", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/Lisbon" }).format(data),
  );
  if (hora >= 6 && hora < 12) return "Bom dia";
  if (hora >= 12 && hora < 20) return "Boa tarde";
  return "Boa noite";
}

// troca {saudacao}, {nome}, {empresa} e {eu} pelos valores (o resto do texto fica igual)
export function preencherTextoEmail(modelo, { nome = "", empresa = "", eu = "", data = new Date() } = {}) {
  if (!modelo) return "";
  return preencherModelo(String(modelo).replaceAll("{saudacao}", saudacao(data)), { nome, empresa, eu });
}

// "view=cm" = escrever mensagem; "fs=1" = janela grande; encodeURIComponent: "+", acentos e
// mudanças de linha seguros. Sem texto, só vai o destinatário.
export function linkGmail(email, texto = "") {
  const corpo = texto ? `&body=${encodeURIComponent(texto)}` : "";
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}${corpo}`;
}
