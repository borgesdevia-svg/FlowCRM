// Testes da chave de recuperação (lib/chaveRecuperacao.js). Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { gerarChave, normalizarChave, chaveValida, hashChave, hashesIguais, TAMANHO_CHAVE } from "../lib/chaveRecuperacao.js";

test("gerarChave: 6 grupos de 5, sem caracteres que se confundem", () => {
  const chave = gerarChave();
  assert.match(chave, /^([A-Z2-9]{5}-){5}[A-Z2-9]{5}$/);
  assert.doesNotMatch(chave, /[ILO01]/);
  assert.equal(normalizarChave(chave).length, TAMANHO_CHAVE);
  assert.ok(chaveValida(chave));
});

test("gerarChave: chaves diferentes de cada vez", () => {
  const chaves = new Set(Array.from({ length: 200 }, gerarChave));
  assert.equal(chaves.size, 200);
});

test("normalizarChave e hashChave: aceitam a chave sem traços, com espaços e em minúsculas", () => {
  const chave = "K7QM2-XH9PD-RT4WB-N8CZF-3YVJG-6SAEU";
  assert.equal(normalizarChave(" k7qm2 xh9pd rt4wb n8czf 3yvjg 6saeu "), "K7QM2XH9PDRT4WBN8CZF3YVJG6SAEU");
  assert.equal(hashChave("k7qm2xh9pdrt4wbn8czf3yvjg6saeu"), hashChave(chave));
  assert.match(hashChave(chave), /^[0-9a-f]{64}$/);
});

test("chaveValida: recusa tamanho errado e caracteres fora do alfabeto", () => {
  assert.equal(chaveValida("K7QM2-XH9PD"), false);
  assert.equal(chaveValida("K7QM2-XH9PD-RT4WB-N8CZF-3YVJG-6SAE0"), false); // 0 não existe
  assert.equal(chaveValida(""), false);
});

test("hashesIguais: só iguais quando são mesmo iguais", () => {
  const a = hashChave(gerarChave());
  assert.equal(hashesIguais(a, a), true);
  assert.equal(hashesIguais(a, hashChave(gerarChave())), false);
  assert.equal(hashesIguais(a, "abc"), false);
  assert.equal(hashesIguais(null, a), false);
});
