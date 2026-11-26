// Testes das validações partilhadas (lib/validacao.js). Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { eEmail, eSlug, eTelefone, eUuid, lerLink } from "../lib/validacao.js";

test("eUuid: aceita ids do Supabase e recusa o resto", () => {
  assert.equal(eUuid("3f2a9c1e-8b7d-4e6f-9a1b-2c3d4e5f6a7b"), true);
  assert.equal(eUuid("3F2A9C1E-8B7D-4E6F-9A1B-2C3D4E5F6A7B"), true);
  assert.equal(eUuid("------------------------------------"), false); // 36 traços passavam no regex antigo
  assert.equal(eUuid("3f2a9c1e-8b7d-4e6f-9a1b-2c3d4e5f6a7"), false);
  assert.equal(eUuid("' or 1=1 --"), false);
  assert.equal(eUuid(""), false);
  assert.equal(eUuid(null), false);
  assert.equal(eUuid(123), false);
});

test("eSlug: a mesma regra da base de dados", () => {
  assert.equal(eSlug("padaria-central"), true);
  assert.equal(eSlug("loja2"), true);
  assert.equal(eSlug("Padaria"), false);
  assert.equal(eSlug("-padaria"), false);
  assert.equal(eSlug("padaria--central"), false);
  assert.equal(eSlug("../admin"), false);
  assert.equal(eSlug("a".repeat(81)), false);
  assert.equal(eSlug(undefined), false);
});

test("eEmail: aceita emails reais e recusa o resto", () => {
  for (const bom of ["ana@empresa.pt", "ana.silva+crm@empresa.com.br", "x@sub.dominio.io", "joao_1@gmail.com", "rui@café.pt", "a@b.online"]) {
    assert.equal(eEmail(bom), true, bom);
  }
  for (const mau of ["João", "ana@", "@empresa.pt", "ana@empresa", "ana@empresa.", "ana@@x.pt", "ana@.pt", "a..b@x.pt", ".a@x.pt", "ana@x.p", "ana@x.p1", "ana silva@x.pt", "ana@-x.pt", "", null]) {
    assert.equal(eEmail(mau), false, String(mau));
  }
});

test("eTelefone: números com 6 a 15 algarismos", () => {
  for (const bom of ["912 345 678", "+351 912 345 678", "(21) 123-4567", "00351912345678", "212.345.678"]) {
    assert.equal(eTelefone(bom), true, bom);
  }
  for (const mau of ["((((((", "------", "12345", "91234567a", "+351+912345678", "1".repeat(16), "", null]) {
    assert.equal(eTelefone(mau), false, String(mau));
  }
});

test("lerLink: aceita sites com ou sem https e recusa texto solto", () => {
  assert.equal(lerLink("empresa.pt"), "https://empresa.pt/");
  assert.equal(lerLink("www.empresa.pt/loja"), "https://www.empresa.pt/loja");
  assert.equal(lerLink("http://x.com"), "http://x.com/");
  for (const mau of ["João", "empresa", "empresa.", "javascript:alert(1)", "https://localhost", "a b.pt", ""]) {
    assert.equal(lerLink(mau), null, mau);
  }
});
