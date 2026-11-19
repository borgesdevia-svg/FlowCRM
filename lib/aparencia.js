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

// Um só design (redesenhado a 19/11, inspirado em dashboards como o Octax), com as cores da
// FlowCRM: preto e verde por defeito; e uma versão clara (branco com o mesmo verde, mais escuro
// para se ler bem em fundo branco).
// Fica numa lista para o resto do código (Configurações, CSS) não ter de mudar.
export const MODELOS = [
  {
    chave: "flow",
    nome: "FlowCRM",
    descricao: "Preto e verde, com contornos finos.",
    modoPadrao: "escuro",
    claro: claro({
      fundo: "#f6f7f9", fundo2: "#ffffff", cartao: "#ffffff", contorno: "#e4e7ec", tinta: "16 24 40",
      texto: "#101828", suave: "#475467", fraco: "#667085",
      destaque: { cor: "#15803d", luz: "#16a34a", sombra: "#166534", sobre: "#ffffff" },
    }),
    escuro: escuro({
      fundo: "#09090b", fundo2: "#0c0c0f", cartao: "#111114", painelCartao: "#121215", contorno: "#222227", elevado: "#19191d",
      texto: "#f4f4f5", suave: "#a1a1aa", fraco: "#71717a",
      destaque: { cor: "#22c55e", luz: "#4ade80", sombra: "#16a34a", sobre: "#052e16" },
    }),
  },
];

// Versão do formato guardado. Aparências guardadas antes de 19/11 (sem "versao" ou com a 2,
// do redesign azul) voltam ao padrão: preto e verde.
const VERSAO = 3;

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
    { id: "painel", nome: "Visão geral", href: "/painel", icone: "grelha", tutorial: "painel" },
    { id: "clientes", nome: "Leads", href: "/painel/clientes", icone: "utilizadores", tutorial: "clientes" },
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
  { chave: "principal", titulo: "Vendas" },
  { chave: "empresa", titulo: "Empresa" },
];

export const MAX_NOME_MENU = 24;

export const PADRAO = { versao: VERSAO, modelo: "flow", modo: "escuro", grafico: "barras", menu: {} };

// ---------- ler e limpar ----------
// Aceita o que vier da base de dados (ou do browser) e devolve sempre uma aparência
// válida: valores desconhecidos voltam ao padrão, itens de menu em falta vão para o fim.
// Aparências de antes do redesign começam no modo do padrão (escuro).
export function normalizarAparencia(bruto) {
  const a = bruto && typeof bruto === "object" ? bruto : {};
  const atual = a.versao === VERSAO;
  return {
    versao: VERSAO,
    modelo: MODELOS[0].chave,
    modo: atual && MODOS.some((m) => m.chave === a.modo) ? a.modo : PADRAO.modo,
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

// nomes de origem antigos (antes de "Leads" e "Visão geral"): quem os tinha guardados sem mudar fica com os novos
const NOMES_ANTIGOS = new Set(["Painel", "Clientes"]);

function limparNome(nome, padrao) {
  const texto = String(nome ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_NOME_MENU);
  if (NOMES_ANTIGOS.has(texto)) return padrao;
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
