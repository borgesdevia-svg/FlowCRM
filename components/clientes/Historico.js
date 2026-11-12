import FormNota from "./FormNota";
import BotaoConfirmar from "@/components/BotaoConfirmar";
import { apagarInteracao } from "@/lib/acoes/interacoes";
import styles from "./Historico.module.css";

// Secção "Histórico" da ficha do cliente: formulário + lista de notas.
// Componente de SERVIDOR: recebe as notas já lidas da base de dados pela página.

const NOMES_TIPOS = { nota: "Nota", chamada: "Chamada", email: "Email", reuniao: "Reunião" };

// data e hora em português, ex.: "12 nov. 2026, 15:42"
const formatarDataHora = (data) =>
  new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(data));

export default function Historico({ clienteId, interacoes, perfilId, eAdmin }) {
  return (
    <section className={styles.seccao}>
      <h2>Histórico</h2>
      <FormNota clienteId={clienteId} />

      {interacoes.length === 0 ? (
        <p className={styles.vazio}>Ainda não há registos. Escreve o primeiro depois de falares com o cliente.</p>
      ) : (
        <ol className={styles.lista}>
          {interacoes.map((i) => (
            <li key={i.id} className={styles.item}>
              <div className={styles.cabecalho}>
                <span className={`${styles.etiqueta} ${styles[i.tipo]}`}>{NOMES_TIPOS[i.tipo]}</span>
                <span className={styles.meta}>
                  {/* o autor pode ter sido removido da equipa: nesse caso fica "Ex-membro" */}
                  {i.perfis?.nome ?? "Ex-membro"}, {formatarDataHora(i.criado_em)}
                </span>
                {/* só o autor ou o admin vê o botão (o RLS também o garante na base de dados) */}
                {(i.autor_id === perfilId || eAdmin) && (
                  <BotaoConfirmar
                    accao={apagarInteracao}
                    campos={{ id: i.id, cliente_id: clienteId }}
                    pergunta="Apagar este registo?"
                    className={styles.apagar}
                  >
                    Apagar
                  </BotaoConfirmar>
                )}
              </div>
              {/* white-space: pre-line no CSS mantém as mudanças de linha do texto */}
              <p className={styles.texto}>{i.nota}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
