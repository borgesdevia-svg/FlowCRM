// Testes das contas dos "Resultados" do Início (lib/relatorios.js). Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { taxaFecho, tempoAteFechar, textoDias } from "../lib/relatorios.js";

test("taxaFecho: ganhos sobre os negócios decididos", () => {
  assert.equal(taxaFecho(3, 1), 75);
  assert.equal(taxaFecho(0, 4), 0);
  assert.equal(taxaFecho(2, 1), 67);
  assert.equal(taxaFecho(0, 0), null);
});

test("tempoAteFechar: conta só a primeira vez que cada cliente passou a Ativo", () => {
  const evento = (cliente, quando, criado) => ({ cliente_id: cliente, criado_em: quando, clientes: { criado_em: criado } });
  const r = tempoAteFechar([
    evento("a", "2026-11-11T10:00:00Z", "2026-11-01T10:00:00Z"), // 10 dias
    evento("a", "2026-11-05T10:00:00Z", "2026-11-01T10:00:00Z"), // a primeira vez: 4 dias
    evento("b", "2026-11-03T10:00:00Z", "2026-11-01T10:00:00Z"), // 2 dias
    evento("c", "2026-11-21T10:00:00Z", "2026-11-01T10:00:00Z"), // 20 dias
    { cliente_id: "d", criado_em: "2026-11-02T10:00:00Z", clientes: null }, // sem acesso: ignorado
  ]);
  assert.deepEqual(r, { media: 9, mediana: 4, n: 3 });
});

test("tempoAteFechar: sem eventos devolve null", () => {
  assert.equal(tempoAteFechar([]), null);
  assert.equal(tempoAteFechar(null), null);
});

test("textoDias: singular e plural", () => {
  assert.equal(textoDias(1), "1 dia");
  assert.equal(textoDias(0), "0 dias");
  assert.equal(textoDias(12), "12 dias");
});
