// Estados possíveis de um cliente, num só sítio (usados na lista, no formulário e no painel).
// "chave" é o valor guardado na base de dados; "texto" é o que o utilizador vê.
// As cores vêm das variáveis CSS definidas em app/globals.css.
export const ESTADOS = [
  { chave: "novo", texto: "Novo", cor: "var(--cor-estado-novo)" },
  { chave: "negociacao", texto: "Em negociação", cor: "var(--cor-estado-negociacao)" },
  { chave: "ativo", texto: "Ativo", cor: "var(--cor-estado-ativo)" },
  { chave: "perdido", texto: "Perdido", cor: "var(--cor-estado-perdido)" },
];

// Para cada estado, que botões de "mudar de fase" aparecem (no pipeline e na ficha)
// e para que estado levam. "principal" = o passo natural seguinte, que fica em destaque.
export const PROXIMOS_PASSOS = {
  novo: [
    { para: "negociacao", texto: "Passar a negociação", principal: true },
    { para: "perdido", texto: "Perdido" },
  ],
  negociacao: [
    { para: "ativo", texto: "Fechar negócio", principal: true },
    { para: "perdido", texto: "Perdido" },
  ],
  ativo: [{ para: "negociacao", texto: "Reabrir negociação" }],
  perdido: [{ para: "novo", texto: "Reabrir" }],
};

// procura um estado pela chave (ex.: "ativo" -> { texto: "Ativo", ... })
export function obterEstado(chave) {
  return ESTADOS.find((e) => e.chave === chave) ?? ESTADOS[0];
}

// formatar valores para português de Portugal
export const formatarEuros = (valor) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(valor);

export const formatarData = (data) =>
  new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short", year: "numeric" }).format(new Date(data));
