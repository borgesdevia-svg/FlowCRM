// Testes dos planos (lib/planos.js). Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { avisoPlano, estadoPlano, precoPlano, textoDiasRestantes } from "../lib/planos.js";

const agora = new Date("2026-11-22T12:00:00Z");

test("Pro pago (sem data de fim de teste)", () => {
  const p = estadoPlano({ plano: "pro", teste_ate: null, stripe_assinatura: "sub_1", ciclo: "anual" }, agora);
  assert.equal(p.pro, true);
  assert.equal(p.emTeste, false);
  assert.equal(p.bloqueada, false);
  assert.equal(p.pago, true);
  assert.equal(p.ciclo, "anual");
  assert.equal(p.pessoas, 20);
});

test("Pro sem assinatura (posto à mão) não conta como pago pela Stripe", () => {
  const p = estadoPlano({ plano: "pro", teste_ate: null }, agora);
  assert.equal(p.pro, true);
  assert.equal(p.pago, false);
});

test("a experimentar o Pro: conta os dias que faltam", () => {
  const p = estadoPlano({ plano: "pro", teste_ate: "2026-11-25T12:00:00Z" }, agora);
  assert.equal(p.pro, true);
  assert.equal(p.emTeste, true);
  assert.equal(p.bloqueada, false);
  assert.equal(p.diasRestantes, 3);
  // a meio do último dia ainda "falta 1 dia"
  assert.equal(estadoPlano({ plano: "pro", teste_ate: "2026-11-22T18:00:00Z" }, agora).diasRestantes, 1);
});

test("teste acabado sem pagar: bloqueada e sem Pro", () => {
  const p = estadoPlano({ plano: "pro", teste_ate: "2026-11-20T00:00:00Z" }, agora);
  assert.equal(p.bloqueada, true);
  assert.equal(p.pro, false);
  assert.equal(p.emTeste, false);
  assert.equal(p.pago, false);
});

test("assinatura cancelada (teste_ate posto no passado) também bloqueia, mesmo no Essencial", () => {
  const p = estadoPlano({ plano: "essencial", teste_ate: "2026-11-21T00:00:00Z", stripe_assinatura: "sub_1" }, agora);
  assert.equal(p.bloqueada, true);
  assert.equal(p.pago, false);
});

test("Essencial pago e empresa sem dados", () => {
  const e = estadoPlano({ plano: "essencial", teste_ate: null, stripe_assinatura: "sub_1" }, agora);
  assert.equal(e.pro, false);
  assert.equal(e.bloqueada, false);
  assert.equal(e.pessoas, 5);
  assert.equal(estadoPlano(undefined, agora).chave, "essencial");
});

test("preços: mensal e anual (12 meses pelo preço de 10)", () => {
  assert.equal(precoPlano("essencial", "mensal"), 15);
  assert.equal(precoPlano("pro", "anual"), 350);
  assert.equal(precoPlano("outro", "mensal"), null);
});

test("textoDiasRestantes", () => {
  assert.equal(textoDiasRestantes(1), "falta 1 dia");
  assert.equal(textoDiasRestantes(5), "faltam 5 dias");
});

test("aviso do fim do teste: só nos últimos 3 dias", () => {
  const aviso = (teste_ate) => avisoPlano(estadoPlano({ plano: "pro", teste_ate }, agora));
  assert.equal(aviso("2026-12-01T12:00:00Z"), null); // faltam 9 dias
  assert.equal(aviso("2026-11-25T12:00:00Z").tipo, "acaba"); // faltam 3
  assert.equal(aviso("2026-11-21T12:00:00Z"), null); // acabou: bloqueado, sem aviso
  assert.equal(avisoPlano(estadoPlano({ plano: "pro", teste_ate: null }, agora)), null); // Pro pago
});
