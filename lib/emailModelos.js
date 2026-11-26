// Email a partir da ficha do lead: mensagens prontas (assunto + texto) e o link "mailto:".
// O link abre o programa de email de quem clica (Gmail, Outlook, Mail…) com tudo já escrito:
// não precisa de nenhum serviço de envio de emails.
import { preencherModelo } from "./whatsapp.js";

export const MAX_ASSUNTO_EMAIL = 150;
export const MAX_TEXTO_EMAIL = 3000;

// {nome} = primeiro nome do lead, {empresa}, {eu} = primeiro nome de quem envia
export const MODELOS_EMAIL = [
  {
    chave: "primeiro",
    nome: "Primeiro contacto",
    assunto: "O seu pedido à {empresa}",
    texto:
      "Olá {nome},\n\nObrigado pelo seu contacto. Sou {eu}, da {empresa}, e vou acompanhar o seu pedido.\n\nQuando é que lhe dá jeito falarmos? Pode responder a este email ou indicar-me o melhor número e hora para lhe ligar.\n\nCumprimentos,\n{eu}\n{empresa}",
  },
  {
    chave: "seguimento",
    nome: "Seguimento",
    assunto: "Seguimento do seu pedido",
    texto:
      "Olá {nome},\n\nFiquei de lhe dar notícias e queria saber se ainda está interessado. Se tiver alguma dúvida, estou à disposição.\n\nCumprimentos,\n{eu}\n{empresa}",
  },
  {
    chave: "reuniao",
    nome: "Marcar reunião",
    assunto: "Marcar uma conversa",
    texto:
      "Olá {nome},\n\nPodemos marcar uma conversa rápida esta semana? Diga-me o dia e a hora que lhe dão mais jeito.\n\nCumprimentos,\n{eu}\n{empresa}",
  },
  {
    chave: "obrigado",
    nome: "Agradecer",
    assunto: "Obrigado pela confiança",
    texto:
      "Olá {nome},\n\nMuito obrigado pela confiança na {empresa}! Qualquer coisa de que precise, é só responder a este email.\n\nCumprimentos,\n{eu}\n{empresa}",
  },
];

// prepara um modelo com os dados do lead
export function preencherEmail(modelo, dados) {
  return { assunto: preencherModelo(modelo.assunto, dados), texto: preencherModelo(modelo.texto, dados) };
}

// "mailto:marta@x.pt?subject=...&body=..." (encodeURIComponent: espaços e acentos seguros)
export function linkEmail(email, assunto = "", texto = "") {
  const partes = [];
  if (assunto) partes.push(`subject=${encodeURIComponent(assunto)}`);
  if (texto) partes.push(`body=${encodeURIComponent(texto)}`);
  return `mailto:${email}${partes.length ? `?${partes.join("&")}` : ""}`;
}
