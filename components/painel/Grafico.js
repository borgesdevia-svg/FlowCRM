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
//
// Os dados são calculados no servidor (na página) e chegam aqui já prontos.

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto"; // "auto" regista todos os tipos de gráfico de uma vez

// O <canvas> não percebe variáveis CSS ("var(--cor-destaque)"):
// lemos o valor verdadeiro (ex.: "#20c96b") das variáveis definidas no globals.css.
function resolverCor(cor) {
  const nome = cor.match(/^var\((--[\w-]+)\)$/)?.[1];
  if (!nome) return cor;
  return getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
}

const euros = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export default function Grafico({ tipo, etiquetas, valores, cores, formato }) {
  const refCanvas = useRef(null);

  // useEffect: cria o gráfico depois de o <canvas> aparecer no ecrã.
  // Volta a correr se os dados mudarem.
  useEffect(() => {
    const listaCores = Array.isArray(cores) ? cores.map(resolverCor) : resolverCor(cores);
    const corTexto = resolverCor("var(--cor-texto-fraco)");
    const corGrelha = "rgba(255, 255, 255, 0.06)";
    const formatar = (v) => (formato === "euros" ? euros.format(v) : v);
    const circular = tipo === "doughnut";

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
                : listaCores,
            borderColor: circular ? resolverCor("var(--cor-cartao)") : listaCores,
            borderWidth: circular ? 3 : 2,
            borderRadius: tipo === "bar" ? 8 : 0,
            fill: tipo === "line", // pinta a área por baixo da linha
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
          tooltip: {
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
  }, [tipo, etiquetas, valores, cores, formato]);

  // role="img" + aria-label: os leitores de ecrã anunciam o gráfico como uma imagem
  return <canvas ref={refCanvas} role="img" aria-label={`Gráfico: ${etiquetas.join(", ")}`}></canvas>;
}
