// Testes das funções de datas (lib/datas.js). Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hojeEmPortugal,
  formatarDiaCurto,
  tempoRelativo,
  urgenciaSemResponsavel,
  situacaoPrazo,
  prazoRelativo,
} from "../lib/datas.js";

const HORA = 3600000;

test("hojeEmPortugal: formato AAAA-MM-DD", () => {
  assert.match(hojeEmPortugal(), /^\d{4}-\d{2}-\d{2}$/);
});

test("formatarDiaCurto: dia e mês por extenso, sem fugir por causa do fuso", () => {
  assert.equal(formatarDiaCurto("2026-11-14"), "14 de novembro");
  assert.equal(formatarDiaCurto("2026-01-01"), "1 de janeiro");
});

test("tempoRelativo: frases curtas em português", () => {
  const agora = Date.now();
  assert.equal(tempoRelativo(new Date(agora - 10 * 1000)), "agora mesmo");
  assert.equal(tempoRelativo(new Date(agora - 5 * 60 * 1000)), "há 5 min");
  assert.equal(tempoRelativo(new Date(agora - 2 * HORA)), "há 2 h");
  assert.equal(tempoRelativo(new Date(agora - 24 * HORA)), "ontem");
  assert.equal(tempoRelativo(new Date(agora - 3 * 24 * HORA)), "há 3 dias");
});

test("urgenciaSemResponsavel: verde até 4 h, amarelo até 24 h, depois vermelho", () => {
  const agora = Date.parse("2026-11-19T12:00:00Z");
  const ha = (horas) => new Date(agora - horas * HORA).toISOString();
  assert.equal(urgenciaSemResponsavel(ha(1), agora), "verde");
  assert.equal(urgenciaSemResponsavel(ha(4), agora), "amarelo");
  assert.equal(urgenciaSemResponsavel(ha(23.9), agora), "amarelo");
  assert.equal(urgenciaSemResponsavel(ha(24), agora), "vermelho");
});

test("situacaoPrazo: atrasada, hoje ou nada", () => {
  const hoje = hojeEmPortugal();
  assert.equal(situacaoPrazo("2000-01-01", false), "atrasada");
  assert.equal(situacaoPrazo(hoje, false), "hoje");
  assert.equal(situacaoPrazo("2999-12-31", false), null);
  assert.equal(situacaoPrazo("2000-01-01", true), null);
  assert.equal(situacaoPrazo(null, false), null);
});

test("prazoRelativo: distância a hoje em palavras", () => {
  const hoje = "2026-11-19";
  assert.equal(prazoRelativo("2026-11-19", hoje), "hoje");
  assert.equal(prazoRelativo("2026-11-20", hoje), "amanhã");
  assert.equal(prazoRelativo("2026-11-18", hoje), "ontem");
  assert.equal(prazoRelativo("2026-11-16", hoje), "há 3 dias");
  assert.equal(prazoRelativo("2026-11-24", hoje), "daqui a 5 dias");
  // atravessa a mudança de mês
  assert.equal(prazoRelativo("2026-12-01", "2026-11-30"), "amanhã");
});
