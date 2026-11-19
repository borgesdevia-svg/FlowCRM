// Testes das funções de texto (lib/texto.js). Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { iniciais, termoPesquisa, formatarTelefone, linkTelefone } from "../lib/texto.js";

test("iniciais: no máximo duas letras, em maiúsculas", () => {
  assert.equal(iniciais("Ana Costa"), "AC");
  assert.equal(iniciais("rui"), "R");
  assert.equal(iniciais("Maria  da Silva Santos"), "MD");
});

test("termoPesquisa: minúsculas, sem acentos e sem caracteres especiais", () => {
  assert.equal(termoPesquisa("Clínica São João"), "clinica sao joao");
  assert.equal(termoPesquisa("  50%_off, (teste)\\ "), "50off teste");
  assert.equal(termoPesquisa(null), "");
  assert.equal(termoPesquisa("a".repeat(200)).length, 80);
});

test("formatarTelefone: números portugueses em grupos de 3", () => {
  assert.equal(formatarTelefone("912345678"), "912 345 678");
  assert.equal(formatarTelefone("+351912345678"), "+351 912 345 678");
  assert.equal(formatarTelefone("00351 912-345-678"), "+351 912 345 678");
  assert.equal(formatarTelefone("(21) 234 5678"), "212 345 678");
});

test("formatarTelefone: outros formatos ficam como foram escritos", () => {
  assert.equal(formatarTelefone("+44 20 7946 0958"), "+44 20 7946 0958");
  assert.equal(formatarTelefone("12345"), "12345");
  assert.equal(formatarTelefone(null), "");
});

test("linkTelefone: só dígitos e o +", () => {
  assert.equal(linkTelefone("+351 912 345 678"), "tel:+351912345678");
  assert.equal(linkTelefone("(21) 234-5678"), "tel:212345678");
});
