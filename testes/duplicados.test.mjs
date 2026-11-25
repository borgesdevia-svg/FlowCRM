// Testes dos leads duplicados (lib/duplicados.js). Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizarTelefone,
  mesmoTelefone,
  mesmoEmail,
  encontrarDuplicado,
  fimDoTelefone,
  escaparIlike,
} from "../lib/duplicados.js";

test("normalizarTelefone: só algarismos, sem o indicativo de Portugal", () => {
  assert.equal(normalizarTelefone("+351 912 345 678"), "912345678");
  assert.equal(normalizarTelefone("00351912345678"), "912345678");
  assert.equal(normalizarTelefone("912-345-678"), "912345678");
  assert.equal(normalizarTelefone("+44 20 7946 0958"), "442079460958"); // outros países ficam com o indicativo
  assert.equal(normalizarTelefone(null), "");
});

test("mesmoTelefone: ignora espaços e +351; números curtos nunca são iguais", () => {
  assert.equal(mesmoTelefone("912 345 678", "+351912345678"), true);
  assert.equal(mesmoTelefone("912 345 678", "912 345 679"), false);
  assert.equal(mesmoTelefone("123", "123"), false);
  assert.equal(mesmoTelefone("", ""), false);
});

test("mesmoEmail: sem maiúsculas nem espaços; vazio nunca é igual", () => {
  assert.equal(mesmoEmail("Marta@Exemplo.pt ", "marta@exemplo.pt"), true);
  assert.equal(mesmoEmail("marta@exemplo.pt", "marta@exemplo.com"), false);
  assert.equal(mesmoEmail("", ""), false);
  assert.equal(mesmoEmail(null, null), false);
});

test("encontrarDuplicado: email primeiro, depois telefone, e o próprio lead não conta", () => {
  const leads = [
    { id: "1", nome: "Marta Silva", email: "marta@exemplo.pt", telefone: "912 345 678" },
    { id: "2", nome: "Rui Pereira", email: null, telefone: "934 111 222" },
  ];
  assert.deepEqual(encontrarDuplicado({ email: "MARTA@exemplo.pt", telefone: "" }, leads), {
    id: "1",
    nome: "Marta Silva",
    campo: "email",
  });
  assert.deepEqual(encontrarDuplicado({ email: "", telefone: "+351 934111222" }, leads), {
    id: "2",
    nome: "Rui Pereira",
    campo: "telefone",
  });
  assert.equal(encontrarDuplicado({ email: "marta@exemplo.pt", telefone: "912345678" }, leads, "1"), null);
  assert.equal(encontrarDuplicado({ email: "novo@exemplo.pt", telefone: "961 000 000" }, leads), null);
});

test("fimDoTelefone e escaparIlike", () => {
  assert.equal(fimDoTelefone("912 345 678"), "678");
  assert.equal(fimDoTelefone("12"), null);
  assert.equal(escaparIlike("ana_costa%@x.pt"), "ana\\_costa\\%@x.pt");
});
