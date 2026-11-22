// Planos do FlowCRM (decididos a 2026-11-22). O preço é por empresa.
// Na base de dados (migrações 24 e 29): empresas.plano ('essencial' | 'pro') e empresas.teste_ate.
//   teste_ate no futuro  -> a experimentar o Pro (14 dias ao registar)
//   teste_ate no passado -> BLOQUEADA: o teste acabou (ou a assinatura foi cancelada) sem pagar
//   teste_ate vazio      -> plano pago, o da coluna "plano" (mudado pela Stripe: lib/pagamentos.js)
// As automações, o design/logótipo do formulário e as propostas também são travados na base
// de dados (privado.tem_pro), e o bloqueio também (privado.minha_empresa_ativa); aqui decide-se
// o que o site mostra.
// Este ficheiro é usado na landing (secção Preços) e no painel (página Plano): para mudar
// preços ou o que cada plano inclui, basta mexer aqui.

export const PLANOS = {
  essencial: {
    chave: "essencial",
    nome: "CRM Essencial",
    pessoas: 5,
    mensal: 15,
    descricao: "Para começar a organizar os leads da equipa.",
  },
  pro: {
    chave: "pro",
    nome: "CRM Pro",
    pessoas: 20,
    mensal: 35,
    descricao: "Para equipas que querem que o CRM trabalhe por elas.",
  },
};

export const MESES_PAGOS_NO_ANUAL = 10; // anual = 12 meses pelo preço de 10
export const DIAS_TESTE = 14;
export const DIAS_AVISO_FIM_TESTE = 3; // o aviso no painel aparece nos últimos 3 dias

// A mesma lista nos dois planos, para comparar linha a linha:
// o Pro tem tudo (✓); no Essencial, o que é só do Pro aparece com ✗.
// "perde" = o que deixa de funcionar quando a empresa passa do Pro ao Essencial (página Plano).
export const FUNCOES = [
  { texto: "Leads, pipeline e tarefas" },
  { texto: "Notificações e pesquisa rápida" },
  { texto: "WhatsApp com mensagens prontas, guardado no histórico" },
  { texto: "Formulário público com as tuas perguntas" },
  { texto: "Importar e exportar CSV" },
  { texto: "Gráfico, tema e menu à maneira da empresa" },
  {
    texto: "Propostas com aceitação online: o lead fecha sozinho",
    soPro: true,
    perde: "Deixas de criar propostas novas. As que já enviaste continuam a funcionar.",
  },
  {
    texto: "Tarefa “Contactar” automática para cada lead novo",
    soPro: true,
    perde: "As automações param (tarefa “Contactar”, distribuição dos leads e aviso de lead parado).",
  },
  { texto: "Leads do formulário distribuídos à vez pela equipa", soPro: true },
  { texto: "Aviso quando um lead fica parado", soPro: true },
  {
    texto: "Formulário com o teu design: disposição, cor, logótipo e modelos",
    soPro: true,
    perde: "O formulário público fica com o design que fizeste no Pro, mas deixas de o poder mudar.",
  },
  {
    texto: "Relatórios da equipa: vendas, conversão e tempo até fechar",
    soPro: true,
    perde: "Os Relatórios da equipa ficam escondidos.",
  },
];

// cookie que guarda o aviso do teste que o administrador fechou (components/painel/AvisoTeste.js)
export const COOKIE_AVISO_TESTE = "aviso_teste_fechado";

const UM_DIA = 24 * 60 * 60 * 1000;

export function estadoPlano(empresa, agora = new Date()) {
  const fimTeste = empresa?.teste_ate ? new Date(empresa.teste_ate) : null;
  // o teste acabou (ou a assinatura foi cancelada) e ninguém pagou: o CRM fica bloqueado
  const bloqueada = fimTeste !== null && fimTeste <= agora;
  const emTeste = fimTeste !== null && !bloqueada; // o teste é sempre do Pro
  const chave = emTeste ? "pro" : empresa?.plano === "pro" ? "pro" : "essencial";
  return {
    ...PLANOS[chave],
    pro: chave === "pro" && !bloqueada,
    emTeste,
    bloqueada,
    // pago com a Stripe (tem assinatura): mudar de plano e gerir o pagamento é na página Plano
    pago: !bloqueada && !emTeste && Boolean(empresa?.stripe_assinatura),
    ciclo: empresa?.ciclo ?? null, // "mensal" | "anual"
    proximoPagamento: empresa?.proximo_pagamento ?? null,
    cancelaNoFim: Boolean(empresa?.cancela_no_fim), // cancelou: fica até ao fim do período pago
    // quando acaba (ou acabou) o teste do Pro, em texto ISO (null se não houver teste)
    fimTeste: fimTeste ? fimTeste.toISOString() : null,
    // dias que faltam do teste, a arredondar para cima ("falta 1 dia" até ao fim)
    diasRestantes: emTeste ? Math.max(1, Math.ceil((fimTeste - agora) / UM_DIA)) : null,
  };
}

// preço em euros de um plano: mensal, ou anual (12 meses pelo preço de MESES_PAGOS_NO_ANUAL)
export function precoPlano(chave, ciclo) {
  const p = PLANOS[chave];
  if (!p) return null;
  return ciclo === "anual" ? p.mensal * MESES_PAGOS_NO_ANUAL : p.mensal;
}

// "faltam 3 dias" / "falta 1 dia"
export function textoDiasRestantes(dias) {
  return dias === 1 ? "falta 1 dia" : `faltam ${dias} dias`;
}

// Aviso do painel sobre o teste do Pro (só para administradores):
//  "acaba" -> nos últimos DIAS_AVISO_FIM_TESTE dias do teste.
// Depois de acabar não há aviso: o painel fica bloqueado e abre sempre na página Plano.
// "chave" identifica o aviso: fechar este não esconde o de outro teste.
export function avisoPlano(plano) {
  if (plano.emTeste && plano.diasRestantes <= DIAS_AVISO_FIM_TESTE) {
    return { tipo: "acaba", chave: `acaba-${plano.fimTeste?.slice(0, 10)}` };
  }
  return null;
}
