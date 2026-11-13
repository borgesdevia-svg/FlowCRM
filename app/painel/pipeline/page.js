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
//
// Escala: uma coluna pode ter milhares de clientes (ex.: todos em Perdido).
// Por isso cada coluna traz só os CARREGAR mais recentes, mostra os primeiros
// (VISIVEIS) e o resto abre num "Mostrar mais". Se houver ainda mais, há um link
// para a lista de clientes já filtrada por essa fase, que tem páginas.
// Os totais (contadores e números das colunas) vêm da função resumo_clientes.
export const metadata = { title: "Pipeline · FlowCRM" };

const CARREGAR = 30;
// as fases "em curso" mostram mais cartões; as fechadas (ganho/perdido) mostram poucos
const VISIVEIS = { novo: 8, negociacao: 8, ativo: 4, perdido: 3 };

const numero = (n) => new Intl.NumberFormat("pt-PT").format(n);

export default async function PaginaPipeline() {
  const { supabase, eAdmin } = await obterSessao();

  // em paralelo (o RLS já filtra: admin vê todos, comercial só os seus):
  //  - os totais por fase
  //  - os clientes mais recentes de cada fase (uma consulta por fase)
  const [{ data: resumo }, ...porFase] = await Promise.all([
    supabase.rpc("resumo_clientes", { termo: "" }),
    ...ESTADOS.map((e) =>
      supabase
        .from("clientes")
        .select("id, nome, email, estado, valor_previsto, perfis(nome)")
        .eq("estado", e.chave)
        .order("criado_em", { ascending: false })
        .limit(CARREGAR)
    ),
  ]);

  const totais = {};
  for (const r of resumo ?? []) totais[r.estado] = { n: Number(r.n), soma: Number(r.soma) };
  const total = (chave) => totais[chave] ?? { n: 0, soma: 0 };

  // "em aberto" = negócios ainda por decidir (novos + em negociação)
  const emAberto = { n: total("novo").n + total("negociacao").n, soma: total("novo").soma + total("negociacao").soma };

  // um cartão de cliente (usado nos visíveis e nos que abrem em "Mostrar mais")
  const cartao = (c) => (
    <CartaoArrastavel key={c.id} id={c.id} estado={c.estado} className={styles.cartao}>
      <div className={styles.linhaNome}>
        {/* draggable={false}: ao agarrar no nome, arrasta-se o cartão e não o link */}
        <Link href={`/painel/clientes/${c.id}`} className={styles.nome} draggable={false}>
          {c.nome}
        </Link>
        <strong className={styles.valor}>{c.valor_previsto !== null ? formatarEuros(c.valor_previsto) : "—"}</strong>
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
            <dd>{c.perfis?.nome ?? "Por atribuir"}</dd>
          </div>
        )}
      </dl>

      <BotoesFase cliente={c} className={styles.botoes} />
    </CartaoArrastavel>
  );

  return (
    <div className={`entrar ${styles.pagina}`}>
      <header className={styles.cabecalho}>
        <div>
          <h1>Pipeline</h1>
          <p className={styles.resumo}>
            {formatarEuros(emAberto.soma)} em aberto em {numero(emAberto.n)}{" "}
            {emAberto.n === 1 ? "cliente" : "clientes"}, {numero(total("negociacao").n)} em negociação.
          </p>
        </div>
        <Link href="/painel/clientes/novo" className="botao">
          <Icone nome="mais" tamanho={16} /> Novo cliente
        </Link>
      </header>

      {/* contadores, um por fase: o valor em jogo e quantos clientes */}
      <section className={styles.contadores} aria-label="Resumo por fase">
        {ESTADOS.map((estado) => {
          const t = total(estado.chave);
          return (
            <div key={estado.chave} className={styles.contador} style={{ "--cor": estado.cor }}>
              <span className={styles.fase}>
                <i aria-hidden="true"></i>
                {estado.texto}
              </span>
              <strong>{formatarEuros(t.soma)}</strong>
              <small>
                {numero(t.n)} {t.n === 1 ? "cliente" : "clientes"}
              </small>
            </div>
          );
        })}
      </section>

      <p className={styles.dica}>Arrasta os cartões para outra coluna ou usa os botões de cada cartão.</p>

      <div className={styles.quadro}>
        {ESTADOS.map((estado, i) => {
          const daColuna = porFase[i]?.data ?? [];
          const nTotal = total(estado.chave).n;
          const visiveis = daColuna.slice(0, VISIVEIS[estado.chave]);
          const resto = daColuna.slice(VISIVEIS[estado.chave]);
          const foraDoQuadro = nTotal - daColuna.length; // os que nem vieram

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
                <span>{numero(nTotal)}</span>
              </header>

              {daColuna.length === 0 && <p className={styles.vazia}>Nenhum cliente nesta fase.</p>}

              {visiveis.map(cartao)}

              {/* o resto dos que vieram abre aqui mesmo (<details>, sem JavaScript) */}
              {resto.length > 0 && (
                <details className={styles.mais}>
                  <summary>
                    <span className={styles.abrir}>Mostrar mais {resto.length}</span>
                    <span className={styles.fechar}>Mostrar menos</span>
                  </summary>
                  <div className={styles.cartoesMais}>{resto.map(cartao)}</div>
                </details>
              )}

              {/* ainda há mais: a lista de clientes tem páginas e pesquisa */}
              {foraDoQuadro > 0 && (
                <Link href={`/painel/clientes?estado=${estado.chave}`} className={styles.verTodos}>
                  Ver todos os {numero(nTotal)} na lista
                </Link>
              )}

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
