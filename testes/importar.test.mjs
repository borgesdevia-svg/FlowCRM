// Testes da importação de clientes por CSV (lib/importar.js). Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { lerCsv, encontrarColunas, lerValor, lerEstado, prepararImportacao, MAX_LINHAS_IMPORTAR } from "../lib/importar.js";

const BOM = String.fromCharCode(0xfeff);

test("lerCsv: separador ; ou , e aspas", () => {
  assert.deepEqual(lerCsv("a;b\r\n1;2\r\n"), [["a", "b"], ["1", "2"]]);
  assert.deepEqual(lerCsv("a,b\n1,2"), [["a", "b"], ["1", "2"]]);
  assert.deepEqual(lerCsv('nome;obs\n"Silva; Lda";"diz ""olá"""'), [["nome", "obs"], ["Silva; Lda", 'diz "olá"']]);
  assert.deepEqual(lerCsv('a;b\n"linha\ncom quebra";2'), [["a", "b"], ["linha\ncom quebra", "2"]]);
});

test("lerCsv: tira o BOM e ignora linhas vazias", () => {
  assert.deepEqual(lerCsv(`${BOM}Nome\n\nAna\n;\n`), [["Nome"], ["Ana"]]);
});

test("encontrarColunas: títulos com acentos, maiúsculas e o formato do Exportar", () => {
  const col = encontrarColunas(["Nome", "E-mail", "Telemóvel", "Valor previsto (€)", "Fase", "Responsável"]);
  assert.deepEqual(col, { nome: 0, email: 1, telefone: 2, cidade: -1, valor_previsto: 3, estado: 4 });
});

test("lerValor: formato português e internacional", () => {
  assert.equal(lerValor("1.200,50 €"), 1200.5);
  assert.equal(lerValor("1200.50"), 1200.5);
  assert.equal(lerValor("2400,5"), 2400.5);
  assert.equal(lerValor(""), null);
  assert.ok(Number.isNaN(lerValor("abc")));
  assert.ok(Number.isNaN(lerValor("-5")));
});

test("lerEstado: chave, texto do CRM ou vazio", () => {
  assert.equal(lerEstado("Em negociação"), "negociacao");
  assert.equal(lerEstado("ATIVO"), "ativo");
  assert.equal(lerEstado(""), "novo");
  assert.equal(lerEstado("ganho"), null);
});

test("prepararImportacao: ficheiro que não serve", () => {
  assert.match(prepararImportacao("").erro, /vazio/);
  assert.match(prepararImportacao("Email;Telefone\na@b.pt;912345678").erro, /Nome/);
  assert.match(prepararImportacao("Nome;Email\nAna;a@b.pt").erro, /Telefone/);
  const grande = "Nome;Telefone\n" + "Ana;912345678\n".repeat(MAX_LINHAS_IMPORTAR + 1);
  assert.match(prepararImportacao(grande).erro, /máximo/);
});

test("prepararImportacao: válidos, inválidos e repetidos no ficheiro", () => {
  const csv = [
    "Nome;Email;Telefone;Valor previsto (€);Estado",
    "Ana;ANA@exemplo.pt;912345678;1500;Novo",
    ";x@y.pt;912345678;;", // sem nome
    "Rui;rui@;912345678;;", // email inválido
    "Bia;;;;", // sem telefone
    "Carla;ana@exemplo.pt;913333333;;", // email repetido (maiúsculas não contam)
    "Duarte;;'+351 913 333 333;abc;", // valor inválido
    "Eva;;'+351 914 444 444;2,5;Perdido", // apóstrofo do Exportar é tirado
  ].join("\n");
  const r = prepararImportacao(csv);
  assert.equal(r.erro, undefined);
  assert.deepEqual(
    r.clientes.map((c) => [c.linha, c.nome, c.email, c.telefone, c.valor_previsto, c.estado]),
    [
      [2, "Ana", "ana@exemplo.pt", "912345678", 1500, "novo"],
      [8, "Eva", null, "+351 914 444 444", 2.5, "perdido"],
    ]
  );
  assert.deepEqual(r.invalidos.map((i) => i.linha), [3, 4, 5, 7]);
  assert.deepEqual(r.repetidos, [{ linha: 6, email: "ana@exemplo.pt" }]);
});
