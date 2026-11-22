// Testes do design livre do formulário (lib/formularioDesign.js). Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizarDesign, DESIGN_PADRAO, variaveisDesign, atributosDesign } from "../lib/formularioDesign.js";

test("sem nada guardado: o design de sempre", () => {
  assert.deepEqual(normalizarDesign(null), DESIGN_PADRAO);
  assert.deepEqual(normalizarDesign("lixo"), DESIGN_PADRAO);
});

test("valores fora das listas são trocados pelo padrão", () => {
  const d = normalizarDesign({ disposicao: "dividido", fundo: "url(javascript:x)", cor: "azul", letra: "comic" });
  assert.equal(d.disposicao, "dividido");
  assert.equal(d.fundo, "claro");
  assert.equal(d.cor, "azul");
  assert.equal(d.letra, "moderna");
});

test("texto do botão: espaços limpos e no máximo 30 letras", () => {
  assert.equal(normalizarDesign({ botao: "  Quero   saber mais  " }).botao, "Quero saber mais");
  assert.equal(normalizarDesign({ botao: "x".repeat(50) }).botao.length, 30);
  assert.equal(normalizarDesign({ botao: 123 }).botao, "");
});

test("variáveis e atributos vêm sempre das listas", () => {
  const v = variaveisDesign({ cor: "rosa", cantos: "redondos" });
  assert.equal(v["--form-cor"], "#ec4899");
  assert.equal(v["--form-raio"], "24px");
  assert.equal(atributosDesign({ logo: "grande" })["data-logo"], "grande");
  assert.equal(atributosDesign({})["data-disposicao"], "folha");
});
