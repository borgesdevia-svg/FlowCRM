// Modelos de e-mail e montagem do texto da janela de escrever (página E-mails e ficha do lead).
// Funções puras: testadas em testes/emailModelos.test.mjs.
//
// O texto de um e-mail novo é montado assim (as partes vazias saltam-se):
//   mensagem do início (A minha conta › E-mails, com {saudacao} {nome}...)
//   texto do modelo escolhido (ou uma linha em branco para escrever)
//   assinatura (da conta de e-mail ligada)

import { preencherTextoEmail } from "./linkEmail.js";

export const MAX_MODELOS = 30; // por pessoa
export const LIMITES_MODELO = { nome: 80, assunto: 300, corpo: 10000 };

// Sugestões mostradas a quem ainda não tem modelos (só são guardadas se a pessoa carregar em "Adicionar")
export const SUGESTOES = [
  {
    nome: "Primeiro contacto",
    assunto: "Obrigado pelo seu contacto",
    corpo:
      "Obrigado por nos ter contactado. Gostava de perceber melhor o que procura para lhe preparar a melhor proposta.\n\nQuando lhe dá jeito falarmos 10 minutos ao telefone?",
  },
  {
    nome: "Envio de proposta",
    assunto: "Proposta da {empresa}",
    corpo:
      "Conforme combinado, segue em anexo a nossa proposta.\n\nSe tiver alguma dúvida ou quiser ajustar alguma coisa, é só dizer.",
  },
  {
    nome: "Seguimento",
    assunto: "Ficou alguma dúvida?",
    corpo:
      "Só para saber se teve oportunidade de ver a informação que lhe enviei. Fico a aguardar a sua resposta e estou disponível para qualquer esclarecimento.",
  },
];

// Junta as partes com uma linha em branco entre elas.
// Sem texto do meio, fica uma linha em branco antes da assinatura (para escrever lá).
export function montarTexto({ inicio = "", meio = "", assinatura = "" } = {}) {
  const partes = [inicio.trim(), meio.trim()].filter(Boolean);
  const temMeio = Boolean(meio.trim());
  const assin = assinatura.trim();
  if (!assin) return partes.join("\n\n") + (temMeio ? "" : partes.length ? "\n\n" : "");
  if (temMeio) return [...partes, assin].join("\n\n");
  if (!partes.length) return `\n\n${assin}`; // só a assinatura: uma linha em branco por cima para escrever
  return [...partes, "", assin].join("\n\n");
}

// Texto inicial da janela: mensagem do início + (modelo) + assinatura, com as variáveis preenchidas
export function textoDoEmail({ inicio, modelo, assinatura, nome, empresa, eu, data } = {}) {
  const dados = { nome, empresa, eu, data };
  return montarTexto({
    inicio: preencherTextoEmail(inicio, dados),
    meio: modelo ? preencherTextoEmail(modelo, dados) : "",
    assinatura: assinatura ?? "",
  });
}

// "Proposta" -> "Re: Proposta"; não duplica ("Re: Re: x" fica "Re: x"; "RE:", "Res:" também contam)
export function assuntoResposta(assunto) {
  const limpo = String(assunto ?? "")
    .replace(/^\s*((re|res|enc|fw|fwd)\s*:\s*)+/i, "")
    .trim();
  return `Re: ${limpo || "(sem assunto)"}`.slice(0, LIMITES_MODELO.assunto);
}

// Valida o que vem do formulário. Devolve { valores } ou { erro, valores }.
export function validarModelo(bruto) {
  const valores = {
    nome: String(bruto?.nome ?? "").replace(/\s+/g, " ").trim(),
    assunto: String(bruto?.assunto ?? "").replace(/\s+/g, " ").trim(),
    corpo: String(bruto?.corpo ?? "").replace(/\r\n/g, "\n").trim(),
  };
  if (!valores.nome) return { erro: "Dá um nome ao modelo.", valores };
  if (valores.nome.length > LIMITES_MODELO.nome) return { erro: `O nome é demasiado longo (máximo ${LIMITES_MODELO.nome}).`, valores };
  if (valores.assunto.length > LIMITES_MODELO.assunto)
    return { erro: `O assunto é demasiado longo (máximo ${LIMITES_MODELO.assunto}).`, valores };
  if (!valores.corpo) return { erro: "Escreve o texto do modelo.", valores };
  if (valores.corpo.length > LIMITES_MODELO.corpo)
    return { erro: `O texto é demasiado longo (máximo ${LIMITES_MODELO.corpo} caracteres).`, valores };
  return { valores };
}
