"use client";
// Lista de tarefas da ficha do cliente.
// A caixa de cada tarefa só SELECIONA; as ações (Marcar como feita, Pôr por fazer,
// Apagar) aparecem numa barra por cima da lista quando há tarefas selecionadas.
// Clicar no título abre o painel para editar a tarefa (EditarTarefa.js).

import Link from "next/link";
import { formatarDiaCurto, situacaoPrazo } from "@/lib/datas";
import { BarraSelecao, Caixa, useSelecao } from "./Selecao";
import EditarTarefa from "./EditarTarefa";
import styles from "./Tarefas.module.css";

export default function ListaTarefas({
  tarefas,
  mostrarCliente = false,
  mostrarResponsavel = false,
  mensagemVazia,
  membros = null,
  perfilId = "",
}) {
  const selecao = useSelecao(tarefas);

  if (tarefas.length === 0) return <p className={styles.vazio}>{mensagemVazia}</p>;

  return (
    <div className={styles.comSelecao}>
      <BarraSelecao selecao={selecao} />

      <ul className={styles.lista}>
        {tarefas.map((t) => {
          const situacao = situacaoPrazo(t.data_limite, t.concluida);
          const marcada = selecao.marcada(t.id);
          const classes = [styles.tarefa, t.concluida && styles.feita, marcada && styles.marcada].filter(Boolean).join(" ");

          return (
            <li key={t.id} className={classes}>
              <Caixa
                id={`lista-${t.id}`}
                marcada={marcada}
                onChange={() => selecao.alternar(t.id)}
                rotulo={`Selecionar: ${t.titulo}`}
              />

              <div className={styles.corpo}>
                {/* clicar no título abre o painel para editar */}
                <EditarTarefa
                  tarefa={t}
                  membros={membros}
                  podeEditar={membros !== null || t.responsavel_id === perfilId}
                  className={styles.titulo}
                />
                <span className={styles.detalhes}>
                  {mostrarCliente && t.clientes && (
                    <Link href={`/painel/clientes/${t.cliente_id}`}>{t.clientes.nome}</Link>
                  )}
                  {mostrarResponsavel && <span>{t.perfis?.nome ?? "Sem responsável"}</span>}
                  {t.concluida && <span className={styles.feitaTexto}>Feita</span>}
                  {t.data_limite && <span>{formatarDiaCurto(t.data_limite)}</span>}
                  {situacao === "atrasada" && <span className={styles.atrasada}>Atrasada</span>}
                  {situacao === "hoje" && <span className={styles.hoje}>Hoje</span>}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
