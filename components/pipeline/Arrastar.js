"use client";
// Arrastar e largar no pipeline, com o "drag and drop" que já vem no HTML5 (sem bibliotecas).
//
//  - CartaoArrastavel: o cartão de um cliente, que se pode agarrar com o rato.
//  - ColunaArrastavel: uma coluna (fase) onde se pode largar um cartão.
//
// Ao largar, chamamos a MESMA Server Action dos botões (mudarEstado): a validação,
// o RLS e o registo no histórico são exatamente os mesmos.
// O conteúdo dos cartões continua a ser feito no servidor e chega aqui como "children".
// No telemóvel o arrastar não funciona bem, por isso os botões de fase continuam lá.

import { useState, useTransition } from "react";
import { mudarEstado } from "@/lib/acoes/clientes";
import styles from "./Arrastar.module.css";

// "tipo" dos dados arrastados: assim as colunas só aceitam cartões de clientes
// (e não, por exemplo, um texto ou um link arrastado de outro sítio)
const TIPO = "application/x-flowcrm-cliente";

export function CartaoArrastavel({ id, estado, className, children }) {
  const [aArrastar, setAArrastar] = useState(false);

  function comecar(e) {
    // guarda o id e a fase de origem dentro do arrasto
    e.dataTransfer.setData(TIPO, JSON.stringify({ id, estado }));
    e.dataTransfer.effectAllowed = "move";
    setAArrastar(true);
  }

  return (
    <article
      draggable
      onDragStart={comecar}
      onDragEnd={() => setAArrastar(false)}
      className={`${className} ${styles.cartao} ${aArrastar ? styles.aArrastar : ""}`}
    >
      {children}
    </article>
  );
}

export function ColunaArrastavel({ estado, className, style, children }) {
  const [porCima, setPorCima] = useState(false); // há um cartão a passar por cima?
  // useTransition: "isPending" fica true enquanto o servidor muda a fase e a página é atualizada
  const [aMover, iniciarTransicao] = useTransition();

  // enquanto se arrasta por cima: aceitar a largada (preventDefault) e iluminar a coluna
  function passarPorCima(e) {
    if (!e.dataTransfer.types.includes(TIPO)) return; // não é um cartão: não aceitamos
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setPorCima(true);
  }

  // "dragleave" também dispara ao passar para um elemento de dentro da coluna:
  // só apagamos o destaque se o rato saiu mesmo da coluna
  function sair(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setPorCima(false);
  }

  function largar(e) {
    e.preventDefault();
    setPorCima(false);

    let dados;
    try {
      dados = JSON.parse(e.dataTransfer.getData(TIPO));
    } catch {
      return; // dados estranhos: ignorar
    }
    if (dados.estado === estado) return; // largou na mesma coluna: nada a fazer

    // o mesmo formato que os formulários dos botões enviam
    const formData = new FormData();
    formData.set("id", dados.id);
    formData.set("estado", estado);
    iniciarTransicao(() => mudarEstado(formData));
  }

  return (
    <section
      className={`${className} ${porCima ? styles.porCima : ""} ${aMover ? styles.aMover : ""}`}
      style={style}
      onDragOver={passarPorCima}
      onDragLeave={sair}
      onDrop={largar}
      aria-busy={aMover}
    >
      {children}
    </section>
  );
}
