// Testes dos planos (lib/planos.js). Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { estadoPlano, textoDiasRestantes } from "../lib/planos.js";

const agora = new Date("2026-11-22T12:00:00Z");

test("Pro pago (sem data de fim de teste)", () => {
  const p = estadoPlano({ plano: "pro", teste_ate: null }, agora);
  assert.equal(p.pro, true);
  assert.equal(p.emTeste, false);
  assert.equal(p.pessoas, 20);
});

test("a experimentar o Pro: conta os dias que faltam", () => {
  const p = estadoPlano({ plano: "pro", teste_ate: "2026-11-25T12:00:00Z" }, agora);
  assert.equal(p.pro, true);
  assert.equal(p.emTeste, true);
  assert.equal(p.diasRestantes, 3);
  // a meio do último dia ainda "falta 1 dia"
  assert.equal(estadoPlano({ plano: "pro", teste_ate: "2026-11-22T18:00:00Z" }, agora).diasRestantes, 1);
});

test("teste acabado passa a Essencial", () => {
  const p = estadoPlano({ plano: "pro", teste_ate: "2026-11-20T00:00:00Z" }, agora);
  assert.equal(p.pro, false);
  assert.equal(p.testeAcabou, true);
  assert.equal(p.nome, "CRM Essencial");
  assert.equal(p.pessoas, 5);
});

test("Essencial e empresa sem dados", () => {
  assert.equal(estadoPlano({ plano: "essencial", teste_ate: null }, agora).pro, false);
  assert.equal(estadoPlano(undefined, agora).chave, "essencial");
});

test("textoDiasRestantes", () => {
  assert.equal(textoDiasRestantes(1), "falta 1 dia");
  assert.equal(textoDiasRestantes(5), "faltam 5 dias");
});

test("aviso do fim do teste: só nos últimos 3 dias e 7 dias depois", async () => {
  const { avisoPlano } = await import("../lib/planos.js");
  const aviso = (teste_ate) => avisoPlano(estadoPlano({ plano: "pro", teste_ate }, agora));
  assert.equal(aviso("2026-12-01T12:00:00Z"), null); // faltam 9 dias
  assert.equal(aviso("2026-11-25T12:00:00Z").tipo, "acaba"); // faltam 3
  assert.equal(aviso("2026-11-21T12:00:00Z").tipo, "acabou"); // acabou ontem
  assert.equal(aviso("2026-11-10T12:00:00Z"), null); // acabou há 12 dias
  assert.equal(avisoPlano(estadoPlano({ plano: "pro", teste_ate: null }, agora)), null); // Pro pago
});
