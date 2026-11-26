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

// Cada pessoa pode trocar entre claro e escuro no botão da barra do topo (BotaoTema):
// fica neste cookie e passa à frente do modo da empresa.
export const COOKIE_MODO = "flowcrm_modo";

// só no browser: guarda o modo escolhido por um ano
export function guardarModoPessoal(modo) {
  document.cookie = `${COOKIE_MODO}=${modo}; path=/; max-age=31536000; samesite=lax`;
}

// Só no browser: mostra logo as cores do modo escolhido, por cima das do servidor, enquanto o
// router.refresh() não traz o layout novo. Fica num <style> no fim do <body> (ganha ao do layout).
const ID_MODO_VIVO = "flowcrm-modo-vivo";
export function mostrarModoJa(aparencia, modo) {
  let estilo = document.getElementById(ID_MODO_VIVO);
  if (!estilo) {
    estilo = document.createElement("style");
    estilo.id = ID_MODO_VIVO;
    document.body.appendChild(estilo);
  }
  estilo.textContent = cssAparencia({ ...aparencia, modo });
}
export function tirarModoJa() {
  document.getElementById(ID_MODO_VIVO)?.remove();
}

export function comModoPessoal(aparencia, modoPessoal) {
  return MODOS.some((m) => m.chave === modoPessoal) ? { ...aparencia, modo: modoPessoal } : aparencia;
}

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

// Um só design, com as cores da FlowCRM (refeito a 23/11, direções "Grafite" e "Papel"):
//  - escuro (Grafite): quase preto e neutro; o verde fica só no logótipo, nos estados e nos
//    gráficos, e o botão principal é claro (como as ferramentas tipo Linear/Attio).
//  - claro (Papel): branco, menu em cinzento muito leve, verde-escuro nos botões.
// Fica numa lista para o resto do código (Configurações, CSS) não ter de mudar.
// "botao": a cor do botão principal em cada versão (pode não ser a cor de destaque).
export const MODELOS = [
  {
    chave: "flow",
    nome: "FlowCRM",
    descricao: "Grafite (escuro) ou Papel (claro), com o verde da FlowCRM.",
    modoPadrao: "escuro",
    claro: {
      ...claro({
        fundo: "#ffffff", fundo2: "#f7f7f5", cartao: "#ffffff", contorno: "#e7e7e4", tinta: "24 24 27",
        texto: "#18181b", suave: "#52525b", fraco: "#6b6b70",
        destaque: { cor: "#15803d", luz: "#16a34a", sombra: "#166534", sobre: "#ffffff" },
      }),
      botao: { cor: "#166534", hover: "#14532d", sobre: "#ffffff" },
    },
    escuro: {
      ...escuro({
        fundo: "#0b0c0e", fundo2: "#0b0c0e", cartao: "#111214", painelCartao: "#111214", contorno: "#1f2125", elevado: "#17181b",
        texto: "#e8e9eb", suave: "#9a9ea6", fraco: "#7d818a",
        destaque: { cor: "#3ecf8e", luz: "#6ee7b7", sombra: "#22a06b", sobre: "#04261a" },
      }),
      botao: { cor: "#e8e9eb", hover: "#ffffff", sobre: "#0b0c0e" },
    },
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
    { id: "marcacoes", nome: "Marcações", href: "/painel/marcacoes", icone: "calendario", tutorial: "marcacoes" },
    { id: "notificacoes", nome: "Notificações", href: "/painel/notificacoes", icone: "sino" },
  ],
  empresa: [
    { id: "equipa", nome: "Equipa", href: "/painel/equipa", icone: "utilizadorMais", tutorial: "equipa", admin: true },
    { id: "automacoes", nome: "Automações", href: "/painel/automacoes", icone: "raio", tutorial: "automacoes", admin: true, pro: true },
    { id: "relatorios", nome: "Relatórios", href: "/painel/relatorios", icone: "grafico", tutorial: "relatorios", admin: true, pro: true },
    { id: "formulario", nome: "Formulário", href: "/painel/formulario", icone: "formulario", tutorial: "personalizar", admin: true },
    { id: "cobranca", nome: "Cobrança", href: "/painel/cobranca", icone: "cartao", admin: true },
    { id: "configuracoes", nome: "Configurações", href: "/painel/configuracoes", icone: "definicoes", tutorial: "configuracoes", admin: true },
    { id: "conta", nome: "A minha conta", href: "/painel/conta", icone: "utilizador", tutorial: "conta" },
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
    "--cor-botao": variante.botao?.cor ?? cor,
    "--cor-botao-hover": variante.botao?.hover ?? sombra,
    "--cor-sobre-botao": variante.botao?.sobre ?? sobre,
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
