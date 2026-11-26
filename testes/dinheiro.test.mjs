// Testes de ler euros (lib/dinheiro.js). Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { lerEuros } from "../lib/dinheiro.js";

test("lerEuros: as formas portuguesas e inglesas de escrever valores", () => {
  assert.equal(lerEuros("1500"), 1500);
  assert.equal(lerEuros("12 000 €"), 12000);
  assert.equal(lerEuros("1500,50"), 1500.5);
  assert.equal(lerEuros("12.000"), 12000);
  assert.equal(lerEuros("12.000,50"), 12000.5);
  assert.equal(lerEuros("1.250.000"), 1250000);
  assert.equal(lerEuros("1500.50"), 1500.5);
  assert.equal(lerEuros("1.5"), 1.5);
  assert.equal(lerEuros(42), 42);
  assert.ok(Number.isNaN(lerEuros("")));
  assert.ok(Number.isNaN(lerEuros("abc")));
  assert.ok(Number.isNaN(lerEuros("1,2,3")));
});
