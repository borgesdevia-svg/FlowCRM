import Link from "next/link";
import FormNota from "./FormNota";
import BotaoConfirmar from "@/components/BotaoConfirmar";
import Icone from "@/components/Icone";
import { apagarInteracao } from "@/lib/acoes/interacoes";
import styles from "./Historico.module.css";

// Secção "Histórico" da ficha do cliente: formulário + linha do tempo.
// Componente de SERVIDOR: recebe as notas já lidas da base de dados pela página.

// nome e ícone de cada tipo de registo (a cor de cada um está no CSS)
const TIPOS = {
  nota: { texto: "Nota", icone: "mensagem" },
  chamada: { texto: "Chamada", icone: "telemovel" },
  email: { texto: "Email", icone: "email" },
  reuniao: { texto: "Reunião", icone: "utilizadores" },
  sistema: { texto: "Automático", icone: "raio" }, // eventos registados pela app (ex.: mudança de fase)
};

// data e hora em português, ex.: "12 nov. 2026, 15:42"
const formatarDataHora = (data) =>
  new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(data));

// "total" é quantos registos o cliente tem; se for mais do que os que vieram,
// aparece no fim o link "Ver mais antigos" (linkMais), que pede mais à página.
export default function Historico({ clienteId, interacoes, total, linkMais, perfilId, eAdmin }) {
  return (
    <section className={styles.seccao}>
      <h2>
        Histórico <span>{total} {total === 1 ? "registo" : "registos"}</span>
      </h2>
      <FormNota clienteId={clienteId} />

      {interacoes.length === 0 ? (
        <p className={styles.vazio}>Ainda não há registos. Escreve o primeiro depois de falares com o cliente.</p>
      ) : (
        <ol className={styles.lista}>
          {interacoes.map((i) => {
            const tipo = TIPOS[i.tipo] ?? TIPOS.nota;
            return (
              <li key={i.id} className={`${styles.item} ${styles[i.tipo]}`}>
                {/* ícone do tipo, em cima da linha do tempo */}
                <span className={styles.icone}>
                  <Icone nome={tipo.icone} tamanho={15} />
                </span>

                <div className={styles.corpo}>
                  <div className={styles.cabecalho}>
                    <span className={styles.etiqueta}>{tipo.texto}</span>
                    <span className={styles.meta}>
                      {/* o autor pode ter sido removido da equipa: nesse caso fica "Ex-membro" */}
                      {i.perfis?.nome ?? "Ex-membro"} · {formatarDataHora(i.criado_em)}
                    </span>
                    {/* só o autor ou o admin vê o botão (o RLS também o garante na base de dados);
                        os eventos automáticos não se apagam, porque são o registo do que aconteceu */}
                    {i.tipo !== "sistema" && (i.autor_id === perfilId || eAdmin) && (
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
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {/* scroll: false = a página não salta para o topo ao carregar os mais antigos */}
      {total > interacoes.length && (
        <Link href={linkMais} scroll={false} className={`botao botao-secundario ${styles.verMais}`}>
          Ver mais antigos ({total - interacoes.length})
        </Link>
      )}
    </section>
  );
}
