// Design livre do formulário público (só no CRM Pro).
// Guardado em empresas.form_design (jsonb, migração 24). Tudo vem destas listas fixas:
// normalizarDesign() deita fora o que não estiver aqui, por isso nunca entra CSS
// escrito por alguém. Usado no browser (editor e formulário) e no servidor (ao guardar).

import { CORES } from "./formulario.js";

// cores da marca: as do formulário + preto (o aspeto "documento" de sempre)
export const CORES_DESIGN = [{ chave: "preto", nome: "Preto", cor: "#101828", texto: "#ffffff" }, ...CORES];

export const OPCOES_DESIGN = {
  disposicao: [
    { valor: "folha", nome: "Folha", descricao: "Como um documento: simples e sério." },
    { valor: "cartao", nome: "Cartão", descricao: "Um cartão arredondado no meio da página." },
    { valor: "dividido", nome: "Dividido", descricao: "A marca de um lado, as perguntas do outro." },
    { valor: "aberto", nome: "Aberto", descricao: "Sem caixa: o formulário ocupa a página toda." },
  ],
  logo: [
    { valor: "esquerda", nome: "À esquerda" },
    { valor: "centro", nome: "Ao centro" },
    { valor: "grande", nome: "Grande" },
    { valor: "escondido", nome: "Sem logótipo" },
  ],
  fundo: [
    { valor: "claro", nome: "Cinzento claro" },
    { valor: "cor", nome: "Cor da marca" },
    { valor: "degrade", nome: "Degradê" },
    { valor: "escuro", nome: "Escuro" },
  ],
  cantos: [
    { valor: "retos", nome: "Retos" },
    { valor: "suaves", nome: "Suaves" },
    { valor: "redondos", nome: "Redondos" },
  ],
  letra: [
    { valor: "moderna", nome: "Moderna" },
    { valor: "classica", nome: "Clássica" },
    { valor: "arredondada", nome: "Arredondada" },
  ],
  alinhamento: [
    { valor: "esquerda", nome: "À esquerda" },
    { valor: "centro", nome: "Ao centro" },
  ],
};

export const MAX_TEXTO_BOTAO = 30;
export const TEXTO_BOTAO_PADRAO = "Enviar pedido de contacto";

// o aspeto de sempre (é o que vê quem não tem o Pro)
export const DESIGN_PADRAO = {
  disposicao: "folha",
  logo: "esquerda",
  cor: "preto",
  fundo: "claro",
  cantos: "suaves",
  letra: "moderna",
  alinhamento: "esquerda",
  botao: "",
};

const dentro = (lista, valor, padrao) => (lista.some((o) => o.valor === valor) ? valor : padrao);

export function normalizarDesign(bruto) {
  const d = bruto && typeof bruto === "object" ? bruto : {};
  const resultado = {};
  for (const [chave, lista] of Object.entries(OPCOES_DESIGN)) {
    resultado[chave] = dentro(lista, d[chave], DESIGN_PADRAO[chave]);
  }
  resultado.cor = CORES_DESIGN.some((c) => c.chave === d.cor) ? d.cor : DESIGN_PADRAO.cor;
  resultado.botao = typeof d.botao === "string" ? d.botao.trim().replace(/\s+/g, " ").slice(0, MAX_TEXTO_BOTAO) : "";
  return resultado;
}

const RAIOS = {
  retos: { caixa: "2px", campo: "2px" },
  suaves: { caixa: "10px", campo: "8px" },
  redondos: { caixa: "24px", campo: "14px" },
};

const LETRAS = {
  moderna: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  classica: 'Georgia, "Times New Roman", Times, serif',
  arredondada: 'ui-rounded, "SF Pro Rounded", "Nunito", "Segoe UI", system-ui, sans-serif',
};

// variáveis CSS do design (cor da marca, cantos e letra), para pôr no style=""
export function variaveisDesign(design) {
  const d = normalizarDesign(design);
  const c = CORES_DESIGN.find((x) => x.chave === d.cor);
  return {
    "--form-cor": c.cor,
    // a mesma cor em "R G B", para os realces transparentes do CSS (rgb(... / 0.1))
    "--form-cor-rgb": [1, 3, 5].map((i) => parseInt(c.cor.slice(i, i + 2), 16)).join(" "),
    "--form-sobre-cor": c.texto,
    "--form-raio": RAIOS[d.cantos].caixa,
    "--form-raio-campo": RAIOS[d.cantos].campo,
    "--form-letra": LETRAS[d.letra],
  };
}

// atributos data-* que o CSS usa para mudar a disposição, o fundo, o logótipo...
export function atributosDesign(design) {
  const d = normalizarDesign(design);
  return {
    "data-disposicao": d.disposicao,
    "data-logo": d.logo,
    "data-fundo": d.fundo,
    "data-alinhamento": d.alinhamento,
  };
}
