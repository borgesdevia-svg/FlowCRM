"use client";
// Quadro de tarefas (inspirado na referência H): uma coluna por situação,
// com um cartão por tarefa. Recebe as colunas já preparadas pela página:
// [{ chave, titulo, tarefas, maisTarde?, vazio }].
// Não há arrastar: a coluna de uma tarefa depende da data, não de uma escolha.
//
// Cada cartão tem uma caixa que só SELECIONA; as ações (Marcar como feita,
// Pôr por fazer, Apagar) ficam na barra por cima do quadro (Selecao.js).
//
// Para o quadro não crescer sem fim, cada coluna mostra no máximo MAX_VISIVEIS
// cartões; o resto abre num "Mostrar mais". Na coluna Próximas, o que é para
// depois da semana fica em "Mais tarde", fechado.

import Link from "next/link";
import { formatarDiaCurto } from "@/lib/datas";
import { BarraSelecao, Caixa, useSelecao } from "./Selecao";
import base from "./Tarefas.module.css";
import styles from "./QuadroTarefas.module.css";

const MAX_VISIVEIS = 5;

export default function QuadroTarefas({ colunas, mostrarResponsavel = false }) {
  const todas = colunas.flatMap((c) => [...c.tarefas, ...(c.maisTarde ?? [])]);
  const selecao = useSelecao(todas);

  // lista de cartões (usada para os visíveis e para os que abrem em "Mostrar mais")
  const cartoes = (lista) => (
    <ul className={styles.cartoes}>
      {lista.map((t) => (
        <Cartao
          key={t.id}
          t={t}
          mostrarResponsavel={mostrarResponsavel}
          marcada={selecao.marcada(t.id)}
          alternar={() => selecao.alternar(t.id)}
        />
      ))}
    </ul>
  );

  return (
    <>
      {/* barra das ações: presa ao topo enquanto se desce o quadro */}
      <BarraSelecao selecao={selecao} className={styles.barra} />

      {/* em ecrãs estreitos as colunas deslizam para o lado */}
      <div className={styles.quadro}>
        {colunas.map((col) => {
          const visiveis = col.tarefas.slice(0, MAX_VISIVEIS);
          const resto = col.tarefas.slice(MAX_VISIVEIS);
          const maisTarde = col.maisTarde ?? [];

          return (
            <section key={col.chave} className={`${styles.coluna} ${styles[col.chave]}`} aria-label={col.titulo}>
              <header className={styles.topoColuna}>
                <h2>{col.titulo}</h2>
                <span>{col.tarefas.length + maisTarde.length}</span>
              </header>

              {col.tarefas.length === 0 ? <p className={styles.vazio}>{col.vazio}</p> : cartoes(visiveis)}

              {resto.length > 0 && (
                <details className={styles.mais}>
                  <summary>
                    <span className={styles.abrir}>Mostrar mais {resto.length}</span>
                    <span className={styles.fechar}>Mostrar menos</span>
                  </summary>
                  {cartoes(resto)}
                </details>
              )}

              {maisTarde.length > 0 && (
                <details className={styles.mais}>
                  <summary>Mais tarde ({maisTarde.length})</summary>
                  {cartoes(maisTarde)}
                </details>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

// um cartão de tarefa: caixa para selecionar, título e dados
function Cartao({ t, mostrarResponsavel, marcada, alternar }) {
  const classes = [styles.cartao, t.concluida && styles.feita, t.concluida && base.feita, marcada && styles.marcado]
    .filter(Boolean)
    .join(" ");

  return (
    <li className={classes}>
      <div className={styles.linhaTitulo}>
        <Caixa id={`quadro-${t.id}`} marcada={marcada} onChange={alternar} />
        {/* o título é a etiqueta da caixa: clicar nele também seleciona */}
        <label htmlFor={`quadro-${t.id}`} className={styles.titulo}>
          {t.titulo}
        </label>
      </div>

      <dl className={styles.dados}>
        <div>
          <dt>Cliente</dt>
          <dd>
            <Link href={`/painel/clientes/${t.cliente_id}`}>{t.clientes?.nome ?? "—"}</Link>
          </dd>
        </div>
        <div>
          <dt>Até</dt>
          <dd>{t.data_limite ? formatarDiaCurto(t.data_limite) : "Sem data"}</dd>
        </div>
        {mostrarResponsavel && (
          <div>
            <dt>Responsável</dt>
            <dd>{t.perfis?.nome ?? "Sem responsável"}</dd>
          </div>
        )}
      </dl>
    </li>
  );
}
