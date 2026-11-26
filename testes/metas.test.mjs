// Testes das metas de vendas (lib/metas.js). Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { ganhoDoMes, lerValorMeta, previsaoMes } from "../lib/metas.js";

test("lerValorMeta: aceita as formas portuguesas de escrever euros", () => {
  assert.equal(lerValorMeta("12000"), 12000);
  assert.equal(lerValorMeta("12 000"), 12000);
  assert.equal(lerValorMeta("12.000"), 12000);
  assert.equal(lerValorMeta("12 000,50 €"), 12000.5);
  assert.equal(lerValorMeta("0"), null);
  assert.equal(lerValorMeta("-5"), null);
  assert.equal(lerValorMeta("abc"), null);
  assert.equal(lerValorMeta(""), null);
  assert.equal(lerValorMeta("100000000"), null); // acima do limite da base de dados
});

test("ganhoDoMes: soma cada lead ativo uma só vez", () => {
  const passagens = [
    { cliente_id: "a", clientes: { estado: "ativo", valor_previsto: "300.00" } },
    { cliente_id: "a", clientes: { estado: "ativo", valor_previsto: "300.00" } }, // passou duas vezes
    { cliente_id: "b", clientes: { estado: "perdido", valor_previsto: 500 } }, // voltou para trás
    { cliente_id: "c", clientes: { estado: "ativo", valor_previsto: null } }, // sem valor
    { cliente_id: "d", clientes: { estado: "ativo", valor_previsto: 1200 } },
  ];
  assert.equal(ganhoDoMes(passagens), 1500);
  assert.equal(ganhoDoMes([]), 0);
  assert.equal(ganhoDoMes(null), 0);
});

test("previsaoMes: falta, dias, ritmo e negociação", () => {
  const p = previsaoMes({ ganho: 3000, meta: 10000, dia: 10, diasMes: 30, negociacao: 4000 });
  assert.equal(p.falta, 7000);
  assert.equal(p.diasRestantes, 21);
  assert.equal(p.ritmo, 9000); // 300 €/dia × 30 dias
  assert.equal(p.comNegociacao, 7000);
  // meta já batida: falta 0
  assert.equal(previsaoMes({ ganho: 12000, meta: 10000, dia: 20, diasMes: 30, negociacao: 0 }).falta, 0);
  // primeiros dias: sem ritmo
  assert.equal(previsaoMes({ ganho: 500, meta: 10000, dia: 2, diasMes: 31, negociacao: 0 }).ritmo, null);
});
