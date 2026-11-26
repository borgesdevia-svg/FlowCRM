// Testes das metas de vendas (lib/metas.js). Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { ganhoDoMes, lerValorMeta } from "../lib/metas.js";

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
