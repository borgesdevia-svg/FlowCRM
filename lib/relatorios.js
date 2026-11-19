// Contas dos "Resultados" do Início (funções puras: recebem dados, devolvem números).

const DIA = 24 * 60 * 60 * 1000;

// Taxa de fecho: dos negócios já decididos (ganhos + perdidos), que percentagem foi ganha.
// Diferente da "Conversão" dos cartões (ativos ÷ todos), que conta também os que ainda
// estão a meio. null = ainda nenhum negócio decidido.
export function taxaFecho(ganhos, perdidos) {
  const decididos = ganhos + perdidos;
  return decididos ? Math.round((ganhos / decididos) * 100) : null;
}

// Tempo até fechar: dias desde que o cliente entrou até passar a Ativo pela PRIMEIRA vez.
// Recebe os eventos "Passou para Ativo" [{ cliente_id, criado_em, clientes: { criado_em } }]
// (de qualquer ordem) e devolve { media, mediana, n } em dias, ou null sem dados.
// Clientes importados ou criados já como Ativo não têm evento, por isso não contam.
export function tempoAteFechar(eventos) {
  const primeiro = new Map(); // cliente_id -> data do primeiro "Passou para Ativo"
  const entrada = new Map(); // cliente_id -> data de criação do cliente
  for (const e of eventos ?? []) {
    if (!e?.clientes?.criado_em) continue; // cliente apagado ou sem acesso
    const atual = primeiro.get(e.cliente_id);
    if (!atual || e.criado_em < atual) primeiro.set(e.cliente_id, e.criado_em);
    entrada.set(e.cliente_id, e.clientes.criado_em);
  }

  const dias = [...primeiro].map(([id, quando]) =>
    Math.max(0, (new Date(quando) - new Date(entrada.get(id))) / DIA)
  );
  if (dias.length === 0) return null;

  dias.sort((a, b) => a - b);
  const meio = Math.floor(dias.length / 2);
  const mediana = dias.length % 2 ? dias[meio] : (dias[meio - 1] + dias[meio]) / 2;
  const media = dias.reduce((a, b) => a + b, 0) / dias.length;
  return { media: Math.round(media), mediana: Math.round(mediana), n: dias.length };
}

// "0 dias", "1 dia", "12 dias"
export function textoDias(n) {
  return `${n} ${n === 1 ? "dia" : "dias"}`;
}
