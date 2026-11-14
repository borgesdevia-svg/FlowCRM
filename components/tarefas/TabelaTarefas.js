"use client";
// Tabela de tarefas: uma linha por tarefa (Tarefa / Cliente / Data limite / Responsável / Estado).
// Usada no Início, na página Tarefas e no dia escolhido do Calendário.
// A caixa à esquerda só SELECIONA (não conclui logo). Com uma ou mais selecionadas
// aparece a barra de ações (Selecao.js): Marcar como feita, Adiar, Apagar...
// Clicar no título abre o painel para editar a tarefa (EditarTarefa.js).
// No telemóvel, cada linha vira um bloco (ver o CSS), para não ser preciso deslizar.
//
// Props:
//  - membros: a equipa (só o admin; permite mudar o responsável ao editar)
//  - perfilId: quem está a ver (o comercial só edita as suas tarefas)
//  - mostrarResponsavel / mostrarEstado: colunas opcionais

import Link from "next/link";
import { formatarDiaCurto, prazoRelativo } from "@/lib/datas";
import { BarraSelecao, Caixa, useSelecao } from "./Selecao";
import EditarTarefa from "./EditarTarefa";
import styles from "./TabelaTarefas.module.css";
// estado de cada tarefa a partir da data limite (as datas AAAA-MM-DD comparam-se como texto)
function estadoDaTarefa(dataLimite, hoje) {
  if (!dataLimite) return { texto: "Sem data", classe: styles.semData };
  if (dataLimite < hoje) return { texto: "Atrasada", classe: styles.atrasada };
  if (dataLimite === hoje) return { texto: "Hoje", classe: styles.hoje };
  return { texto: "Próxima", classe: styles.proxima };
}

export default function TabelaTarefas({
  tarefas,
  hoje,
  mensagemVazia,
  membros = null,
  perfilId = "",
  mostrarResponsavel = false,
  mostrarEstado = true,
}) {
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
              {mostrarResponsavel && <th>Responsável</th>}
              {mostrarEstado && <th>Estado</th>}
            </tr>
          </thead>
          <tbody>
            {tarefas.map((t) => {
              const estado = t.concluida ? { texto: "Feita", classe: styles.semData } : estadoDaTarefa(t.data_limite, hoje);
              const marcada = selecao.marcada(t.id);
              return (
                <tr key={t.id} className={marcada ? styles.linhaMarcada : undefined}>
                  <td className={styles.colVisto}>
                    <Caixa
                      id={`tarefa-${t.id}`}
                      marcada={marcada}
                      onChange={() => selecao.alternar(t.id)}
                      rotulo={`Selecionar: ${t.titulo}`}
                    />
                  </td>
                  <td className={styles.titulo}>
                    <EditarTarefa
                      tarefa={t}
                      membros={membros}
                      podeEditar={membros !== null || t.responsavel_id === perfilId}
                      className={t.concluida ? styles.tituloFeito : undefined}
                    />
                  </td>
                  <td className={styles.colCliente}>
                    <Link href={`/painel/clientes/${t.cliente_id}`} className={styles.cliente}>
                      {t.clientes?.nome ?? "—"}
                    </Link>
                  </td>
                  <td className={styles.data}>
                    {t.data_limite ? (
                      <>
                        {formatarDiaCurto(t.data_limite)}
                        {/* "há 3 dias", "amanhã"... (nas feitas já não interessa) */}
                        {!t.concluida && <span className={styles.relativa}> · {prazoRelativo(t.data_limite, hoje)}</span>}
                      </>
                    ) : (
                      "Sem data"
                    )}
                  </td>
                  {mostrarResponsavel && (
                    <td className={styles.responsavel}>{t.perfis?.nome ?? "Sem responsável"}</td>
                  )}
                  {mostrarEstado && (
                    <td>
                      <span className={`${styles.estado} ${estado.classe}`}>{estado.texto}</span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
