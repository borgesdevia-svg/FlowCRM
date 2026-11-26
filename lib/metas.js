// Metas de vendas (migração 32): funções puras, testadas com npm test.
import { lerEuros } from "./dinheiro.js";

// Lê o valor que o admin escreveu na caixa da meta: "12000", "12 000", "12.000", "12 000,50 €".
// Em Portugal o ponto separa os milhares e a vírgula as décimas.
// Devolve o número, ou null se não for um valor aceite (maior que 0 e até 99 999 999, como na base de dados).
export function lerValorMeta(texto) {
  const valor = lerEuros(texto);
  if (Number.isNaN(valor) || Math.round(valor * 100) !== valor * 100) return null; // no máximo 2 casas decimais
  return valor > 0 && valor <= 99999999 ? valor : null;
}

// Quanto já se ganhou este mês: soma o valor previsto de cada lead que passou a Ativo este mês
// e que AINDA está Ativo (se voltou para trás, não conta). Um lead que passou duas vezes a Ativo
// conta só uma vez.
// "passagens" = [{ cliente_id, clientes: { estado, valor_previsto } }, ...]
export function ganhoDoMes(passagens) {
  const vistos = new Set();
  let total = 0;
  for (const p of passagens ?? []) {
    if (vistos.has(p.cliente_id) || p.clientes?.estado !== "ativo") continue;
    vistos.add(p.cliente_id);
    total += Number(p.clientes.valor_previsto ?? 0);
  }
  return total;
}

// Previsão do mês, para o bloco da meta na Visão geral.
// "dia" = dia de hoje (1–31) e "diasMes" = quantos dias tem o mês.
// Devolve:
//  - falta: quanto falta para a meta (0 se já foi batida);
//  - diasRestantes: dias que faltam, contando com hoje;
//  - ritmo: valor previsto no fim do mês se o ritmo continuar igual (null nos primeiros 3 dias:
//    com tão poucos dias a conta engana);
//  - comNegociacao: o ganho mais tudo o que está em negociação (o máximo realista se tudo fechar).
export function previsaoMes({ ganho, meta, dia, diasMes, negociacao }) {
  return {
    falta: Math.max(0, meta - ganho),
    diasRestantes: diasMes - dia + 1,
    ritmo: dia > 3 ? Math.round((ganho / dia) * diasMes) : null,
    comNegociacao: ganho + negociacao,
  };
}
