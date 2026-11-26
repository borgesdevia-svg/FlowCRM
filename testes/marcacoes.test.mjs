// Testes das marcações online (lib/marcacoes.js). Correr com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  diaDaSemana,
  diaEmLisboa,
  diasComHorarios,
  horarioValido,
  horariosDoDia,
  instanteLisboa,
  minutos,
  normalizarConfig,
  somarDias,
  textoMarcacao,
} from "../lib/marcacoes.js";

test("instanteLisboa: inverno, verão e os dias da mudança da hora", () => {
  assert.equal(instanteLisboa("2026-12-02", 9 * 60).toISOString(), "2026-12-02T09:00:00.000Z"); // inverno: UTC+0
  assert.equal(instanteLisboa("2026-07-15", 9 * 60).toISOString(), "2026-07-15T08:00:00.000Z"); // verão: UTC+1
  // 28/3/2027: às 01:00 passa a 02:00
  assert.equal(instanteLisboa("2027-03-28", 30).toISOString(), "2027-03-28T00:30:00.000Z");
  assert.equal(instanteLisboa("2027-03-28", 3 * 60).toISOString(), "2027-03-28T02:00:00.000Z");
  // 25/10/2026: às 02:00 volta a 01:00
  assert.equal(instanteLisboa("2026-10-25", 12 * 60).toISOString(), "2026-10-25T12:00:00.000Z");
  assert.equal(instanteLisboa("2026-10-24", 12 * 60).toISOString(), "2026-10-24T11:00:00.000Z");
});

test("datas: dia da semana, somar dias, dia em Lisboa", () => {
  assert.equal(diaDaSemana("2026-12-02"), 3); // quarta
  assert.equal(somarDias("2026-12-30", 3), "2027-01-02");
  // 23:30 UTC de 30 de junho já é 1 de julho em Lisboa (UTC+1)
  assert.equal(diaEmLisboa(Date.parse("2026-06-30T23:30:00Z")), "2026-07-01");
  assert.equal(minutos("09:30:00"), 570);
  assert.ok(Number.isNaN(minutos("25:00")));
});

const config = { ligada: true, dias: [1, 2, 3, 4, 5], hora_inicio: "09:00:00", hora_fim: "12:00:00", duracao: 30, antecedencia_horas: 2, dias_frente: 14 };

test("horariosDoDia: de meia em meia hora, sem ocupados nem fins de semana", () => {
  const agora = Date.parse("2026-12-01T10:00:00Z"); // terça
  const quarta = horariosDoDia({ config, dia: "2026-12-02", agora });
  assert.deepEqual(quarta.map((h) => h.hora), ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]);
  assert.equal(quarta[0].inicio, "2026-12-02T09:00:00.000Z");
  assert.equal(quarta[0].fim, "2026-12-02T09:30:00.000Z");

  const ocupados = [{ inicio: "2026-12-02T10:00:00Z", fim: "2026-12-02T10:30:00Z" }];
  assert.deepEqual(horariosDoDia({ config, dia: "2026-12-02", ocupados, agora }).map((h) => h.hora), ["09:00", "09:30", "10:30", "11:00", "11:30"]);
  assert.deepEqual(horariosDoDia({ config, dia: "2026-12-05", agora }), []); // sábado
  assert.deepEqual(horariosDoDia({ config, dia: "2026-11-30", agora }), []); // passado
  assert.deepEqual(horariosDoDia({ config, dia: "2026-12-31", agora }), []); // além dos 14 dias
});

test("horariosDoDia: antecedência mínima", () => {
  const agora = Date.parse("2026-12-02T09:10:00Z"); // quarta, 09:10 em Lisboa; com 2 h, só a partir das 11:10
  assert.deepEqual(horariosDoDia({ config, dia: "2026-12-02", agora }).map((h) => h.hora), ["11:30"]);
});

