import Link from "next/link";
import BotaoConfirmar from "@/components/BotaoConfirmar";
import { alternarTarefa, apagarTarefa } from "@/lib/acoes/tarefas";
import { formatarDiaCurto } from "@/lib/datas";
import base from "./Tarefas.module.css";
import styles from "./QuadroTarefas.module.css";

// Quadro de tarefas (inspirado na referência H): uma coluna por situação,
// com um cartão por tarefa. Recebe as colunas já preparadas pela página:
// [{ chave, titulo, tarefas, maisTarde?, vazio }]. Componente de servidor.
// Não há arrastar: a coluna de uma tarefa depende da data, não de uma escolha.
//
// Para o quadro não crescer sem fim, cada coluna mostra no máximo MAX_VISIVEIS
// cartões; o resto abre num "Mostrar mais" (<details>, funciona sem JavaScript).
// Na coluna Próximas, o que é para depois da semana fica em "Mais tarde", fechado.

const MAX_VISIVEIS = 5;

export default function QuadroTarefas({ colunas, mostrarResponsavel = false }) {
  // lista de cartões (usada para os visíveis e para os que abrem em "Mostrar mais")
  const cartoes = (lista) => (
    <ul className={styles.cartoes}>
      {lista.map((t) => (
        <Cartao key={t.id} t={t} mostrarResponsavel={mostrarResponsavel} />
      ))}
    </ul>
  );

  return (
    // em ecrãs estreitos as colunas deslizam para o lado
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
  );
}

// um cartão de tarefa: visto para marcar, título, dados e "Apagar"
function Cartao({ t, mostrarResponsavel }) {
  return (
    <li className={t.concluida ? `${styles.cartao} ${styles.feita} ${base.feita}` : styles.cartao}>
      <div className={styles.linhaTitulo}>
        {/* círculo para marcar/desmarcar: um formulário com um só botão */}
        <form action={alternarTarefa}>
          <input type="hidden" name="id" value={t.id} />
          <input type="hidden" name="cliente_id" value={t.cliente_id} />
          <input type="hidden" name="concluida" value={String(t.concluida)} />
          <button
            type="submit"
            className={base.visto}
            aria-label={t.concluida ? `Marcar "${t.titulo}" como por fazer` : `Marcar "${t.titulo}" como feita`}
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
  );
}
