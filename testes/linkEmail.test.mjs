// Testes do link do botão Email e do texto pré-escrito (lib/linkEmail.js). Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { linkGmail, preencherTextoEmail, saudacao } from "../lib/linkEmail.js";

test("linkGmail: abre a janela de escrever com o destinatário", () => {
  assert.equal(linkGmail("marta@exemplo.pt"), "https://mail.google.com/mail/?view=cm&fs=1&to=marta%40exemplo.pt");
});

test("linkGmail: o '+' do email não se perde", () => {
  assert.match(linkGmail("ana+crm@x.pt"), /to=ana%2Bcrm%40x\.pt$/);
});

test("linkGmail: o texto vai no body, com acentos e mudanças de linha codificados", () => {
  assert.equal(
    linkGmail("a@b.pt", "Olá\nAté já"),
    "https://mail.google.com/mail/?view=cm&fs=1&to=a%40b.pt&body=Ol%C3%A1%0AAt%C3%A9%20j%C3%A1",
  );
});

test("saudacao: muda com a hora de Portugal (inverno = UTC)", () => {
  assert.equal(saudacao(new Date("2026-01-15T09:00:00Z")), "Bom dia");
  assert.equal(saudacao(new Date("2026-01-15T12:00:00Z")), "Boa tarde");
  assert.equal(saudacao(new Date("2026-01-15T21:30:00Z")), "Boa noite");
  assert.equal(saudacao(new Date("2026-01-15T03:00:00Z")), "Boa noite");
});

test("saudacao: no verão Portugal está uma hora à frente do UTC", () => {
  // 11:30 UTC em julho = 12:30 em Lisboa
  assert.equal(saudacao(new Date("2026-07-15T11:30:00Z")), "Boa tarde");
});

test("preencherTextoEmail: preenche todas as variáveis", () => {
  const texto = preencherTextoEmail("{saudacao}, {nome}.\nAqui fala o {eu}, da {empresa}.", {
    nome: "Marta Silva",
    empresa: "Clínica Sol",
    eu: "Rui Costa",
    data: new Date("2026-01-15T15:00:00Z"),
  });
  assert.equal(texto, "Boa tarde, Marta.\nAqui fala o Rui, da Clínica Sol.");
});

test("preencherTextoEmail: sem texto pré-escrito devolve vazio", () => {
  assert.equal(preencherTextoEmail(null, { nome: "Marta" }), "");
  assert.equal(preencherTextoEmail("", { nome: "Marta" }), "");
});
