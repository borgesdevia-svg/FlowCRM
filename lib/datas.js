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

// Situação do prazo de uma tarefa: "atrasada", "hoje" ou null
export function situacaoPrazo(dataLimite, concluida) {
  if (!dataLimite || concluida) return null;
  const hoje = hojeEmPortugal();
  // as datas AAAA-MM-DD podem comparar-se como texto ("2026-11-13" < "2026-11-14")
  if (dataLimite < hoje) return "atrasada";
  if (dataLimite === hoje) return "hoje";
  return null;
}
