import Link from "next/link";
import Icone from "@/components/Icone";
import { tempoRelativo } from "@/lib/datas";
import styles from "./AtividadeRecente.module.css";

// Coluna "Atividade recente" do painel inicial (como o "Recent Activity" da referência).
// Componente de servidor: recebe a lista de eventos já preparada pela página.
// Cada evento: { id, tipo ("novo" | "fase" | "tarefa"), quando, autor, antes, depois, clienteId, clienteNome }
// A frase fica: [autor] [antes] [nome do cliente] [depois]
// Ex.: "Rui" "moveu" "Marta Silva" "para Em negociação"

const ICONES = { novo: "utilizadorMais", fase: "subida", tarefa: "visto" };

export default function AtividadeRecente({ eventos }) {
  return (
    <section className={styles.atividade}>
      <header className={styles.topo}>
        <h2>Atividade recente</h2>
      </header>

      {eventos.length === 0 ? (
        <p className={styles.vazio}>
          Ainda não há atividade. Quando a equipa mudar clientes de fase ou concluir tarefas, aparece aqui.
        </p>
      ) : (
        <ol className={styles.lista}>
          {eventos.map((e) => (
            <li key={e.id} className={`${styles.evento} ${styles[e.tipo]}`}>
              <span className={styles.icone}>
                <Icone nome={ICONES[e.tipo]} tamanho={14} />
              </span>
              <div className={styles.corpo}>
                <p>
                  {e.autor && <strong>{e.autor} </strong>}
                  {e.antes}{" "}
                  <Link href={`/painel/clientes/${e.clienteId}`} className={styles.cliente}>
                    {e.clienteNome}
                  </Link>
                  {e.depois && ` ${e.depois}`}
                </p>
                {/* <time> diz ao browser que é uma data; dateTime tem a data exata */}
                <time dateTime={e.quando}>{tempoRelativo(e.quando)}</time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
