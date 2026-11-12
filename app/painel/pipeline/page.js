import Link from "next/link";
import { obterSessao } from "@/lib/sessao";
import { ESTADOS, formatarEuros } from "@/lib/estados";
import { iniciais } from "@/lib/texto";
import Icone from "@/components/Icone";
import BotoesFase from "@/components/clientes/BotoesFase";
import { CartaoArrastavel, ColunaArrastavel } from "@/components/pipeline/Arrastar";
import styles from "./pipeline.module.css";

// Rota /painel/pipeline — os clientes organizados por fase, em colunas.
// Para mudar de fase: arrastar o cartão para outra coluna (no computador)
// ou usar os botões do cartão (componente BotoesFase, funciona também no telemóvel).
export const metadata = { title: "Pipeline · FlowCRM" };

// soma dos valores previstos de uma lista de clientes (valores vazios contam 0)
const somar = (lista) => lista.reduce((soma, c) => soma + (Number(c.valor_previsto) || 0), 0);


export default async function PaginaPipeline() {
  const { supabase, eAdmin } = await obterSessao();

  // o RLS já filtra: admin vê todos, comercial só os seus
  const { data } = await supabase
    .from("clientes")
    .select("id, nome, email, estado, valor_previsto, perfis(nome)")
    .order("criado_em", { ascending: false });
  const clientes = data ?? [];

  // "em aberto" = negócios ainda por decidir (novos + em negociação)
  const emAberto = clientes.filter((c) => c.estado === "novo" || c.estado === "negociacao");
  const nNegociacao = clientes.filter((c) => c.estado === "negociacao").length;

  return (
    <div className={styles.pagina}>
      <header className={styles.cabecalho}>
        <h1>Pipeline.</h1>
        <p className={styles.resumo}>
          {formatarEuros(somar(emAberto))} em aberto em {emAberto.length}{" "}
          {emAberto.length === 1 ? "cliente" : "clientes"}
          <span>·</span>
          {nNegociacao} em negociação
        </p>
      </header>

      {/* bloco que agrupa as colunas (como o "Stage Board" da referência) */}
      <section className={styles.bloco}>
        <header className={styles.topoBloco}>
          <h2>Fases</h2>
          <small>
            {clientes.length} {clientes.length === 1 ? "cliente" : "clientes"} · arrasta os cartões ou usa os botões para mudar de fase
          </small>
        </header>

        <div className={styles.quadro}>
          {ESTADOS.map((estado) => {
            const daColuna = clientes.filter((c) => c.estado === estado.chave);

            return (
              // coluna onde se podem largar cartões (componente de cliente)
              <ColunaArrastavel
                key={estado.chave}
                estado={estado.chave}
                className={styles.coluna}
                style={{ "--cor": estado.cor }}
              >
                <header className={styles.topoColuna}>
                  <h3>
                    <i aria-hidden="true"></i>
                    {estado.texto}
                  </h3>
                  <small>
                    {daColuna.length} · {formatarEuros(somar(daColuna))}
                  </small>
                </header>

                {daColuna.length === 0 && <p className={styles.vazia}>Nenhum cliente nesta fase.</p>}

                {daColuna.map((c) => {
                  const responsavel = c.perfis?.nome;
                  return (
                    // cartão que se pode arrastar para outra coluna
                    <CartaoArrastavel key={c.id} id={c.id} estado={c.estado} className={styles.cartao}>
                      <div className={styles.linhaNome}>
                        {/* draggable={false}: ao agarrar no nome, arrasta-se o cartão e não o link */}
                        <Link href={`/painel/clientes/${c.id}`} className={styles.nome} draggable={false}>
                          {c.nome}
                        </Link>
                        <strong className={styles.valor}>
                          {c.valor_previsto !== null ? formatarEuros(c.valor_previsto) : "—"}
                        </strong>
                      </div>
                      {c.email && <p className={styles.email}>{c.email}</p>}

                      <div className={styles.rodapeCartao}>
                        {/* o admin vê quem é o responsável; o comercial já sabe que é ele */}
                        {eAdmin && (
                          <span
                            className={responsavel ? styles.avatar : `${styles.avatar} ${styles.semAvatar}`}
                            title={responsavel ?? "Por atribuir"}
                          >
                            {responsavel ? iniciais(responsavel) : "?"}
                          </span>
                        )}

                        <BotoesFase cliente={c} className={styles.botoes} />
                      </div>
                    </CartaoArrastavel>
                  );
                })}

                {/* os clientes novos entram sempre na fase "Novo" */}
                {estado.chave === "novo" && (
                  <Link href="/painel/clientes/novo" className={styles.adicionar}>
                    <Icone nome="mais" tamanho={15} /> Novo cliente
                  </Link>
                )}
              </ColunaArrastavel>
            );
          })}
        </div>
      </section>
    </div>
  );
}
