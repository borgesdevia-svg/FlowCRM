import Link from "next/link";
import { alternarTarefa } from "@/lib/acoes/tarefas";
import { formatarDiaCurto, hojeEmPortugal } from "@/lib/datas";
import base from "./Tarefas.module.css";
import styles from "./TabelaTarefas.module.css";

// Tabela de tarefas do Início (inspirada no "Upcoming Task" da referência B):
// uma linha por tarefa, com colunas Tarefa / Cliente / Data limite / Estado.
// O círculo à esquerda marca a tarefa como feita (o mesmo formulário da ListaTarefas).

// estado de cada tarefa a partir da data limite (as datas AAAA-MM-DD comparam-se como texto)
function estadoDaTarefa(dataLimite, hoje) {
  if (!dataLimite) return { texto: "Sem data", classe: styles.semData };
  if (dataLimite < hoje) return { texto: "Atrasada", classe: styles.atrasada };
  if (dataLimite === hoje) return { texto: "Hoje", classe: styles.hoje };
  return { texto: "Próxima", classe: styles.proxima };
}

export default function TabelaTarefas({ tarefas, mensagemVazia }) {
  if (tarefas.length === 0) return <p className={styles.vazio}>{mensagemVazia}</p>;

  const hoje = hojeEmPortugal();

  return (
    // em ecrãs estreitos a tabela desliza para o lado em vez de rebentar
    <div className={styles.rolar}>
      <table className={styles.tabela}>
        <thead>
          <tr>
            {/* coluna do círculo: só para leitores de ecrã */}
            <th className={styles.colVisto}>
              <span className={styles.escondido}>Feita</span>
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
            return (
              <tr key={t.id}>
                <td className={styles.colVisto}>
                  <form action={alternarTarefa}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="cliente_id" value={t.cliente_id} />
                    <input type="hidden" name="concluida" value={String(t.concluida)} />
                    <button
                      type="submit"
                      className={base.visto}
                      aria-label={`Marcar "${t.titulo}" como feita`}
                    ></button>
                  </form>
                </td>
                <td className={styles.titulo}>{t.titulo}</td>
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
  );
}
