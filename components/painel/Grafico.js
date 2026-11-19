"use client";
// Gráfico feito com a biblioteca Chart.js.
// É um componente de CLIENTE: o Chart.js desenha num <canvas>, que só existe no browser.
//
// Props:
//  - tipo: "line" (linha), "bar" (barras) ou "doughnut" (circular)
//  - etiquetas: textos do eixo/fatias, ex.: ["Novo", "Ativo"]
//  - valores: números, um por etiqueta
//  - cores: uma cor (linha) ou uma por valor (barras/circular). Aceita "var(--nome)".
//  - formato: "euros" para mostrar os valores como dinheiro
//  - preencher: só nas linhas; false = só a linha, sem a área pintada por baixo (por defeito true)
//
// Os dados são calculados no servidor (na página) e chegam aqui já prontos.

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto"; // "auto" regista todos os tipos de gráfico de uma vez

// O <canvas> não percebe variáveis CSS ("var(--cor-destaque)"):
// lemos o valor verdadeiro (ex.: "#22c55e") das variáveis definidas no globals.css.
function resolverCor(cor) {
  const nome = cor.match(/^var\((--[\w-]+)\)$/)?.[1];
  if (!nome) return cor;
  return getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
}

// "#4357e8" -> "rgb(67 87 232 / 0.3)" (a mesma cor com transparência)
function comTransparencia(hex, alfa) {
  const n = parseInt(hex.replace("#", ""), 16);
  if (Number.isNaN(n) || hex.length < 7) return hex;
  return `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / ${alfa})`;
}

const euros = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export default function Grafico({ tipo, etiquetas, valores, cores, formato, preencher = true }) {
  const refCanvas = useRef(null);

  // useEffect: cria o gráfico depois de o <canvas> aparecer no ecrã.
  // Volta a correr se os dados mudarem.
  useEffect(() => {
    const listaCores = Array.isArray(cores) ? cores.map(resolverCor) : resolverCor(cores);
    const corTexto = resolverCor("var(--cor-texto-fraco)");
    // grelha com a "tinta" do modelo de design (branca nos escuros, escura nos claros)
    const corGrelha = `rgb(${resolverCor("var(--rgb-tinta)")} / 0.08)`;
    const formatar = (v) => (formato === "euros" ? euros.format(v) : v);
    const circular = tipo === "doughnut";
    // barras de uma só cor (ex.: novos clientes por semana): degradê suave de cima para baixo,
    // com uma linha da cor cheia no topo de cada barra (como na referência Octax)
    const barrasSuaves = tipo === "bar" && !Array.isArray(cores);
    const degrade = (contexto) => {
      const area = contexto.chart.chartArea;
      if (!area) return comTransparencia(listaCores, 0.2); // primeiro desenho: ainda sem medidas
      const g = contexto.chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
      g.addColorStop(0, comTransparencia(listaCores, 0.32));
      g.addColorStop(1, comTransparencia(listaCores, 0.06));
      return g;
    };

    const grafico = new Chart(refCanvas.current, {
      type: tipo,
      data: {
        labels: etiquetas,
        datasets: [
          {
            data: valores,
            backgroundColor:
              tipo === "line"
                ? listaCores + "22" // cor da linha com transparência ("22" em hexadecimal ≈ 13%)
                : barrasSuaves
                  ? degrade
                  : listaCores,
            borderColor: circular ? resolverCor("var(--cor-cartao)") : listaCores,
            borderWidth: circular ? 3 : barrasSuaves ? { top: 2, left: 0, right: 0, bottom: 0 } : 2,
            borderSkipped: barrasSuaves ? "bottom" : undefined,
            borderRadius: tipo === "bar" ? (barrasSuaves ? 4 : 8) : 0,
            fill: tipo === "line" && preencher, // pinta a área por baixo da linha
            tension: 0.35, // linha suavemente curva
            pointRadius: 3,
            pointBackgroundColor: listaCores,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // a altura vem do CSS do contentor
        cutout: circular ? "68%" : undefined, // tamanho do buraco do donut
        animation: { duration: 900 },
        plugins: {
          legend: { display: false }, // a legenda é feita em HTML pela página
          // caixa da dica clara e discreta, com contorno fino
          tooltip: {
            backgroundColor: resolverCor("var(--cor-cartao)"),
            titleColor: resolverCor("var(--cor-texto)"),
            bodyColor: resolverCor("var(--cor-texto-suave)"),
            borderColor: `rgb(${resolverCor("var(--rgb-tinta)")} / 0.12)`,
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            displayColors: false,
            callbacks: { label: (contexto) => ` ${formatar(contexto.parsed.y ?? contexto.parsed)}` },
          },
        },
        scales: circular
          ? {}
          : {
              x: { grid: { display: false }, ticks: { color: corTexto } },
              y: {
                beginAtZero: true,
                grid: { color: corGrelha },
                border: { display: false },
                ticks: { color: corTexto, precision: 0, callback: formatar },
              },
            },
      },
    });

    // limpeza: destrói o gráfico antigo antes de criar outro (ou ao sair da página)
    return () => grafico.destroy();
  }, [tipo, etiquetas, valores, cores, formato, preencher]);

  // role="img" + aria-label: os leitores de ecrã anunciam o gráfico como uma imagem
  return <canvas ref={refCanvas} role="img" aria-label={`Gráfico: ${etiquetas.join(", ")}`}></canvas>;
}
