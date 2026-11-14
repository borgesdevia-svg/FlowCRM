"use client";
// Tabela de tarefas do Início: uma linha por tarefa (Tarefa / Cliente / Data limite / Estado).
// A caixa à esquerda só SELECIONA (não conclui logo). Com uma ou mais selecionadas
// aparece uma barra com duas ações: "Apagar" (pede confirmação) e "Marcar como feita".

import { useState, useTransition } from "react";
import Link from "next/link";
import { apagarTarefas, concluirTarefas } from "@/lib/acoes/tarefas";
import { formatarDiaCurto } from "@/lib/datas";
import styles from "./TabelaTarefas.module.css";

// estado de cada tarefa a partir da data limite (as datas AAAA-MM-DD comparam-se como texto)
function estadoDaTarefa(dataLimite, hoje) {
  if (!dataLimite) return { texto: "Sem data", classe: styles.semData };
  if (dataLimite < hoje) return { texto: "Atrasada", classe: styles.atrasada };
  if (dataLimite === hoje) return { texto: "Hoje", classe: styles.hoje };
  return { texto: "Próxima", classe: styles.proxima };
}

export default function TabelaTarefas({ tarefas, hoje, mensagemVazia }) {
  const [selecionadas, setSelecionadas] = useState(() => new Set());
  const [confirmarApagar, setConfirmarApagar] = useState(false);
  const [aTrabalhar, iniciar] = useTransition();

  if (tarefas.length === 0) return <p className={styles.vazio}>{mensagemVazia}</p>;

  const ids = tarefas.map((t) => t.id);
  // só contam as que ainda estão na tabela (depois de concluir/apagar, desaparecem)
  const escolhidas = ids.filter((id) => selecionadas.has(id));
  const n = escolhidas.length;
  const tudo = n === ids.length;

  function alternar(id) {
    setConfirmarApagar(false);
    setSelecionadas((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function limpar() {
    setConfirmarApagar(false);
    setSelecionadas(new Set());
  }

  function executar(acao) {
    iniciar(async () => {
      await acao(escolhidas);
      limpar();
    });
  }

  return (
    <>
      {/* barra das ações: só aparece com alguma tarefa selecionada */}
      {n > 0 && (
        <div className={styles.barra} role="region" aria-label="Ações para as tarefas selecionadas">
          <span className={styles.contagem}>
            {n} {n === 1 ? "selecionada" : "selecionadas"}
          </span>
          <div className={styles.acoes}>
            <button type="button" className={styles.botaoTexto} onClick={limpar} disabled={aTrabalhar}>
              Cancelar
            </button>
            {confirmarApagar ? (
              <button
                type="button"
                className={styles.botaoApagarConfirmar}
                onClick={() => executar(apagarTarefas)}
                disabled={aTrabalhar}
              >
                {aTrabalhar ? "A apagar…" : n === 1 ? "Sim, apagar" : `Sim, apagar ${n}`}
              </button>
            ) : (
              <button
                type="button"
                className={styles.botaoApagar}
                onClick={() => setConfirmarApagar(true)}
                disabled={aTrabalhar}
              >
                Apagar
              </button>
            )}
            <button
              type="button"
              className={`botao ${styles.botaoFeita}`}
              onClick={() => executar(concluirTarefas)}
              disabled={aTrabalhar}
            >
              {aTrabalhar && !confirmarApagar ? "A concluir…" : n === 1 ? "Marcar como feita" : "Marcar como feitas"}
            </button>
          </div>
        </div>
      )}

      {/* em ecrãs estreitos a tabela desliza para o lado em vez de rebentar */}
      <div className={styles.rolar}>
        <table className={styles.tabela}>
          <thead>
            <tr>
              <th className={styles.colVisto}>
                <input
                  type="checkbox"
                  className={styles.caixa}
                  checked={tudo}
                  onChange={() => (tudo ? limpar() : setSelecionadas(new Set(ids)))}
                  aria-label={tudo ? "Tirar a seleção de todas" : "Selecionar todas"}
                />
              </th>
              <th>Tarefa</th>
              <th>Cliente</th>
              <th>Data limite</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {tarefas.map((t) => {
              const estado = estadoDaTarefa(t.data_limite, hoje);
              const marcada = selecionadas.has(t.id);
              return (
                <tr key={t.id} className={marcada ? styles.linhaMarcada : undefined}>
                  <td className={styles.colVisto}>
                    <input
                      id={`tarefa-${t.id}`}
                      type="checkbox"
                      className={styles.caixa}
                      checked={marcada}
                      onChange={() => alternar(t.id)}
                    />
                  </td>
                  <td className={styles.titulo}>
                    {/* o título é a etiqueta da caixa: clicar nele também seleciona */}
                    <label htmlFor={`tarefa-${t.id}`}>{t.titulo}</label>
                  </td>
                  <td>
                    <Link href={`/painel/clientes/${t.cliente_id}`} className={styles.cliente}>
                      {t.clientes?.nome ?? "—"}
                    </Link>
                  </td>
                  <td className={styles.data}>{t.data_limite ? formatarDiaCurto(t.data_limite) : "—"}</td>
                  <td>
                    <span className={`${styles.estado} ${estado.classe}`}>{estado.texto}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
