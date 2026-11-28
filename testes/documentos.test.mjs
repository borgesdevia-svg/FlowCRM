// Testes das regras dos Documentos (lib/documentos.js) e da conversão para WebP (lib/imagens.js).
// Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import {
  abreNoBrowser,
  categoriasDoPlano,
  formatarTamanho,
  lerCaminho,
  limparNome,
  nomeWebp,
  podeCategoria,
  tipoDoFicheiro,
} from "../lib/documentos.js";
import { paraWebp } from "../lib/imagens.js";

test("categorias: a Fatura só aparece no Pro", () => {
  assert.deepEqual(categoriasDoPlano(false).map((c) => c.chave), ["proposta", "contrato", "outro"]);
  assert.deepEqual(categoriasDoPlano(true).map((c) => c.chave), ["proposta", "contrato", "fatura", "outro"]);
  assert.equal(podeCategoria("fatura", false), false);
  assert.equal(podeCategoria("fatura", true), true);
  assert.equal(podeCategoria("outro", false), true);
  assert.equal(podeCategoria("inventada", true), false);
});

test("tipoDoFicheiro: aceita pelo tipo ou, se vier vazio, pela extensão", () => {
  assert.equal(tipoDoFicheiro("a.pdf", "application/pdf"), "application/pdf");
  assert.equal(tipoDoFicheiro("lista.CSV", ""), "text/csv");
  assert.equal(tipoDoFicheiro("foto.jpeg", "application/octet-stream"), "image/jpeg");
  assert.equal(tipoDoFicheiro("virus.exe", "application/x-msdownload"), null);
  assert.equal(tipoDoFicheiro("pagina.html", "text/html"), null);
});

test("abreNoBrowser: PDF e imagens abrem, o resto descarrega", () => {
  assert.equal(abreNoBrowser("application/pdf"), true);
  assert.equal(abreNoBrowser("image/webp"), true);
  assert.equal(abreNoBrowser("application/zip"), false);
});

test("limparNome: tira pastas e caracteres de controlo; corta mantendo a extensão", () => {
  assert.equal(limparNome("C:\\Users\\x\\fatura.pdf"), "fatura.pdf");
  assert.equal(limparNome("  a\u0000b.txt "), "ab.txt");
  assert.equal(limparNome(""), "documento");
  const longo = limparNome("x".repeat(300) + ".docx");
  assert.equal(longo.length, 200);
  assert.ok(longo.endsWith(".docx"));
});

test("nomeWebp: troca a extensão", () => {
  assert.equal(nomeWebp("Foto.JPG"), "Foto.webp");
  assert.equal(nomeWebp("sem-extensao"), "sem-extensao.webp");
});

test("formatarTamanho: em português", () => {
  assert.equal(formatarTamanho(500), "500 B");
  assert.equal(formatarTamanho(1536), "1,5 KB");
  assert.equal(formatarTamanho(200 * 1024 * 1024), "200 MB");
});

test("lerCaminho: só aceita <empresa>/<lead>/<id>.<ext>", () => {
  const e = "11111111-1111-1111-1111-111111111111";
  const c = "22222222-2222-2222-2222-222222222222";
  const d = "33333333-3333-3333-3333-333333333333";
  assert.deepEqual(lerCaminho(`${e}/${c}/${d}.pdf`), { empresaId: e, clienteId: c, id: d, ext: "pdf" });
  assert.equal(lerCaminho(`${e}/${c}/../${d}.pdf`), null);
  assert.equal(lerCaminho(`${e}/${d}.pdf`), null);
});

test("paraWebp: converte PNG para WebP e reduz ao máximo de 2000 px", async () => {
  const png = await sharp({ create: { width: 3000, height: 1500, channels: 3, background: "#3884f6" } }).png().toBuffer();
  const webp = await paraWebp(png);
  const meta = await sharp(webp).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 2000);
  assert.equal(meta.height, 1000);
});

test("paraWebp: imagens pequenas não são aumentadas", async () => {
  const jpg = await sharp({ create: { width: 300, height: 200, channels: 3, background: "#ffffff" } }).jpeg().toBuffer();
  const meta = await sharp(await paraWebp(jpg)).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 300);
});
