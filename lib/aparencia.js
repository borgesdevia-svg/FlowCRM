// Aparência do painel de cada empresa (página Configurações, só o administrador):
//   - modelo de design + modo (claro ou escuro): cada modelo tem as duas versões
//   - tipo de gráfico no Início
//   - nome e ordem de cada item do menu
// Fica guardada na coluna empresas.aparencia (jsonb). Usado no servidor (layout,
// validação ao guardar) e no browser (página de Configurações, pré-visualização).
// As cores vêm SEMPRE destas listas: nunca entra CSS escrito pelo utilizador.

// ---------- modelos de design ----------
// Cada modelo é uma família de cores com duas versões, "claro" e "escuro". Assim não
// é preciso repetir o mesmo tema duas vezes: escolhe-se o modelo e depois o sol ou a lua.
// Cada versão traz:
//   "conteudo": variáveis CSS do globals.css para a página
//   "lateral":  variáveis só para o menu lateral (null = igual ao conteúdo)
//   "destaque": a cor do modelo (botões, item ativo, gráficos) e as suas variantes
//   "amostra":  cores da miniatura na página de Configurações

export const MODOS = [
  { chave: "claro", nome: "Claro", icone: "sol" },
  { chave: "escuro", nome: "Escuro", icone: "lua" },
];

// versão clara: conteúdo claro e, se "lateral" vier, menu lateral escuro à parte
function claro({ fundo, fundo2, cartao, contorno, tinta, texto, suave, fraco, destaque, lateral = null }) {
  return {
    claro: true,
    destaque,
    conteudo: {
      "--cor-fundo": fundo,
      "--cor-fundo-2": fundo2,
      "--cor-cartao": cartao,
      "--cor-contorno": contorno,
      "--painel-cartao": cartao,
      "--painel-contorno": `rgb(${tinta} / 0.1)`,
      "--cor-elevado": cartao,
      "--cor-texto": texto,
      "--cor-texto-suave": suave,
      "--cor-texto-fraco": fraco,
      "--rgb-tinta": tinta,
      "--cor-perigo-texto": "#dc2626",
      "--cor-aviso-texto": "#b45309",
    },
    lateral: lateral && lateralEscura(lateral),
    amostra: {
      lateral: lateral?.fundo ?? fundo2,
      fundo,
      cartao,
      texto,
      fraco,
      destaque: destaque.cor,
      destaqueLateral: lateral?.destaque ?? destaque.cor,
      lateralEscura: Boolean(lateral),
    },
  };
}

// versão escura: tudo escuro, menu incluído
function escuro({ fundo, fundo2, cartao, painelCartao, contorno, elevado, texto, suave, fraco, destaque }) {
  return {
    claro: false,
    destaque,
    conteudo: {
      "--cor-fundo": fundo,
      "--cor-fundo-2": fundo2,
      "--cor-cartao": cartao,
      "--cor-contorno": contorno,
      "--painel-cartao": painelCartao,
      "--painel-contorno": "rgb(255 255 255 / 0.08)",
      "--cor-elevado": elevado,
      "--cor-texto": texto,
      "--cor-texto-suave": suave,
      "--cor-texto-fraco": fraco,
      // repostas sempre: a pré-visualização de um modelo escuro tem de tapar um claro já guardado
      "--rgb-tinta": "255 255 255",
      "--cor-perigo-texto": "#fca5a5",
      "--cor-aviso-texto": "#fbbf24",
    },
    lateral: null,
    amostra: { lateral: fundo2, fundo, cartao: painelCartao, texto, fraco, destaque: destaque.cor, destaqueLateral: destaque.cor },
  };
}

