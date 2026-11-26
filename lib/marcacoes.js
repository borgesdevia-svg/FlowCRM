// Marcações online (migração 36): horários livres, sempre na hora de Portugal.
// Funções puras (sem base de dados), usadas no servidor e testadas com npm test.
//
// Um "dia" é um texto "AAAA-MM-DD" e uma hora é "HH:MM", sempre em Portugal continental
// (Europe/Lisbon). Os instantes guardados na base de dados são em UTC: instanteLisboa()
// faz a conversão e trata da mudança da hora (março e outubro).

export const FUSO = "Europe/Lisbon";
export const DURACOES = [15, 20, 30, 45, 60, 90, 120];
export const NOMES_DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const CONFIG_PADRAO = {
  ligada: false,
  dias: [1, 2, 3, 4, 5],
  hora_inicio: "09:00",
  hora_fim: "18:00",
  duracao: 30,
  antecedencia_horas: 2,
  dias_frente: 30,
};

// "09:00:00" ou "9:00" -> 540 (minutos desde a meia-noite); lixo -> NaN
export function minutos(hora) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hora ?? ""));
  if (!m) return NaN;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  return h <= 23 && mi <= 59 ? h * 60 + mi : NaN;
}

// 540 -> "09:00"
export function textoHora(min) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

// diferença (em minutos) entre a hora de Portugal e a UTC nesse instante: 0 no inverno, 60 no verão
function desvioLisboa(data) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: FUSO,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(data)
      .map((p) => [p.type, p.value]),
  );
  const comoUtc = Date.UTC(+partes.year, +partes.month - 1, +partes.day, +partes.hour, +partes.minute);
  return Math.round((comoUtc - Math.floor(data.getTime() / 60000) * 60000) / 60000);
}

// "2026-12-02" + 540 (09:00 em Portugal) -> Date (o instante certo, em UTC)
export function instanteLisboa(dia, minutosDoDia) {
  const [a, m, d] = dia.split("-").map(Number);
  const comoUtc = Date.UTC(a, m - 1, d, 0, minutosDoDia);
  let instante = comoUtc - desvioLisboa(new Date(comoUtc)) * 60000;
  // perto da mudança da hora o desvio pode ser outro: confirma com o instante já corrigido
  const desvio2 = desvioLisboa(new Date(instante));
  instante = comoUtc - desvio2 * 60000;
  return new Date(instante);
}

// dia da semana de "AAAA-MM-DD" (0 = domingo)
export function diaDaSemana(dia) {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

// "2026-12-30" + 3 -> "2027-01-02"
export function somarDias(dia, n) {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}

// o dia de hoje em Portugal, num instante qualquer (para os testes poderem escolher o "agora")
export function diaEmLisboa(instante) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date(instante));
}

// Limpa o horário vindo da base de dados (ou do formulário do admin): valores estranhos voltam ao padrão.
export function normalizarConfig(bruto) {
  const c = bruto ?? {};
  const dias = Array.isArray(c.dias) ? [...new Set(c.dias.map(Number))].filter((d) => d >= 0 && d <= 6).sort() : [];
  let inicio = minutos(c.hora_inicio);
  let fim = minutos(c.hora_fim);
  if (Number.isNaN(inicio) || Number.isNaN(fim) || fim <= inicio) {
    inicio = minutos(CONFIG_PADRAO.hora_inicio);
    fim = minutos(CONFIG_PADRAO.hora_fim);
  }
  const numero = (v, min, max, padrao) => (Number.isInteger(Number(v)) && v !== null && v !== "" && +v >= min && +v <= max ? +v : padrao);
  return {
    ligada: Boolean(c.ligada),
    dias: dias.length ? dias : CONFIG_PADRAO.dias,
    hora_inicio: textoHora(inicio),
    hora_fim: textoHora(fim),
    duracao: DURACOES.includes(Number(c.duracao)) ? Number(c.duracao) : CONFIG_PADRAO.duracao,
    antecedencia_horas: numero(c.antecedencia_horas, 0, 168, CONFIG_PADRAO.antecedencia_horas),
    dias_frente: numero(c.dias_frente, 1, 90, CONFIG_PADRAO.dias_frente),
  };
}

// O horário quando é a EQUIPA a marcar (na ficha do lead): os mesmos dias e horas, mas sem
// antecedência mínima, até 90 dias à frente e mesmo com a página pública desligada.
export function configDaEquipa(bruto) {
  return { ...normalizarConfig(bruto), ligada: true, antecedencia_horas: 0, dias_frente: 90 };
}