test("horarioValido: só aceita um dos horários livres", () => {
  const agora = Date.parse("2026-12-01T10:00:00Z");
  assert.equal(horarioValido({ config, inicio: "2026-12-02T09:30:00.000Z", agora })?.hora, "09:30");
  assert.equal(horarioValido({ config, inicio: "2026-12-02T09:15:00.000Z", agora }), null); // fora da grelha
  assert.equal(horarioValido({ config, inicio: "2026-12-05T09:00:00.000Z", agora }), null); // sábado
  assert.equal(horarioValido({ config, inicio: "lixo", agora }), null);
  const ocupados = [{ inicio: "2026-12-02T09:30:00Z", fim: "2026-12-02T10:00:00Z" }];
  assert.equal(horarioValido({ config, inicio: "2026-12-02T09:30:00.000Z", ocupados, agora }), null); // já marcado
});

test("diasComHorarios e normalizarConfig", () => {
  const agora = Date.parse("2026-12-01T10:00:00Z");
  const dias = diasComHorarios({ config: { ...config, dias_frente: 7 }, agora });
  // terça (hoje, já passa das 09:00+2h? 10:00 + 2h = 12:00: nada) .. terça seguinte; sem fim de semana
  assert.deepEqual(dias.map((d) => d.dia), ["2026-12-02", "2026-12-03", "2026-12-04", "2026-12-07", "2026-12-08"]);
  const limpo = normalizarConfig({ dias: [9, 1, 1], hora_inicio: "18:00", hora_fim: "09:00", duracao: 7, dias_frente: 500 });
  assert.deepEqual(limpo.dias, [1]);
  assert.equal(limpo.hora_inicio, "09:00"); // fim antes do início: volta ao padrão
  assert.equal(limpo.duracao, 30);
  assert.equal(limpo.dias_frente, 30);
});

test("textoMarcacao: em português, na hora de Lisboa", () => {
  assert.equal(textoMarcacao("2026-07-15T14:30:00Z"), "quarta-feira, 15 de julho às 15:30");
});

test("ficheiroIcs e linkGoogleCalendar", async () => {
  const { ficheiroIcs, linkGoogleCalendar } = await import("../lib/marcacoes.js");
  const ics = ficheiroIcs({
    id: "abc",
    inicio: "2026-12-02T09:30:00.000Z",
    fim: "2026-12-02T10:00:00.000Z",
    titulo: "Reunião com Clínica Sol, Lda",
    descricao: "Linha 1\nLinha 2; fim",
    agora: Date.parse("2026-11-26T20:00:00Z"),
  });
  assert.ok(ics.includes("DTSTART:20261202T093000Z\r\n"));
  assert.ok(ics.includes("DTEND:20261202T100000Z\r\n"));
  assert.ok(ics.includes("SUMMARY:Reunião com Clínica Sol\\, Lda\r\n"));
  assert.ok(ics.includes("DESCRIPTION:Linha 1\\nLinha 2\\; fim\r\n"));
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n") && ics.endsWith("END:VCALENDAR\r\n"));
  const link = new URL(linkGoogleCalendar({ inicio: "2026-12-02T09:30:00.000Z", fim: "2026-12-02T10:00:00.000Z", titulo: "Reunião" }));
  assert.equal(link.searchParams.get("dates"), "20261202T093000Z/20261202T100000Z");
  assert.equal(link.searchParams.get("text"), "Reunião");
});

test("configDaEquipa: sem antecedência e até 90 dias, mesmo desligada", async () => {
  const { configDaEquipa, horariosDoDia } = await import("../lib/marcacoes.js");
  const c = configDaEquipa({ ...config, ligada: false });
  assert.equal(c.ligada, true);
  assert.equal(c.antecedencia_horas, 0);
  assert.equal(c.dias_frente, 90);
  const agora = Date.parse("2026-12-02T09:10:00Z"); // quarta 09:10: a equipa ainda pode marcar às 09:30
  assert.deepEqual(horariosDoDia({ config: c, dia: "2026-12-02", agora }).map((h) => h.hora), ["09:30", "10:00", "10:30", "11:00", "11:30"]);
});