// variáveis de um menu lateral escuro (usado nas versões claras com menu escuro)
function lateralEscura({ fundo, cartao, contorno, texto, suave, fraco, destaque }) {
  return {
    "--cor-fundo": fundo,
    "--cor-fundo-2": fundo,
    "--cor-cartao": cartao,
    "--cor-contorno": contorno,
    "--cor-elevado": cartao,
    "--painel-cartao": cartao,
    "--painel-contorno": contorno,
    "--cor-texto": texto,
    "--cor-texto-suave": suave,
    "--cor-texto-fraco": fraco,
    "--rgb-tinta": "255 255 255",
    "--cor-destaque": destaque,
    "--rgb-destaque": hexParaRgb(destaque),
    "--cor-superficie-verde": `color-mix(in srgb, ${destaque} 18%, ${fundo})`,
    "--cor-perigo-texto": "#fca5a5",
    "--cor-aviso-texto": "#fbbf24",
    "color-scheme": "dark",
  };
}

export const MODELOS = [
  {
    chave: "grafite",
    nome: "Grafite",
    descricao: "O de sempre: cinzento-azulado com verde.",
    modoPadrao: "escuro",
    // a versão escura é exatamente a do globals.css (por isso não muda nenhuma variável)
    escuro: escuro({
      fundo: "#0f1115", fundo2: "#13161b", cartao: "#171a21", painelCartao: "#1c2028", contorno: "#262a33", elevado: "#1e222b",
      texto: "#e6e8eb", suave: "#9aa1ab", fraco: "#646b76",
      destaque: { cor: "#22c55e", luz: "#4ade80", sombra: "#15803d", sobre: "#052e16" },
    }),
    claro: claro({
      fundo: "#f3f5f7", fundo2: "#ffffff", cartao: "#ffffff", contorno: "#dde1e6", tinta: "17 24 39",
      texto: "#111827", suave: "#4b5563", fraco: "#6b7280",
      destaque: { cor: "#16a34a", luz: "#22c55e", sombra: "#15803d", sobre: "#ffffff" },
    }),
  },
  {
    chave: "preto-branco",
    nome: "Preto e branco",
    descricao: "Sem cor: fundo branco e botões pretos, ou fundo preto e botões brancos.",
    modoPadrao: "claro",
    claro: claro({
      fundo: "#ffffff", fundo2: "#fafafa", cartao: "#ffffff", contorno: "#e5e5e5", tinta: "0 0 0",
      texto: "#0a0a0a", suave: "#525252", fraco: "#737373",
      destaque: { cor: "#0a0a0a", luz: "#262626", sombra: "#000000", sobre: "#ffffff" },
    }),
    escuro: escuro({
      fundo: "#000000", fundo2: "#0a0a0a", cartao: "#0a0a0a", painelCartao: "#111111", contorno: "#262626", elevado: "#171717",
      texto: "#fafafa", suave: "#a3a3a3", fraco: "#737373",
      destaque: { cor: "#fafafa", luz: "#ffffff", sombra: "#d4d4d4", sobre: "#0a0a0a" },
    }),
  },
  {
    chave: "executivo",
    nome: "Executivo",
    descricao: "Azul-marinho e azul de confiança.",
    modoPadrao: "claro",
    claro: claro({
      fundo: "#f3f5f9", fundo2: "#e9edf3", cartao: "#ffffff", contorno: "#dde3ec", tinta: "15 23 42",
      texto: "#0f172a", suave: "#475569", fraco: "#64748b",
      destaque: { cor: "#2563eb", luz: "#3b82f6", sombra: "#1d4ed8", sobre: "#ffffff" },
      lateral: { fundo: "#0f1b33", cartao: "#17264a", contorno: "rgb(148 163 184 / 0.16)", texto: "#f1f5f9", suave: "#a9b6cc", fraco: "#6b7a96", destaque: "#60a5fa" },
    }),
    escuro: escuro({
      fundo: "#0d1426", fundo2: "#0a1020", cartao: "#111a2e", painelCartao: "#16203a", contorno: "#1e293b", elevado: "#1a2540",
      texto: "#e2e8f0", suave: "#94a3b8", fraco: "#64748b",
      destaque: { cor: "#60a5fa", luz: "#93c5fd", sombra: "#2563eb", sobre: "#0b1a33" },
    }),
  },
  {
    chave: "floresta",
    nome: "Floresta",
    descricao: "Verde-escuro, branco-pedra e esmeralda.",
    modoPadrao: "claro",
    claro: claro({
      fundo: "#f4f4ef", fundo2: "#ebebe4", cartao: "#ffffff", contorno: "#dfe0d7", tinta: "23 34 29",
      texto: "#17221d", suave: "#4a5751", fraco: "#6f7b75",
      destaque: { cor: "#047857", luz: "#059669", sombra: "#065f46", sobre: "#ffffff" },
      lateral: { fundo: "#11261c", cartao: "#1a3428", contorno: "rgb(167 196 180 / 0.15)", texto: "#ecf3ef", suave: "#a6bcb0", fraco: "#6c8579", destaque: "#34d399" },
    }),
    escuro: escuro({
      fundo: "#0d1612", fundo2: "#0a120e", cartao: "#111d17", painelCartao: "#15241c", contorno: "#1f3329", elevado: "#1a2c22",
      texto: "#e6efe9", suave: "#9fb5a8", fraco: "#64786c",
      destaque: { cor: "#34d399", luz: "#6ee7b7", sombra: "#059669", sobre: "#022c1e" },
    }),
  },
  {
    chave: "terracota",
    nome: "Terracota",
    descricao: "Café, nata e laranja-tijolo.",
    modoPadrao: "claro",
    claro: claro({
      fundo: "#f8f3ec", fundo2: "#f0e9df", cartao: "#fffdf9", contorno: "#e7ddd0", tinta: "60 40 28",
      texto: "#2a1f19", suave: "#5f5248", fraco: "#87796d",
      destaque: { cor: "#c2410c", luz: "#ea580c", sombra: "#9a3412", sobre: "#ffffff" },
      lateral: { fundo: "#2a1d17", cartao: "#3a2a22", contorno: "rgb(230 200 180 / 0.13)", texto: "#f7efe8", suave: "#c4b2a5", fraco: "#8c786b", destaque: "#fb923c" },
    }),
    escuro: escuro({
      fundo: "#14100d", fundo2: "#0f0c0a", cartao: "#1b1612", painelCartao: "#221b16", contorno: "#33291f", elevado: "#2a211b",
      texto: "#f2ebe4", suave: "#b8a99c", fraco: "#7d6e62",
      destaque: { cor: "#fb923c", luz: "#fdba74", sombra: "#c2410c", sobre: "#2a1003" },
    }),
  },
  {
    chave: "bordeaux",
    nome: "Bordeaux",
    descricao: "Cor de vinho e carmim.",
    modoPadrao: "claro",
    claro: claro({
      fundo: "#f7f4f5", fundo2: "#efe9eb", cartao: "#ffffff", contorno: "#e6dde0", tinta: "45 20 30",
      texto: "#21151a", suave: "#5b4b51", fraco: "#837278",
      destaque: { cor: "#be123c", luz: "#e11d48", sombra: "#9f1239", sobre: "#ffffff" },
      lateral: { fundo: "#2b0e19", cartao: "#3d1826", contorno: "rgb(240 190 205 / 0.13)", texto: "#f9eef2", suave: "#c9a9b4", fraco: "#8e6c78", destaque: "#fb7185" },
    }),
    escuro: escuro({
      fundo: "#140b0f", fundo2: "#0f080b", cartao: "#1c1016", painelCartao: "#23141b", contorno: "#36202a", elevado: "#2b1922",
      texto: "#f5e9ee", suave: "#c2a3af", fraco: "#846a75",
      destaque: { cor: "#fb7185", luz: "#fda4af", sombra: "#be123c", sobre: "#3b0613" },
    }),
  },
  {
    chave: "nordico",
    nome: "Nórdico",
    descricao: "Arejado, com azul-petróleo.",
    modoPadrao: "claro",
    claro: claro({
      fundo: "#eef2f4", fundo2: "#ffffff", cartao: "#ffffff", contorno: "#dbe2e7", tinta: "20 33 43",
      texto: "#14212b", suave: "#4a5965", fraco: "#6e7d88",
      destaque: { cor: "#0f766e", luz: "#0d9488", sombra: "#115e59", sobre: "#ffffff" },
    }),
    escuro: escuro({
      fundo: "#0e1719", fundo2: "#0b1214", cartao: "#121e21", painelCartao: "#162428", contorno: "#203236", elevado: "#1b2b2f",
      texto: "#e3eef0", suave: "#9bb2b7", fraco: "#62787d",
      destaque: { cor: "#2dd4bf", luz: "#5eead4", sombra: "#0f766e", sobre: "#042f2c" },
    }),
  },
];

