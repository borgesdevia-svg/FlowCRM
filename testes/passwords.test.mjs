// Testes das regras das passwords (lib/passwords.js). Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { erroPassword } from "../lib/passwords.js";

test("password boa passa", () => {
  assert.equal(erroPassword("Padaria2026!"), null);
  assert.equal(erroPassword("abcDEF12#"), null);
});

test("curta ou sem os três tipos de caracteres é recusada", () => {
  assert.match(erroPassword("Ab1"), /8 caracteres/);
  assert.equal(erroPassword("padaria2026!"), "A password precisa de ter pelo menos uma letra maiúscula.");
  assert.equal(erroPassword("padariacentral"), "A password precisa de ter pelo menos uma letra maiúscula, um número e um símbolo (ex.: ! ? # @).");
  assert.equal(erroPassword("12345678?"), "A password precisa de ter pelo menos uma letra minúscula e uma letra maiúscula.");
  assert.equal(erroPassword("!!!!!!!!"), "A password precisa de ter pelo menos uma letra minúscula, uma letra maiúscula e um número.");
});

test("sem símbolo é recusada", () => {
  assert.equal(erroPassword("Padaria2026"), "A password precisa de ter pelo menos um símbolo (ex.: ! ? # @).");
});

test("mais de 72 bytes é recusada", () => {
  assert.match(erroPassword("Aa1" + "x".repeat(80)), /demasiado longa/);
});
