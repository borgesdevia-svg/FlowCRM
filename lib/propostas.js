// Propostas (orçamentos com aceitação online, CRM Pro).
// Usado no browser (formulário, para mostrar o total enquanto se escreve)
// e no servidor (ao guardar: nunca se confia no total que vem do browser).

import { lerEuros } from "./dinheiro.js";

export const MAX_ITENS = 30;
export const LIMITES_PROPOSTA = { titulo: 120, descricao: 200, notas: 2000 };
const MAX_PRECO = 9_999_999;
const MAX_QUANTIDADE = 99_999;

// "12,5" ou "12.5" -> 12.5 ; "1.200" -> 1200 ; vazio ou lixo -> NaN (regras em lib/dinheiro.js)
export const lerNumero = lerEuros;

const arredondar = (n) => Math.round(n * 100) / 100;

// valida a lista de linhas; devolve { itens } ou { erro }
export function normalizarItens(brutos) {
  const lista = Array.isArray(brutos) ? brutos.slice(0, 100) : [];
  const itens = [];
  for (const [i, b] of lista.entries()) {
    const descricao = String(b?.descricao ?? "").trim().replace(/\s+/g, " ");
    const quantidade = lerNumero(b?.quantidade);
    const preco = lerNumero(b?.preco);
    // linhas completamente vazias ignoram-se (a última fica muitas vezes por preencher)
    if (!descricao && Number.isNaN(preco)) continue;
    const n = i + 1;
    if (!descricao) return { erro: `Escreve o que é a linha ${n}.` };
    if (descricao.length > LIMITES_PROPOSTA.descricao) return { erro: `A linha ${n} é demasiado longa.` };
    if (!Number.isFinite(quantidade) || quantidade <= 0 || quantidade > MAX_QUANTIDADE)
      return { erro: `A quantidade da linha ${n} não é válida.` };
    if (!Number.isFinite(preco) || preco < 0 || preco > MAX_PRECO)
      return { erro: `O preço da linha ${n} não é válido.` };
    itens.push({ descricao, quantidade: arredondar(quantidade), preco: arredondar(preco) });
  }
  if (itens.length === 0) return { erro: "Põe pelo menos uma linha na proposta." };
  if (itens.length > MAX_ITENS) return { erro: `No máximo ${MAX_ITENS} linhas.` };
  return { itens };
}

export const totalLinha = (item) => arredondar(lerNumero(item.quantidade) * lerNumero(item.preco)) || 0;

export function calcularTotal(itens) {
  return arredondar((itens ?? []).reduce((soma, item) => soma + totalLinha(item), 0));
}

// estado para mostrar: uma proposta "enviada" cuja validade já passou está "expirada"
export const ESTADOS_PROPOSTA = {
  enviada: { texto: "À espera de resposta", cor: "#60a5fa" },
  aceite: { texto: "Aceite", cor: "#22c55e" },
  recusada: { texto: "Recusada", cor: "#f87171" },
  expirada: { texto: "Expirada", cor: "#a1a1a1" },
};

// dia de hoje em Portugal ("2026-11-22"), igual ao privado.hoje_portugal() da base de dados
export const hojePortugal = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());

export function estadoProposta(proposta, hoje = hojePortugal()) {
  if (proposta.estado === "enviada" && proposta.validade && proposta.validade < hoje) return "expirada";
  return proposta.estado;
}