// nomes de modelos antigos (já guardados por algumas empresas) → modelo e modo novos
const MODELOS_ANTIGOS = {
  claro: { modelo: "nordico", modo: "claro" },
  areia: { modelo: "terracota", modo: "claro" },
  preto: { modelo: "preto-branco", modo: "escuro" },
  "meia-noite": { modelo: "executivo", modo: "escuro" },
  carvao: { modelo: "terracota", modo: "escuro" },
};

// ---------- gráfico de clientes por semana, no Início ----------
export const GRAFICOS = [
  { chave: "area", nome: "Área", descricao: "Linha com a área pintada por baixo." },
  { chave: "linha", nome: "Linha", descricao: "Só a linha, mais limpo." },
  { chave: "barras", nome: "Barras", descricao: "Uma barra por semana." },
];

// ---------- menu lateral ----------
// Cada item tem um id fixo (o link nunca muda); o nome e a ordem são personalizáveis.
// "admin: true" = só aparece aos administradores.
export const MENU = {
  principal: [
    { id: "painel", nome: "Painel", href: "/painel", icone: "casa", tutorial: "painel" },
    { id: "clientes", nome: "Clientes", href: "/painel/clientes", icone: "utilizadores", tutorial: "clientes" },
    { id: "pipeline", nome: "Pipeline", href: "/painel/pipeline", icone: "subida", tutorial: "pipeline" },
    { id: "tarefas", nome: "Tarefas", href: "/painel/tarefas", icone: "lista", tutorial: "tarefas" },
    { id: "notificacoes", nome: "Notificações", href: "/painel/notificacoes", icone: "sino" },
  ],
  empresa: [
    { id: "equipa", nome: "Equipa", href: "/painel/equipa", icone: "utilizadorMais", tutorial: "equipa", admin: true },
    { id: "automacoes", nome: "Automações", href: "/painel/automacoes", icone: "raio", tutorial: "automacoes", admin: true },
    { id: "formulario", nome: "Formulário", href: "/painel/formulario", icone: "formulario", tutorial: "personalizar", admin: true },
    { id: "configuracoes", nome: "Configurações", href: "/painel/configuracoes", icone: "definicoes", tutorial: "configuracoes", admin: true },
    { id: "conta", nome: "A minha conta", href: "/painel/conta", icone: "utilizador" },
  ],
};

