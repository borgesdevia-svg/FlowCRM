import Link from "next/link";
import { obterSessao } from "@/lib/sessao";
import { ESTADOS, formatarEuros } from "@/lib/estados";
import { mudarEstado } from "@/lib/acoes/clientes";
import styles from "./pipeline.module.css";

// Rota /painel/pipeline — os clientes organizados por fase, em colunas.
// Cada cartão tem botões para passar o cliente para a fase seguinte.
export const metadata = { title: "Pipeline · FlowCRM" };

// Para cada estado, que botões aparecem no cartão (e para que estado levam)
const PROXIMOS_PASSOS = {
  novo: [
    { para: "negociacao", texto: "Passar a negociação", principal: true },
    { para: "perdido", texto: "Perdido" },
  ],
  negociacao: [
    { para: "ativo", texto: "Fechar negócio", principal: true },
    { para: "perdido", texto: "Perdido" },
  ],
  ativo: [{ para: "negociacao", texto: "Reabrir negociação" }],
  perdido: [{ para: "novo", texto: "Reabrir" }],
};

export default async function PaginaPipeline() {
  const { supabase, eAdmin } = await obterSessao();

  // o RLS já filtra: admin vê todos, comercial só os seus
  const { data } = await supabase
    .from("clientes")
    .select("id, nome, estado, valor_previsto, perfis(nome)")
    .order("criado_em", { ascending: false });
  const clientes = data ?? [];

  return (
    <div className={styles.pagina}>
      <header>
        <h1>Pipeline</h1>
        <p className={styles.subtitulo}>
          Cada coluna é uma fase do negócio. Usa os botões para mover um cliente para a fase seguinte.
        </p>
      </header>

      <div className={styles.quadro}>
        {ESTADOS.map((estado) => {
          // clientes desta coluna e soma do valor previsto
          const daColuna = clientes.filter((c) => c.estado === estado.chave);
          const total = daColuna.reduce((soma, c) => soma + (Number(c.valor_previsto) || 0), 0);

          return (
            <section key={estado.chave} className={styles.coluna} style={{ "--cor": estado.cor }}>
              <header className={styles.topoColuna}>
                <h2>
                  {estado.texto} <span>{daColuna.length}</span>
                </h2>
                <small>{formatarEuros(total)}</small>
              </header>

              {daColuna.length === 0 && <p className={styles.vazia}>Nenhum cliente nesta fase.</p>}

              {daColuna.map((c) => (
                <article key={c.id} className={styles.cartao}>
                  <Link href={`/painel/clientes/${c.id}`} className={styles.nome}>
                    {c.nome}
                  </Link>
                  <p className={styles.detalhes}>
                    <span>{c.valor_previsto !== null ? formatarEuros(c.valor_previsto) : "Sem valor"}</span>
                    {eAdmin && <span>{c.perfis?.nome ?? "Por atribuir"}</span>}
                  </p>

                  {/* um pequeno formulário por botão: envia o id e o novo estado */}
                  <div className={styles.botoes}>
                    {PROXIMOS_PASSOS[c.estado].map((passo) => (
                      <form key={passo.para} action={mudarEstado}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="estado" value={passo.para} />
                        <button type="submit" className={passo.principal ? styles.botaoPrincipal : styles.botao}>
                          {passo.texto}
                        </button>
                      </form>
                    ))}
                  </div>
                </article>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
