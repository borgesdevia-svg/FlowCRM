// Tudo o que o formulário público e o editor (Personalizar) partilham:
// cores, tipos de pergunta, limites, textos por defeito e modelos prontos.
// Usado no browser (editor e formulário) e no servidor (validação ao guardar).

export const MAX_PERGUNTAS = 15;
export const MAX_OPCOES = 12;

// paleta do formulário: "cor" pinta botões e destaques; "texto" é a cor das letras
// em cima dessa cor (escolhida para se ler bem: escuro nas cores claras, branco nas escuras)
export const CORES = [
  { chave: "verde", nome: "Verde", cor: "#22c55e", texto: "#052e16" },
  { chave: "azul", nome: "Azul", cor: "#3b82f6", texto: "#ffffff" },
  { chave: "roxo", nome: "Roxo", cor: "#8b5cf6", texto: "#ffffff" },
  { chave: "rosa", nome: "Rosa", cor: "#ec4899", texto: "#ffffff" },
  { chave: "vermelho", nome: "Vermelho", cor: "#ef4444", texto: "#ffffff" },
  { chave: "laranja", nome: "Laranja", cor: "#f97316", texto: "#1c0a00" },
  { chave: "amarelo", nome: "Amarelo", cor: "#facc15", texto: "#1a1500" },
  { chave: "cinzento", nome: "Cinzento", cor: "#a1a1aa", texto: "#111111" },
];

export function obterCor(chave) {
  return CORES.find((c) => c.chave === chave) ?? CORES[0];
}

// tipos de pergunta. "opcoes: true" = o administrador escreve as opções.
export const TIPOS = [
  { valor: "texto", texto: "Resposta curta" },
  { valor: "texto_longo", texto: "Resposta longa" },
  { valor: "escolha", texto: "Uma escolha", opcoes: true },
  { valor: "varias", texto: "Várias escolhas", opcoes: true },
  { valor: "lista", texto: "Lista de opções", opcoes: true },
  { valor: "sim_nao", texto: "Sim ou não" },
  { valor: "numero", texto: "Número" },
  { valor: "data", texto: "Data" },
  // respostas com formato próprio: o formulário confirma que são mesmo um email, telefone ou site
  { valor: "email", texto: "Email" },
  { valor: "telefone", texto: "Telefone" },
  { valor: "link", texto: "Site ou link" },
];

export const TIPOS_COM_OPCOES = TIPOS.filter((t) => t.opcoes).map((t) => t.valor);

// textos que aparecem quando o administrador não escreveu os seus
export const TEXTOS_PADRAO = {
  titulo: "Deixa o teu contacto",
  texto: "Respondemos o mais depressa possível.",
  obrigado: (nomeEmpresa) => `Recebemos o teu contacto. ${nomeEmpresa} vai responder-te em breve.`,
};

// limites de cada texto (iguais aos da base de dados, migração 19)
export const LIMITES = {
  titulo: 80,
  texto: 300,
  obrigado: 300,
  botaoTexto: 40,
  botaoLink: 300,
  ajuda: 150,
};

// ---------- modelos prontos ----------
// Cada pergunta: [texto, tipo, obrigatória, opções?, ajuda?]
const p = (texto, tipo, obrigatoria = false, opcoes = undefined, ajuda = "") => ({
  texto,
  tipo,
  obrigatoria,
  ...(opcoes ? { opcoes } : {}),
  ajuda,
});

export const MODELOS = [
  {
    chave: "clinica",
    nome: "Clínica / saúde",
    titulo: "Marca a tua consulta",
    perguntas: [
      p("Que tipo de consulta procuras?", "lista", true, [
        "Consulta geral",
        "Medicina dentária",
        "Fisioterapia",
        "Nutrição",
        "Outra",
      ]),
      p("Já és nosso paciente?", "sim_nao", true),
      p("Em que período do dia preferes?", "varias", false, ["Manhã", "Tarde", "Final do dia"]),
      p("Tens seguro de saúde? Qual?", "texto", false, undefined, "Se não tiveres, deixa em branco."),
      p("Conta-nos o motivo da consulta", "texto_longo", false, undefined, "Opcional, mas ajuda-nos a preparar a consulta."),
    ],
  },
  {
    chave: "ginasio",
    nome: "Ginásio / desporto",
    titulo: "Começa a treinar connosco",
    perguntas: [
      p("Qual é o teu objetivo principal?", "escolha", true, [
        "Perder peso",
        "Ganhar massa muscular",
        "Melhorar a condição física",
        "Recuperar de uma lesão",
        "Outro",
      ]),
      p("Que modalidades te interessam?", "varias", false, [
        "Musculação",
        "Aulas de grupo",
        "Treino personalizado",
        "Natação",
        "Yoga ou pilates",
      ]),
      p("Já treinaste num ginásio?", "sim_nao", false),
      p("Quando preferes treinar?", "varias", false, ["Manhã", "Hora de almoço", "Tarde", "Noite"]),
      p("Que idade tens?", "numero", false),
    ],
  },
  {
    chave: "imobiliaria",
    nome: "Imobiliária",
    titulo: "Encontramos a casa certa para ti",
    perguntas: [
      p("O que procuras?", "escolha", true, ["Comprar", "Arrendar", "Vender o meu imóvel"]),
      p("Que tipologia?", "lista", false, ["T0", "T1", "T2", "T3", "T4 ou mais", "Moradia"]),
      p("Em que zona?", "texto", true, undefined, "Cidade, freguesia ou bairro."),
      p("Qual é o teu orçamento máximo (€)?", "numero", false),
      p("Para quando?", "escolha", false, ["O mais depressa possível", "Nos próximos 3 meses", "Ainda estou a ver"]),
    ],
  },
  {
    chave: "servicos",
    nome: "Serviços e obras",
    titulo: "Pede o teu orçamento",
    perguntas: [
      p("De que serviço precisas?", "lista", true, [
        "Canalização",
        "Eletricidade",
        "Pintura",
        "Remodelação",
        "Limpeza",
        "Outro",
      ]),
      p("Onde é o trabalho?", "texto", true, undefined, "Localidade ou código postal."),
      p("É urgente?", "sim_nao", false),
      p("Para quando gostavas de marcar?", "data", false, undefined, "Uma data aproximada chega."),
      p("Descreve o que precisas", "texto_longo", false, undefined, "Quanto mais detalhes, melhor o orçamento."),
    ],
  },
];
