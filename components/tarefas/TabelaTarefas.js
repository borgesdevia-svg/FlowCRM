"use client";
// Tabela de tarefas do Início: uma linha por tarefa (Tarefa / Cliente / Data limite / Estado).
// A caixa à esquerda só SELECIONA (não conclui logo). Com uma ou mais selecionadas
// aparece a barra de ações (Selecao.js): Apagar ou Marcar como feita.

import Link from "next/link";
import { formatarDiaCurto } from "@/lib/datas";
import { BarraSelecao, Caixa, useSelecao } from "./Selecao";
import styles from "./TabelaTarefas.module.css";

// estado de cada tarefa a partir da data limite (as datas AAAA-MM-DD comparam-se como texto)
function estadoDaTarefa(dataLimite, hoje) {
  if (!dataLimite) return { texto: "Sem data", classe: styles.semData };
  if (dataLimite < hoje) return { texto: "Atrasada", classe: styles.atrasada };
  if (dataLimite === hoje) return { texto: "Hoje", classe: styles.hoje };
  return { texto: "Próxima", classe: styles.proxima };
}

export default function TabelaTarefas({ tarefas, hoje, mensagemVazia }) {
  const selecao = useSelecao(tarefas);

  if (tarefas.length === 0) return <p className={styles.vazio}>{mensagemVazia}</p>;

  return (
    <>
      <BarraSelecao selecao={selecao} className={styles.barra} />

      {/* em ecrãs estreitos a tabela desliza para o lado em vez de rebentar */}
      <div className={styles.rolar}>
        <table className={styles.tabela}>
          <thead>
            <tr>
              <th className={styles.colVisto}>
                <Caixa
                  marcada={selecao.todas}
                  onChange={() => (selecao.todas ? selecao.limpar() : selecao.selecionarTodas())}
                  rotulo={selecao.todas ? "Tirar a seleção de todas" : "Selecionar todas"}
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
              const marcada = selecao.marcada(t.id);
              return (
                <tr key={t.id} className={marcada ? styles.linhaMarcada : undefined}>
                  <td className={styles.colVisto}>
                    <Caixa id={`tarefa-${t.id}`} marcada={marcada} onChange={() => selecao.alternar(t.id)} />
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