export const SECCOES_MENU = [
  { chave: "principal", titulo: "Menu principal" },
  { chave: "empresa", titulo: "Empresa" },
];

export const MAX_NOME_MENU = 24;

export const PADRAO = { modelo: "grafite", modo: "escuro", grafico: "area", menu: {} };

// ---------- ler e limpar ----------
// Aceita o que vier da base de dados (ou do browser) e devolve sempre uma aparência
// válida: valores desconhecidos voltam ao padrão, itens de menu em falta vão para o fim.
// Sem "modo" guardado (empresas que guardaram antes de haver claro/escuro), usa o modo
// com que o modelo foi pensado.
export function normalizarAparencia(bruto) {
  const a = bruto && typeof bruto === "object" ? bruto : {};
  const antigo = MODELOS_ANTIGOS[a.modelo];
  const encontrado = MODELOS.find((m) => m.chave === (antigo?.modelo ?? a.modelo));
  const modelo = encontrado ?? MODELOS.find((m) => m.chave === PADRAO.modelo);
  const modoValido = MODOS.some((m) => m.chave === a.modo);
  return {
    modelo: modelo.chave,
    modo: modoValido ? a.modo : encontrado ? (antigo?.modo ?? modelo.modoPadrao) : PADRAO.modo,
    grafico: GRAFICOS.some((g) => g.chave === a.grafico) ? a.grafico : PADRAO.grafico,
    menu: Object.fromEntries(SECCOES_MENU.map(({ chave }) => [chave, normalizarSeccao(chave, a.menu?.[chave])])),
  };
}

