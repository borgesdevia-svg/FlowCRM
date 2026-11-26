// Testes do email com mensagens prontas (lib/emailModelos.js). Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { MODELOS_EMAIL, linkEmail, preencherEmail } from "../lib/emailModelos.js";

test("preencherEmail: põe o primeiro nome, a empresa e quem envia", () => {
  const { assunto, texto } = preencherEmail(MODELOS_EMAIL[0], { nome: "Marta Silva", empresa: "Clínica Sol", eu: "Rui Costa" });
  assert.equal(assunto, "O seu pedido à Clínica Sol");
  assert.match(texto, /^Olá Marta,/);
  assert.match(texto, /Sou Rui, da Clínica Sol/);
  assert.doesNotMatch(texto, /\{/); // não ficou nada por preencher
});

test("linkEmail: assunto e texto codificados", () => {
  assert.equal(linkEmail("a@b.pt"), "mailto:a@b.pt");
  assert.equal(linkEmail("a@b.pt", "Olá & adeus", "linha 1\nlinha 2"), "mailto:a@b.pt?subject=Ol%C3%A1%20%26%20adeus&body=linha%201%0Alinha%202");
});
