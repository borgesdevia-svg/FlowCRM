// Planos do FlowCRM (decididos a 2026-11-22). O preço é por empresa.
// Na base de dados (migração 24): empresas.plano ('essencial' | 'pro') e empresas.teste_ate.
//   plano 'pro' + teste_ate no futuro -> a experimentar o Pro (14 dias ao registar)
//   plano 'pro' + teste_ate vazio     -> Pro (pago)
//   plano 'essencial', ou o teste acabou -> Essencial
// As automações e o design/logótipo do formulário também são travados na base de dados
// (privado.tem_pro); aqui decide-se o que o site mostra.

export const PLANOS = {
  essencial: { chave: "essencial", nome: "CRM Essencial", pessoas: 5 },
  pro: { chave: "pro", nome: "CRM Pro", pessoas: 20 },
};

const UM_DIA = 24 * 60 * 60 * 1000;

export function estadoPlano(empresa, agora = new Date()) {
  const fimTeste = empresa?.teste_ate ? new Date(empresa.teste_ate) : null;
  const ePro = empresa?.plano === "pro";
  const testeAcabou = ePro && fimTeste !== null && fimTeste <= agora;
  const chave = ePro && !testeAcabou ? "pro" : "essencial";
  const emTeste = ePro && fimTeste !== null && !testeAcabou;
  return {
    ...PLANOS[chave],
    pro: chave === "pro",
    emTeste,
    testeAcabou,
    // dias que faltam do teste, a arredondar para cima ("falta 1 dia" até ao fim)
    diasRestantes: emTeste ? Math.max(1, Math.ceil((fimTeste - agora) / UM_DIA)) : null,
  };
}

// "faltam 3 dias" / "falta 1 dia"
export function textoDiasRestantes(dias) {
  return dias === 1 ? "falta 1 dia" : `faltam ${dias} dias`;
}
