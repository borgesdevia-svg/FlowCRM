import Link from "next/link";
import BotaoConfirmar from "@/components/BotaoConfirmar";
import { alternarTarefa, apagarTarefa } from "@/lib/acoes/tarefas";
import { formatarDiaCurto } from "@/lib/datas";
import base from "./Tarefas.module.css";
import styles from "./QuadroTarefas.module.css";

// Quadro de tarefas (inspirado na referência H): uma coluna por situação,
// com um cartão por tarefa. Recebe as colunas já preparadas pela página:
// [{ chave, titulo, tarefas, vazio }]. Componente de servidor.
// Não há arrastar: a coluna de uma tarefa depende da data, não de uma escolha.
export default function QuadroTarefas({ colunas, mostrarResponsavel = false }) {
  return (
    // em ecrãs estreitos as colunas deslizam para o lado
    <div className={styles.quadro}>
      {colunas.map((col) => (
        <section key={col.chave} className={`${styles.coluna} ${styles[col.chave]}`} aria-label={col.titulo}>
          <header className={styles.topoColuna}>
            <h2>{col.titulo}</h2>
            <span>{col.tarefas.length}</span>
          </header>

          {col.tarefas.length === 0 ? (
            <p className={styles.vazio}>{col.vazio}</p>
          ) : (
            <ul className={styles.cartoes}>
              {col.tarefas.map((t) => (
                <li key={t.id} className={t.concluida ? `${styles.cartao} ${styles.feita} ${base.feita}` : styles.cartao}>
                  <div className={styles.linhaTitulo}>
                    {/* círculo para marcar/desmarcar: um formulário com um só botão */}
                    <form action={alternarTarefa}>
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="cliente_id" value={t.cliente_id} />
                      <input type="hidden" name="concluida" value={String(t.concluida)} />
                      <button
                        type="submit"
                        className={base.visto}
                        aria-label={
                          t.concluida ? `Marcar "${t.titulo}" como por fazer` : `Marcar "${t.titulo}" como feita`
                        }
                      ></button>
                    </form>
                    <span className={styles.titulo}>{t.titulo}</span>
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

                  <BotaoConfirmar
                    accao={apagarTarefa}
                    campos={{ id: t.id, cliente_id: t.cliente_id }}
                    pergunta="Apagar esta tarefa?"
                    className={styles.apagar}
                  >
                    Apagar
                  </BotaoConfirmar>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
