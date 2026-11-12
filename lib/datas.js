// Funções auxiliares para datas sem hora (ex.: data limite de uma tarefa, "2026-11-14").

// Data de hoje no formato "AAAA-MM-DD", no fuso horário de Portugal.
// (o servidor pode estar noutro país; assim "hoje" é sempre o dia em Portugal)
export function hojeEmPortugal() {
  // o formato "en-CA" escreve as datas como AAAA-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
}

// "2026-11-14" -> "14 de novembro"  (timeZone UTC para o dia não "fugir" por causa do fuso)
export function formatarDiaCurto(dataISO) {
  return new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(dataISO)
  );
}

// Tempo relativo em português: "agora mesmo", "há 5 min", "há 2 h", "há 3 dias", "12 nov."
export function tempoRelativo(data) {
  const segundos = Math.round((Date.now() - new Date(data).getTime()) / 1000);
  if (segundos < 60) return "agora mesmo";
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.round(horas / 24);
  if (dias < 7) return dias === 1 ? "ontem" : `há ${dias} dias`;
  // mais de uma semana: mostra a data
  return new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short", timeZone: "Europe/Lisbon" }).format(
    new Date(data)
  );
}

// Situação do prazo de uma tarefa: "atrasada", "hoje" ou null
export function situacaoPrazo(dataLimite, concluida) {
  if (!dataLimite || concluida) return null;
  const hoje = hojeEmPortugal();
  // as datas AAAA-MM-DD podem comparar-se como texto ("2026-11-13" < "2026-11-14")
  if (dataLimite < hoje) return "atrasada";
  if (dataLimite === hoje) return "hoje";
  return null;
}
