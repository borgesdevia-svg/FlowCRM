// WhatsApp a partir da ficha do lead: número no formato internacional e mensagens prontas.
// Usa o link oficial wa.me (abre a app no telemóvel ou o WhatsApp Web no computador):
// não precisa de contas nem de serviços pagos.

// "912 345 678" -> "351912345678"; "+44 7700 900123" -> "447700900123".
// Números portugueses sem indicativo (9 dígitos a começar por 2 ou 9) ganham o 351.
// Devolve null se não parecer um número de telefone.
export function numeroWhatsapp(telefone) {
  let digitos = String(telefone ?? "").replace(/[^\d+]/g, "");
  if (digitos.startsWith("+")) digitos = digitos.slice(1);
  else if (digitos.startsWith("00")) digitos = digitos.slice(2);
  else if (/^[29]\d{8}$/.test(digitos)) digitos = `351${digitos}`;
  digitos = digitos.replace(/\D/g, "");
  return digitos.length >= 8 && digitos.length <= 15 ? digitos : null;
}

export function linkWhatsapp(telefone, texto = "") {
  const numero = numeroWhatsapp(telefone);
  if (!numero) return null;
  return `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

export const MAX_MENSAGEM_WHATSAPP = 1000;

// mensagens prontas: {nome} = primeiro nome do lead, {empresa}, {eu} = primeiro nome de quem envia
export const MODELOS_WHATSAPP = [
  {
    chave: "primeiro",
    nome: "Primeiro contacto",
    texto: "Olá {nome}! Aqui é {eu}, da {empresa}. Obrigado pelo seu contacto. Quando é que lhe dá jeito falarmos?",
  },
  {
    chave: "seguimento",
    nome: "Seguimento",
    texto: "Olá {nome}, tudo bem? Fiquei de lhe dar notícias. Ainda está interessado? Estou à disposição para qualquer dúvida.",
  },
  {
    chave: "reuniao",
    nome: "Marcar reunião",
    texto: "Olá {nome}! Podemos marcar uma conversa rápida esta semana? Diga-me o dia e a hora que lhe dão mais jeito.",
  },
  {
    chave: "obrigado",
    nome: "Agradecer",
    texto: "Olá {nome}, muito obrigado pela confiança na {empresa}! Qualquer coisa de que precise, é só dizer.",
  },
];

const primeiroNome = (texto) => String(texto ?? "").trim().split(/\s+/)[0] ?? "";

export function preencherModelo(texto, { nome = "", empresa = "", eu = "" }) {
  return texto
    .replaceAll("{nome}", primeiroNome(nome))
    .replaceAll("{empresa}", empresa)
    .replaceAll("{eu}", primeiroNome(eu));
}
