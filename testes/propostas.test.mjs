// Testes das propostas e do WhatsApp (lib/propostas.js, lib/whatsapp.js). Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizarItens, calcularTotal, estadoProposta, lerNumero } from "../lib/propostas.js";
import { numeroWhatsapp, linkWhatsapp, preencherModelo } from "../lib/whatsapp.js";

test("números com vírgula ou ponto", () => {
  assert.equal(lerNumero("12,5"), 12.5);
  assert.equal(lerNumero(" 1 200.30 "), 1200.3);
  assert.ok(Number.isNaN(lerNumero("")));
});

test("itens: linhas vazias ignoradas, total calculado no servidor", () => {
  const { itens } = normalizarItens([
    { descricao: " Site  institucional ", quantidade: "1", preco: "900" },
    { descricao: "Manutenção mensal", quantidade: "12", preco: "25,5" },
    { descricao: "", quantidade: "1", preco: "" },
  ]);
  assert.equal(itens.length, 2);
  assert.equal(itens[0].descricao, "Site institucional");
  assert.equal(calcularTotal(itens), 1206);
});

test("itens inválidos dão erro", () => {
  assert.ok(normalizarItens([]).erro);
  assert.ok(normalizarItens([{ descricao: "", preco: "10" }]).erro);
  assert.ok(normalizarItens([{ descricao: "X", quantidade: "0", preco: "10" }]).erro);
  assert.ok(normalizarItens([{ descricao: "X", quantidade: "1", preco: "-1" }]).erro);
});

test("proposta enviada fora da validade fica expirada", () => {
  assert.equal(estadoProposta({ estado: "enviada", validade: "2026-01-01" }, "2026-02-01"), "expirada");
  assert.equal(estadoProposta({ estado: "aceite", validade: "2026-01-01" }, "2026-02-01"), "aceite");
  assert.equal(estadoProposta({ estado: "enviada", validade: null }, "2026-02-01"), "enviada");
});

test("WhatsApp: números portugueses ganham o 351", () => {
  assert.equal(numeroWhatsapp("912 345 678"), "351912345678");
  assert.equal(numeroWhatsapp("+351 912 345 678"), "351912345678");
  assert.equal(numeroWhatsapp("00447700900123"), "447700900123");
  assert.equal(numeroWhatsapp("123"), null);
  assert.equal(linkWhatsapp("912345678", "Olá Ana"), "https://wa.me/351912345678?text=Ol%C3%A1%20Ana");
});

test("WhatsApp: modelos com o primeiro nome", () => {
  assert.equal(
    preencherModelo("Olá {nome}, da {empresa}. {eu}", { nome: "Ana Costa", empresa: "Padaria", eu: "Rui Silva" }),
    "Olá Ana, da Padaria. Rui"
  );
});
