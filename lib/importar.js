// Importar clientes de um ficheiro CSV.
// Funções "puras" (sem base de dados): usadas no browser, para mostrar a pré-visualização,
// e no servidor, para validar outra vez antes de gravar (nunca confiar no browser).
// Aceita o CSV que o próprio FlowCRM exporta (separado por ";") e CSVs do Excel ou do
// Google Sheets (separados por "," ou ";").

import { ESTADOS } from "./estados.js";

export const MAX_LINHAS_IMPORTAR = 2000;

const REGEX_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const REGEX_TELEFONE = /^[0-9 +()-]{6,20}$/;

// texto sem acentos, em minúsculas e sem espaços a mais ("Valor previsto (€)" -> "valor previsto (€)")
function simplificar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- 1) ler o CSV ----------
// Devolve uma lista de linhas, cada uma uma lista de células.
// Percebe sozinho se o separador é ";" ou "," (pela primeira linha) e trata as aspas:
// "Silva; Lda" fica uma só célula, e "" dentro de aspas é uma aspa.
export function lerCsv(texto) {
  const conteudo = String(texto ?? "").replace(/^\uFEFF/, ""); // tira o BOM do Excel
  const primeira = conteudo.split(/\r?\n/, 1)[0];
  const separador = (primeira.match(/;/g)?.length ?? 0) >= (primeira.match(/,/g)?.length ?? 0) ? ";" : ",";

  const linhas = [];
  let linha = [];
  let celula = "";
  let entreAspas = false;

  for (let i = 0; i < conteudo.length; i++) {
    const c = conteudo[i];
    if (entreAspas) {
      if (c === '"' && conteudo[i + 1] === '"') {
        celula += '"';
        i++;
      } else if (c === '"') {
        entreAspas = false;
      } else {
        celula += c;
      }
    } else if (c === '"') {
      entreAspas = true;
    } else if (c === separador) {
      linha.push(celula);
      celula = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && conteudo[i + 1] === "\n") i++;
      linha.push(celula);
      linhas.push(linha);
      linha = [];
      celula = "";
    } else {
      celula += c;
    }
  }
  if (celula !== "" || linha.length > 0) {
    linha.push(celula);
    linhas.push(linha);
  }
  // linhas totalmente vazias (ex.: no fim do ficheiro) não contam
  return linhas.filter((l) => l.some((c) => c.trim() !== ""));
}

// ---------- 2) perceber as colunas ----------
// Para cada campo, os títulos de coluna aceites (já simplificados).
const TITULOS = {
  nome: ["nome", "name", "cliente", "nome do cliente", "lead", "nome do lead"],
  email: ["email", "e-mail", "mail", "correio eletronico"],
  telefone: ["telefone", "telemovel", "phone", "tel"],
  cidade: ["cidade", "localidade", "city"],
  valor_previsto: ["valor previsto (€)", "valor previsto", "valor", "valor (€)", "value"],
  estado: ["estado", "fase", "status"],
};

// { nome: 0, email: 1, ... } com a posição de cada campo (ou -1 se não existir)
export function encontrarColunas(cabecalho) {
  const simples = cabecalho.map(simplificar);
  return Object.fromEntries(
    Object.entries(TITULOS).map(([campo, nomes]) => [campo, simples.findIndex((t) => nomes.map(simplificar).includes(t))])
  );
}

// ---------- 3) limpar e validar cada valor ----------
// O exportar do FlowCRM põe um apóstrofo antes de = + - @ (proteção contra fórmulas no Excel).
// Ao importar, tira-se outra vez, senão "+351 912..." ficava "'+351 912...".
function limpar(valor) {
  const texto = String(valor ?? "").trim();
  return /^'[=+\-@]/.test(texto) ? texto.slice(1) : texto;
}

// "1.200,50 €" -> 1200.5 | "1200.50" -> 1200.5 | "" -> null | "abc" -> NaN
export function lerValor(texto) {
  let t = String(texto ?? "").replace(/[€\s]/g, "");
  if (t === "") return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}

// aceita a chave ("negociacao") ou o texto que aparece no CRM ("Em negociação"); vazio = Novo
export function lerEstado(texto) {
  const t = simplificar(texto);
  if (t === "") return "novo";
  const e = ESTADOS.find((x) => x.chave === t || simplificar(x.texto) === t);
  if (e) return e.chave;
  if (["negociacao", "negociação", "em negociacao"].includes(t)) return "negociacao";
  return null;
}

// ---------- 4) tudo junto ----------
// Recebe o texto do CSV e devolve:
//   { erro }  se o ficheiro não serve de todo (vazio, sem coluna Nome, linhas a mais)
//   { clientes: [...], invalidos: [{ linha, motivo }], repetidos: [{ linha, email }] }
// "linha" é o número da linha no ficheiro (a 1 é o cabeçalho), para a pessoa encontrar o erro.
export function prepararImportacao(texto) {
  const linhas = lerCsv(texto);
  if (linhas.length < 2) return { erro: "O ficheiro está vazio ou só tem a linha dos títulos." };

  const col = encontrarColunas(linhas[0]);
  if (col.nome === -1) return { erro: 'Não encontrei a coluna "Nome". A primeira linha tem de ter os títulos das colunas.' };
  if (col.telefone === -1) return { erro: 'Não encontrei a coluna "Telefone". O telefone é obrigatório em todos os leads.' };
  if (linhas.length - 1 > MAX_LINHAS_IMPORTAR) {
    return { erro: `O ficheiro tem ${linhas.length - 1} leads. O máximo de cada vez é ${MAX_LINHAS_IMPORTAR}.` };
  }

  const clientes = [];
  const invalidos = [];
  const repetidos = [];
  const emailsVistos = new Set();

  linhas.slice(1).forEach((celulas, i) => {
    const numLinha = i + 2;
    const ler = (campo) => (col[campo] === -1 ? "" : limpar(celulas[col[campo]]));

    const nome = ler("nome");
    const email = ler("email").toLowerCase();
    const telefone = ler("telefone");
    const cidade = ler("cidade");
    const valor = lerValor(ler("valor_previsto"));
    const estado = lerEstado(ler("estado"));

    let motivo = null;
    if (nome.length < 1) motivo = "Falta o nome.";
    else if (nome.length > 150) motivo = "Nome com mais de 150 letras.";
    else if (email && (email.length > 254 || !REGEX_EMAIL.test(email))) motivo = `Email inválido (${email}).`;
    else if (!telefone) motivo = "Falta o telefone.";
    else if (!REGEX_TELEFONE.test(telefone)) motivo = `Telefone inválido (${telefone}).`;
    else if (cidade.length > 100) motivo = "Cidade com mais de 100 letras.";
    else if (Number.isNaN(valor)) motivo = `Valor previsto inválido (${ler("valor_previsto")}).`;
    else if (valor !== null && valor >= 1e10) motivo = "Valor previsto demasiado grande.";
    else if (!estado) motivo = `Estado desconhecido (${ler("estado")}).`;

    if (motivo) {
      invalidos.push({ linha: numLinha, motivo });
      return;
    }
    // o mesmo email duas vezes no ficheiro: fica só o primeiro
    if (email && emailsVistos.has(email)) {
      repetidos.push({ linha: numLinha, email });
      return;
    }
    if (email) emailsVistos.add(email);

    clientes.push({
      linha: numLinha,
      nome,
      email: email || null,
      telefone,
      cidade: cidade || null,
      valor_previsto: valor,
      estado,
    });
  });

  return { clientes, invalidos, repetidos };
}