// Horários livres de UM dia: [{ inicio: ISO, fim: ISO, hora: "09:30" }].
//  - só nos dias da semana escolhidos e até "dias_frente" dias a contar de hoje;
//  - de hora_inicio em hora_inicio + duração, sem passar da hora_fim;
//  - pelo menos "antecedencia_horas" depois de agora;
//  - sem sobrepor marcações já feitas ("ocupados": [{ inicio, fim }] em ISO).
export function horariosDoDia({ config, dia, ocupados = [], agora = Date.now() }) {
  const c = normalizarConfig(config);
  const hoje = diaEmLisboa(agora);
  if (dia < hoje || dia > somarDias(hoje, c.dias_frente)) return [];
  if (!c.dias.includes(diaDaSemana(dia))) return [];

  const limite = agora + c.antecedencia_horas * 3600000;
  const ocupadosMs = ocupados.map((o) => [new Date(o.inicio).getTime(), new Date(o.fim).getTime()]);
  const livres = [];
  for (let m = minutos(c.hora_inicio); m + c.duracao <= minutos(c.hora_fim); m += c.duracao) {
    const inicio = instanteLisboa(dia, m).getTime();
    const fim = inicio + c.duracao * 60000;
    if (inicio < limite) continue;
    if (ocupadosMs.some(([oi, of]) => inicio < of && fim > oi)) continue;
    livres.push({ inicio: new Date(inicio).toISOString(), fim: new Date(fim).toISOString(), hora: textoHora(m) });
  }
  return livres;
}

// Todos os dias com pelo menos uma hora livre: [{ dia, horarios: [...] }], de hoje até "dias_frente".
export function diasComHorarios({ config, ocupados = [], agora = Date.now() }) {
  const c = normalizarConfig(config);
  const hoje = diaEmLisboa(agora);
  const resultado = [];
  for (let i = 0; i <= c.dias_frente; i++) {
    const dia = somarDias(hoje, i);
    const horarios = horariosDoDia({ config: c, dia, ocupados, agora });
    if (horarios.length) resultado.push({ dia, horarios });
  }
  return resultado;
}

// Confirma, no servidor, que o instante escolhido é mesmo um dos horários livres (nunca confiar no browser).
// Devolve o horário { inicio, fim, hora } ou null.
export function horarioValido({ config, inicio, ocupados = [], agora = Date.now() }) {
  const data = new Date(inicio);
  if (Number.isNaN(data.getTime())) return null;
  const dia = diaEmLisboa(data);
  return horariosDoDia({ config, dia, ocupados, agora }).find((h) => h.inicio === data.toISOString()) ?? null;
}

// "terça-feira, 2 de dezembro às 15:30"
export function textoMarcacao(inicio) {
  const data = new Date(inicio);
  const dia = new Intl.DateTimeFormat("pt-PT", { timeZone: FUSO, weekday: "long", day: "numeric", month: "long" }).format(data);
  const hora = new Intl.DateTimeFormat("pt-PT", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(data);
  return `${dia} às ${hora}`;
}

// ---------- adicionar ao calendário ----------
// "2026-12-02T09:30:00.000Z" -> "20261202T093000Z" (formato dos calendários)
function dataIcs(iso) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// texto seguro dentro de um .ics: barras, vírgulas, pontos e vírgulas e mudanças de linha escapados
function textoIcs(texto) {
  return String(texto ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/([,;])/g, "\\$1")
    .replace(/\r?\n/g, "\\n");
}

// Ficheiro .ics com a reunião (abre no calendário do iPhone, Android, Outlook, Google...).
// "id" deve ser único (ex.: o instante + a empresa) para o calendário não duplicar.
export function ficheiroIcs({ id, inicio, fim, titulo, descricao = "", agora = Date.now() }) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FlowCRM//Marcacoes//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${textoIcs(id)}@flowcrm`,
    `DTSTAMP:${dataIcs(agora)}`,
    `DTSTART:${dataIcs(inicio)}`,
    `DTEND:${dataIcs(fim)}`,
    `SUMMARY:${textoIcs(titulo)}`,
    ...(descricao ? [`DESCRIPTION:${textoIcs(descricao)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

// link para criar o evento no Google Calendar (abre no browser, sem descarregar nada)
export function linkGoogleCalendar({ inicio, fim, titulo, descricao = "" }) {
  const p = new URLSearchParams({ action: "TEMPLATE", text: titulo, dates: `${dataIcs(inicio)}/${dataIcs(fim)}`, details: descricao });
  return `https://calendar.google.com/calendar/render?${p}`;
}
