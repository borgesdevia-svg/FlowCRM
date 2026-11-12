import Link from "next/link";
import BotaoConfirmar from "@/components/BotaoConfirmar";
import { alternarTarefa, apagarTarefa } from "@/lib/acoes/tarefas";
import { formatarDiaCurto, situacaoPrazo } from "@/lib/datas";
import styles from "./Tarefas.module.css";

// Lista de tarefas, usada em dois sítios:
//  - na ficha do cliente (mostrarCliente = false)
//  - no painel inicial, em "As minhas tarefas" (mostrarCliente = true)
export default function ListaTarefas({ tarefas, mostrarCliente = false, mensagemVazia }) {
  if (tarefas.length === 0) return <p className={styles.vazio}>{mensagemVazia}</p>;

  return (
    <ul className={styles.lista}>
      {tarefas.map((t) => {
        const situacao = situacaoPrazo(t.data_limite, t.concluida);

        return (
          <li key={t.id} className={t.concluida ? `${styles.tarefa} ${styles.feita}` : styles.tarefa}>
            {/* círculo para marcar/desmarcar: é um formulário com um só botão */}
            <form action={alternarTarefa}>
              <input type="hidden" name="id" value={t.id} />
              <input type="hidden" name="cliente_id" value={t.cliente_id} />
              <input type="hidden" name="concluida" value={String(t.concluida)} />
              <button
                type="submit"
                className={styles.visto}
                aria-label={t.concluida ? `Marcar "${t.titulo}" como por fazer` : `Marcar "${t.titulo}" como feita`}
              ></button>
            </form>

            <div className={styles.corpo}>
              <span className={styles.titulo}>{t.titulo}</span>
              <span className={styles.detalhes}>
                {mostrarCliente && t.clientes && (
                  <Link href={`/painel/clientes/${t.cliente_id}`}>{t.clientes.nome}</Link>
                )}
                {t.data_limite && <span>{formatarDiaCurto(t.data_limite)}</span>}
                {situacao === "atrasada" && <span className={styles.atrasada}>Atrasada</span>}
                {situacao === "hoje" && <span className={styles.hoje}>Hoje</span>}
              </span>
            </div>

            <BotaoConfirmar
              accao={apagarTarefa}
              campos={{ id: t.id, cliente_id: t.cliente_id }}
              pergunta="Apagar esta tarefa?"
              className={styles.apagar}
            >
              Apagar
            </BotaoConfirmar>
          </li>
        );
      })}
    </ul>
  );
}
