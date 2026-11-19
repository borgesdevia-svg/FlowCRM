// Testes dos estados dos clientes (lib/estados.js) e da aparência do painel (lib/aparencia.js).
// Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { ESTADOS, PROXIMOS_PASSOS, obterEstado } from "../lib/estados.js";
import { normalizarAparencia, itensDoMenu, cssAparencia, MENU, PADRAO, MAX_NOME_MENU } from "../lib/aparencia.js";

test("obterEstado: encontra pela chave e cai em 'Novo' se não existir", () => {
  assert.equal(obterEstado("ativo").texto, "Ativo");
  assert.equal(obterEstado("inventado").chave, "novo");
});

test("PROXIMOS_PASSOS: só leva para estados que existem", () => {
  const chaves = new Set(ESTADOS.map((e) => e.chave));
  for (const [de, passos] of Object.entries(PROXIMOS_PASSOS)) {
    assert.ok(chaves.has(de), de);
    for (const p of passos) assert.ok(chaves.has(p.para), `${de} -> ${p.para}`);
  }
});

test("normalizarAparencia: lixo volta ao padrão", () => {
  for (const bruto of [null, "texto", 42, {}, { modelo: "x", modo: "y", grafico: "z" }]) {
    const a = normalizarAparencia(bruto);
    assert.equal(a.modelo, PADRAO.modelo);
    assert.equal(a.modo, PADRAO.modo);
    assert.equal(a.grafico, PADRAO.grafico);
    assert.equal(a.menu.principal.length, MENU.principal.length);
    assert.equal(a.menu.empresa.length, MENU.empresa.length);
  }
});

test("normalizarAparencia: menu respeita a ordem e os nomes, sem repetidos nem itens inventados", () => {
  const a = normalizarAparencia({
    menu: {
      principal: [
        { id: "tarefas", nome: "  As   minhas tarefas " },
        { id: "tarefas", nome: "Repetido" },
        { id: "hacker", nome: "Não existe" },
        { id: "clientes", nome: "" },
      ],
    },
  });
  const ids = a.menu.principal.map((i) => i.id);
  assert.deepEqual(ids.slice(0, 2), ["tarefas", "clientes"]);
  assert.equal(new Set(ids).size, MENU.principal.length);
  assert.ok(!ids.includes("hacker"));
  assert.equal(a.menu.principal[0].nome, "As minhas tarefas");
  assert.equal(a.menu.principal[1].nome, "Leads"); // nome vazio volta ao padrão
});

test("normalizarAparencia: nomes do menu cortados no máximo", () => {
  const a = normalizarAparencia({ menu: { principal: [{ id: "painel", nome: "x".repeat(100) }] } });
  assert.equal(a.menu.principal[0].nome.length, MAX_NOME_MENU);
});

test("itensDoMenu: junta o link fixo ao nome escolhido", () => {
  const a = normalizarAparencia({ menu: { principal: [{ id: "pipeline", nome: "Funil" }] } });
  const [primeiro] = itensDoMenu(a, "principal");
  assert.equal(primeiro.nome, "Funil");
  assert.equal(primeiro.href, "/painel/pipeline");
});

test("cssAparencia: só gera CSS a partir das listas fixas", () => {
  const css = cssAparencia(normalizarAparencia({ modelo: "</style><script>", modo: "claro" }));
  assert.ok(!css.includes("<"));
  assert.match(css, /^:root\{.*\}\.painel-lateral\{.*\}$/);
});

test("normalizarAparencia: nomes de origem antigos guardados passam aos novos", () => {
  const a = normalizarAparencia({ menu: { principal: [{ id: "painel", nome: "Painel" }, { id: "clientes", nome: "Clientes" }] } });
  assert.equal(a.menu.principal[0].nome, "Visão geral");
  assert.equal(a.menu.principal[1].nome, "Leads");
});
