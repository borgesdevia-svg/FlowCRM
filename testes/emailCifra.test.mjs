// Testes da cifra das passwords (lib/email/cifra.js) e das regras das contas de e-mail
// (lib/email/servidores.js). Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.EMAIL_CHAVE = "a".repeat(64);
const { cifrar, decifrar } = await import("../lib/email/cifra.js");
const { dominioBloqueado, inicioDoDiaLisboa, limiteDia, eServidor, ePorta, traduzirErroLigacao } = await import(
  "../lib/email/servidores.js"
);

test("cifra: volta ao texto original, com acentos e espaços", () => {
  const p = "abcd efgh ijkl mnop çã€";
  const c = cifrar(p);
  assert.match(c, /^v1:[^:]+:[^:]+:[^:]+$/);
  assert.notEqual(c, p);
  assert.equal(decifrar(c), p);
});

test("cifra: o mesmo texto dá resultados diferentes (iv aleatório)", () => {
  assert.notEqual(cifrar("x"), cifrar("x"));
});

test("cifra: dados alterados ou outra chave falham", () => {
  const c = cifrar("segredo");
  const partes = c.split(":");
  partes[3] = Buffer.from("outra coisa").toString("base64");
  assert.throws(() => decifrar(partes.join(":")));
  process.env.EMAIL_CHAVE = "b".repeat(64);
  assert.throws(() => decifrar(c));
  process.env.EMAIL_CHAVE = "a".repeat(64);
});

test("cifra: sem chave dá um erro claro", () => {
  const antes = process.env.EMAIL_CHAVE;
  delete process.env.EMAIL_CHAVE;
  assert.throws(() => cifrar("x"), /EMAIL_CHAVE/);
  process.env.EMAIL_CHAVE = antes;
});

test("dominioBloqueado: contas pessoais da Microsoft", () => {
  for (const e of ["a@outlook.com", "a@hotmail.com", "a@hotmail.pt", "A@Live.com", "a@msn.com", "a@outlook.pt", "a@hotmail.co.uk"]) {
    assert.ok(dominioBloqueado(e), e);
  }
  for (const e of ["a@gmail.com", "rui@clinicasol.pt", "a@outlookbar.pt", "a@myhotmail.com"]) {
    assert.equal(dominioBloqueado(e), null, e);
  }
});

test("limiteDia: 100 no Essencial, 400 no Pro", () => {
  assert.equal(limiteDia(false), 100);
  assert.equal(limiteDia(true), 400);
});

test("inicioDoDiaLisboa: meia-noite de Lisboa (inverno e verão)", () => {
  // inverno: Lisboa = UTC
  assert.equal(inicioDoDiaLisboa(new Date("2026-11-27T15:00:00Z")), "2026-11-27T00:00:00.000Z");
  // verão: Lisboa = UTC+1, meia-noite de Lisboa = 23:00 UTC do dia anterior
  assert.equal(inicioDoDiaLisboa(new Date("2026-07-10T12:00:00Z")), "2026-07-09T23:00:00.000Z");
  // 23:30 UTC no verão já é o dia seguinte em Lisboa
  assert.equal(inicioDoDiaLisboa(new Date("2026-07-10T23:30:00Z")), "2026-07-10T23:00:00.000Z");
});

test("eServidor e ePorta", () => {
  assert.equal(eServidor("mail.empresa.pt"), true);
  assert.equal(eServidor("smtp.gmail.com"), true);
  assert.equal(eServidor("localhost"), false);
  assert.equal(eServidor("mail empresa.pt"), false);
  assert.equal(ePorta(465), true);
  assert.equal(ePorta("587"), true);
  assert.equal(ePorta(0), false);
  assert.equal(ePorta(70000), false);
});

test("traduzirErroLigacao: password errada e servidor inexistente", () => {
  assert.match(traduzirErroLigacao({ code: "EAUTH", responseCode: 535 }, "SMTP"), /password de aplicação/);
  assert.match(traduzirErroLigacao({ code: "ENOTFOUND" }, "IMAP"), /Não encontrámos o servidor IMAP/);
  assert.match(traduzirErroLigacao({ code: "ETIMEDOUT" }, "SMTP"), /não respondeu/);
});