// devolve [{ id, nome }] com todos os itens da secção, pela ordem guardada
function normalizarSeccao(chave, guardados) {
  const base = MENU[chave];
  const lista = Array.isArray(guardados) ? guardados : [];
  const vistos = new Set();
  const resultado = [];
  for (const g of lista) {
    const item = base.find((b) => b.id === g?.id);
    if (!item || vistos.has(item.id)) continue;
    vistos.add(item.id);
    resultado.push({ id: item.id, nome: limparNome(g.nome, item.nome) });
  }
  for (const item of base) if (!vistos.has(item.id)) resultado.push({ id: item.id, nome: item.nome });
  return resultado;
}

function limparNome(nome, padrao) {
  const texto = String(nome ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_NOME_MENU);
  return texto.length >= 1 ? texto : padrao;
}

// itens prontos para o menu lateral: dados fixos (link, ícone) + nome e ordem da empresa
export function itensDoMenu(aparencia, chaveSeccao) {
  return aparencia.menu[chaveSeccao].map(({ id, nome }) => ({ ...MENU[chaveSeccao].find((b) => b.id === id), nome }));
}

// ---------- CSS ----------
function hexParaRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

export function modeloDe(aparencia) {
  return MODELOS.find((m) => m.chave === aparencia.modelo) ?? MODELOS[0];
}

// a versão (clara ou escura) do modelo escolhido
export function varianteDe(aparencia) {
  const modelo = modeloDe(aparencia);
  return modelo[aparencia.modo] ?? modelo[modelo.modoPadrao];
}

// variáveis CSS do conteúdo para o modelo e modo escolhidos (objeto { "--nome": "valor" })
export function variaveisAparencia(aparencia) {
  const variante = varianteDe(aparencia);
  const { cor, luz, sombra, sobre } = variante.destaque;
  // Escreve sempre todas as variáveis, mesmo no Grafite escuro (iguais às do globals.css):
  // assim a pré-visualização de qualquer modelo tapa por completo o que está guardado.
  return {
    ...variante.conteudo,
    "--cor-destaque": cor,
    "--rgb-destaque": hexParaRgb(cor),
    "--cor-destaque-claro": luz,
    "--cor-destaque-escuro": sombra,
    "--cor-sobre-destaque": sobre,
    "--cor-superficie-verde": `color-mix(in srgb, ${cor} ${variante.claro ? 12 : 16}%, var(--cor-fundo))`,
    "color-scheme": variante.claro ? "light" : "dark",
  };
}

// texto CSS para pôr num <style> no layout do painel (os valores vêm só das listas acima).
// O menu lateral (classe global "painel-lateral") pode ter cores próprias nas versões claras com menu escuro.
// Nos outros modelos recebe as mesmas variáveis da página: escritas também nele, tapam o menu
// escuro de um modelo guardado enquanto se pré-visualiza outro.
export function cssAparencia(aparencia) {
  const bloco = (vars) => Object.entries(vars).map(([nome, valor]) => `${nome}:${valor};`).join("");
  const variante = varianteDe(aparencia);
  const pagina = variaveisAparencia(aparencia);
  return `:root{${bloco(pagina)}}.painel-lateral{${bloco(variante.lateral ?? pagina)}color:var(--cor-texto);}`;
}
