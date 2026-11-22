"use client";
// Secção de preços: dois planos lado a lado, preço POR EMPRESA (não por pessoa).
// Decidido com o aluno a 2026-11-22: CRM Essencial 15 €/mês (até 5 pessoas) e
// CRM Pro 35 €/mês (até 20 pessoas); no anual pagam-se 10 meses (2 grátis);
// 14 dias grátis do Pro, sem cartão. Por agora os pagamentos ainda não são reais.
//
// É um componente de cliente ("use client") só por causa do interruptor Mensal | Anual:
// o useState guarda a escolha e os preços mudam sem recarregar a página.
// Layout: uma moldura única dividida em duas colunas (não dois cartões soltos),
// com o Pro realçado por um brilho verde suave. Cada coluna mostra a lista toda
// das funções com ✓ (incluído) ou ✗ (não incluído), para se ver logo a diferença.

import { useState } from "react";
import Link from "next/link";
import Icone from "@/components/Icone";
import CabecalhoSeccao from "./CabecalhoSeccao";
import styles from "./Precos.module.css";

// para mudar preços ou o que cada plano inclui, basta mexer aqui
const PLANOS = [
  {
    nome: "CRM Essencial",
    descricao: "Para começar a organizar os leads da equipa.",
    mensal: 15,
    pessoas: "Até 5 pessoas",
  },
  {
    nome: "CRM Pro",
    descricao: "Para equipas que querem que o CRM trabalhe por elas.",
    mensal: 35,
    pessoas: "Até 20 pessoas",
    destaque: true,
  },
];

// A mesma lista nos dois planos, para comparar linha a linha:
// o Pro tem tudo (✓); no Essencial, o que é só do Pro aparece com ✗.
const FUNCOES = [
  { texto: "Leads, pipeline e tarefas" },
  { texto: "Notificações e pesquisa rápida" },
  { texto: "Formulário público com as tuas perguntas" },
  { texto: "Importar e exportar CSV" },
  { texto: "Gráfico, tema e menu à maneira da empresa" },
  { texto: "Tarefa “Contactar” automática para cada lead novo", soPro: true },
  { texto: "Leads do formulário distribuídos à vez pela equipa", soPro: true },
  { texto: "Aviso quando um lead fica parado", soPro: true },
  { texto: "Formulário com a tua cor, logótipo e modelos prontos", soPro: true },
  { texto: "Relatórios da equipa: vendas, conversão e tempo até fechar", soPro: true },
];

const MESES_PAGOS_NO_ANUAL = 10; // anual = 12 meses pelo preço de 10

const euros = (n) => `${n} €`;

export default function Precos() {
  const [anual, setAnual] = useState(false);

  return (
    <section id="precos" className={styles.seccao}>
      <CabecalhoSeccao
        titulo="Um preço para a empresa toda"
        subtitulo="Pagas por empresa, não por pessoa. Experimenta o Pro durante 14 dias, sem cartão."
      />

      {/* interruptor Mensal | Anual: dois botões, o ativo fica marcado (aria-pressed) */}
      <div className={styles.periodo} role="group" aria-label="Período de pagamento">
        <button type="button" aria-pressed={!anual} onClick={() => setAnual(false)}>
          Mensal
        </button>
        <button type="button" aria-pressed={anual} onClick={() => setAnual(true)}>
          Anual <span className={styles.poupa}>2 meses grátis</span>
        </button>
      </div>

      <div className={styles.planos}>
        {PLANOS.map((p) => (
          <article key={p.nome} className={p.destaque ? `${styles.plano} ${styles.pro}` : styles.plano}>
            <h3>{p.nome}</h3>
            <p className={styles.descricao}>{p.descricao}</p>

            {/* aria-live: quem usa leitor de ecrã ouve o preço novo ao trocar o período */}
            <p className={styles.preco} aria-live="polite">
              <strong>{euros(anual ? p.mensal * MESES_PAGOS_NO_ANUAL : p.mensal)}</strong>
              <span>{anual ? "/ano" : "/mês"}</span>
            </p>
            <p className={styles.notaPreco}>
              {anual
                ? `Equivale a ${euros(((p.mensal * MESES_PAGOS_NO_ANUAL) / 12).toFixed(2).replace(".", ","))} por mês.`
                : `Ou ${euros(p.mensal * MESES_PAGOS_NO_ANUAL)} por ano, com 2 meses grátis.`}
            </p>

            <Link href="/registo" className={p.destaque ? "botao" : "botao botao-secundario"}>
              Experimentar 14 dias grátis
            </Link>

            <p className={styles.pessoas}>
              <Icone nome="utilizadores" tamanho={17} />
              {p.pessoas}
            </p>

            <ul className={styles.itens}>
              {FUNCOES.map((f) => {
                const tem = p.destaque || !f.soPro;
                return (
                  <li key={f.texto} className={tem ? undefined : styles.naoTem}>
                    <Icone nome={tem ? "visto" : "cruz"} tamanho={16} />
                    {f.texto}
                    {/* para leitores de ecrã, que não "veem" o ✓ e o ✗ */}
                    <span className={styles.leitor}>{tem ? " (incluído)" : " (não incluído)"}</span>
                  </li>
                );
              })}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
