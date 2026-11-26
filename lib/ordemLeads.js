// Ordens possíveis da lista de leads (?ordem=...). A primeira é a de sempre.
// "coluna" e "ascendente" vão direto para o .order() do Supabase.
export const ORDENS_LEADS = [
  { chave: "recentes", texto: "Mais recentes", coluna: "criado_em", ascendente: false },
  { chave: "antigos", texto: "Mais antigos", coluna: "criado_em", ascendente: true },
  { chave: "valor", texto: "Maior valor", coluna: "valor_previsto", ascendente: false },
  { chave: "nome", texto: "Nome (A–Z)", coluna: "nome", ascendente: true },
];

// devolve a ordem pedida, ou a de sempre se o valor do URL não for conhecido
export function obterOrdem(chave) {
  return ORDENS_LEADS.find((o) => o.chave === chave) ?? ORDENS_LEADS[0];
}
