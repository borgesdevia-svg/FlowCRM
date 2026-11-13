import Link from "next/link";
import { obterSessao } from "@/lib/sessao";
import { ESTADOS, formatarEuros } from "@/lib/estados";
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
    <div className={`entrar ${styles.pagina}`}>
      <header className={styles.cabecalho}>
        <div>
          <h1>Pipeline</h1>
          <p className={styles.resumo}>
            {formatarEuros(somar(emAberto))} em aberto em {emAberto.length}{" "}
            {emAberto.length === 1 ? "cliente" : "clientes"}, {nNegociacao} em negociação.
          </p>
        </div>
        <Link href="/painel/clientes/novo" className="botao">
          <Icone nome="mais" tamanho={16} /> Novo cliente
        </Link>
      </header>

      {/* contadores, um por fase: o valor em jogo e quantos clientes (como na página Tarefas) */}
      <section className={styles.contadores} aria-label="Resumo por fase">
        {ESTADOS.map((estado) => {
          const daFase = clientes.filter((c) => c.estado === estado.chave);
          return (
            <div key={estado.chave} className={styles.contador} style={{ "--cor": estado.cor }}>
              <span className={styles.fase}>
                <i aria-hidden="true"></i>
                {estado.texto}
              </span>
              <strong>{formatarEuros(somar(daFase))}</strong>
              <small>
                {daFase.length} {daFase.length === 1 ? "cliente" : "clientes"}
              </small>
            </div>
          );
        })}
      </section>

      <p className={styles.dica}>Arrasta os cartões para outra coluna ou usa os botões de cada cartão.</p>

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
              {/* título numa faixa com um traço da cor da fase em cima */}
              <header className={styles.topoColuna}>
                <h2>{estado.texto}</h2>
                <span>{daColuna.length}</span>
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

                    {/* dados em pares "nome: valor", iguais aos cartões das tarefas */}
                    <dl className={styles.dados}>
                      <div>
                        <dt>Email</dt>
                        <dd>{c.email ?? "Sem email"}</dd>
                      </div>
                      {/* o admin vê quem é o responsável; o comercial já sabe que é ele */}
                      {eAdmin && (
                        <div>
                          <dt>Responsável</dt>
                          <dd>{responsavel ?? "Por atribuir"}</dd>
                        </div>
                      )}
                    </dl>

                    <BotoesFase cliente={c} className={styles.botoes} />
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
    </div>
  );
}
