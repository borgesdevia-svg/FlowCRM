// Testes do IP do formulário público (lib/ipVisitante.js). Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { hashIp, ipDoPedido } from "../lib/ipVisitante.js";

const cabecalhos = (obj) => ({ get: (nome) => obj[nome] ?? null });

test("ipDoPedido: prefere x-real-ip, depois o primeiro de x-forwarded-for", () => {
  assert.equal(ipDoPedido(cabecalhos({ "x-real-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" })), "1.2.3.4");
  assert.equal(ipDoPedido(cabecalhos({ "x-forwarded-for": "5.6.7.8, 10.0.0.1" })), "5.6.7.8");
  assert.equal(ipDoPedido(cabecalhos({})), "desconhecido");
});

test("hashIp: 64 letras hexadecimais, igual para o mesmo IP", () => {
  assert.match(hashIp("1.2.3.4"), /^[0-9a-f]{64}$/);
  assert.equal(hashIp("1.2.3.4"), hashIp("1.2.3.4"));
  assert.notEqual(hashIp("1.2.3.4"), hashIp("1.2.3.5"));
});
