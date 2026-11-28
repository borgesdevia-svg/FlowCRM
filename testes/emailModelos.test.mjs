// Testes dos modelos de e-mail e da montagem do texto da janela (lib/emailModelos.js). Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { assuntoResposta, montarTexto, textoDoEmail, validarModelo, SUGESTOES } from "../lib/emailModelos.js";

test("montarTexto: início, linha em branco para escrever e assinatura", () => {
  assert.equal(montarTexto({ inicio: "Olá.", assinatura: "Rui" }), "Olá.\n\n\n\nRui");
});

test("montarTexto: com modelo, o modelo fica entre o início e a assinatura", () => {
  assert.equal(montarTexto({ inicio: "Olá.", meio: "Segue a proposta.", assinatura: "Rui" }), "Olá.\n\nSegue a proposta.\n\nRui");
});

test("montarTexto: sem assinatura deixa espaço para escrever depois do início", () => {
  assert.equal(montarTexto({ inicio: "Olá." }), "Olá.\n\n");
  assert.equal(montarTexto({}), "");
});

test("montarTexto: sem início, começa no modelo ou na linha em branco", () => {
  assert.equal(montarTexto({ meio: "Texto", assinatura: "Rui" }), "Texto\n\nRui");
  assert.equal(montarTexto({ assinatura: "Rui" }), "\n\nRui");
});

test("textoDoEmail: preenche as variáveis no início e no modelo", () => {
  const texto = textoDoEmail({
    inicio: "{saudacao}, {nome}.",
    modelo: "Aqui fala o {eu}, da {empresa}.",
    assinatura: "--\nRui",
    nome: "Marta Silva",
    empresa: "Clínica Sol",
    eu: "Rui Borges",
    data: new Date("2026-11-27T15:00:00Z"),
  });
  assert.equal(texto, "Boa tarde, Marta.\n\nAqui fala o Rui, da Clínica Sol.\n\n--\nRui");
});

test("assuntoResposta: põe Re: sem duplicar", () => {
  assert.equal(assuntoResposta("Proposta"), "Re: Proposta");
  assert.equal(assuntoResposta("Re: Proposta"), "Re: Proposta");
  assert.equal(assuntoResposta("RE: re:Proposta"), "Re: Proposta");
  assert.equal(assuntoResposta("Fwd: Proposta"), "Re: Proposta");
  assert.equal(assuntoResposta(""), "Re: (sem assunto)");
});

test("validarModelo: obriga a nome e texto e limpa espaços", () => {
  assert.equal(validarModelo({ nome: " ", corpo: "x" }).erro, "Dá um nome ao modelo.");
  assert.equal(validarModelo({ nome: "A", corpo: "  " }).erro, "Escreve o texto do modelo.");
  assert.deepEqual(validarModelo({ nome: "  Olá   mundo ", assunto: " a ", corpo: " b\r\nc " }).valores, {
    nome: "Olá mundo",
    assunto: "a",
    corpo: "b\nc",
  });
  assert.match(validarModelo({ nome: "x".repeat(81), corpo: "y" }).erro, /nome é demasiado longo/);
});

test("SUGESTOES: são válidas", () => {
  for (const s of SUGESTOES) assert.equal(validarModelo(s).erro, undefined);
});
