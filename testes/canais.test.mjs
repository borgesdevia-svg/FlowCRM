// Testes do canal do formulário (lib/canais.js). Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { limparCanal, nomeCanal } from "../lib/canais.js";

test("limparCanal: só letras, números e traços", () => {
  assert.equal(limparCanal("instagram"), "instagram");
  assert.equal(limparCanal("Instagram"), "instagram");
  assert.equal(limparCanal("Feira de Março!"), "feira-de-marco");
  assert.equal(limparCanal("  "), null);
  assert.equal(limparCanal(null), null);
  assert.equal(limparCanal("<script>"), "script");
  assert.equal(limparCanal("a".repeat(50)).length, 30);
  assert.match(limparCanal("x".repeat(29) + "-yy"), /^[a-z0-9-]{1,30}$/);
  assert.doesNotMatch(limparCanal("x".repeat(29) + "-yy"), /-$/); // não acaba em traço
});

test("nomeCanal: nomes conhecidos e os outros com maiúscula", () => {
  assert.equal(nomeCanal("tiktok"), "TikTok");
  assert.equal(nomeCanal("feira-de-marco"), "Feira de marco");
  assert.equal(nomeCanal(null), null);
});
