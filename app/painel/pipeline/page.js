import Link from "next/link";
import { obterSessao } from "@/lib/sessao";
import { ESTADOS, formatarEuros } from "@/lib/estados";
import { termoPesquisa } from "@/lib/texto";
import Icone from "@/components/Icone";
import BotoesFase from "@/components/clientes/BotoesFase";
import { CartaoArrastavel, ColunaArrastavel } from "@/components/pipeline/Arrastar";
import PesquisaPipeline from "@/components/pipeline/PesquisaPipeline";
import styles from "./pipeline.module.css";

// Rota /painel/pipeline — os clientes organizados por fase, em colunas.
// Para mudar de fase: arrastar o cartão para outra coluna (no computador)
// ou usar os botões do cartão (componente BotoesFase, funciona também no telemóvel).
//
// Escala: uma coluna pode ter milhares de leads (ex.: todos em Perdido).
// Por isso cada coluna traz só os CARREGAR mais recentes. O quadro tem uma altura fixa
// (cabe no ecrã) e cada coluna faz scroll por dentro: a página não cresce com os leads.
// Se houver ainda mais, há um link para a lista de leads já filtrada por essa fase.
// Os totais (quantos e valor no topo de cada coluna) vêm da função resumo_clientes.
// Pesquisa: ?q=... no URL filtra todas as colunas (nome ou email, sem acentos),
// com a mesma coluna "pesquisa" e o mesmo índice da lista de clientes.
export const metadata = { title: "Pipeline · FlowCRM" };

const CARREGAR = 30;

const numero = (n) => new Intl.NumberFormat("pt-PT").format(n);

// No Next.js 16, searchParams chega como uma Promise: por isso o "await"
export default async function PaginaPipeline({ searchParams }) {
  const { q = "" } = await searchParams;
  const { supabase, eAdmin } = await obterSessao();
  const termo = String(q).trim().slice(0, 80); // o que a pessoa escreveu
  const procura = termoPesquisa(termo); // sem acentos, para a base de dados

  // em paralelo (o RLS já filtra: admin vê todos, comercial só os seus):
  //  - os totais por fase
  //  - os clientes mais recentes de cada fase (uma consulta por fase)
  const [{ data: resumo }, ...porFase] = await Promise.all([
    supabase.rpc("resumo_clientes", { termo: procura }),
    ...ESTADOS.map((e) => {
      let consulta = supabase
        .from("clientes")
        .select("id, nome, email, estado, valor_previsto, perfis(nome)")
        .eq("estado", e.chave)
        .order("criado_em", { ascending: false })
        .limit(CARREGAR);
      if (procura) consulta = consulta.like("pesquisa", `%${procura}%`);
      return consulta;
    }),
  ]);

  const totais = {};
  for (const r of resumo ?? []) totais[r.estado] = { n: Number(r.n), soma: Number(r.soma) };
  const total = (chave) => totais[chave] ?? { n: 0, soma: 0 };

  // "em aberto" = negócios ainda por decidir (novos + em negociação)
  const encontrados = ESTADOS.reduce((soma, e) => soma + total(e.chave).n, 0);
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
            {emAberto.n === 1 ? "lead" : "leads"}, {numero(total("negociacao").n)} em negociação.
          </p>
        </div>
        <Link href="/painel/clientes/novo" className="botao">
          <Icone nome="mais" tamanho={16} /> Novo lead
        </Link>
      </header>

      {/* pesquisa + dica (ou quantos resultados a pesquisa encontrou) */}
      <div className={styles.barra}>
        <PesquisaPipeline inicial={termo} />
        <p className={styles.dica} role="status">
          {termo
            ? encontrados === 0
              ? `Nenhum lead com "${termo}".`
              : `${numero(encontrados)} ${encontrados === 1 ? "lead encontrado" : "leads encontrados"} com "${termo}".`
            : encontrados === 0 ? (
              // pipeline vazia: em vez de explicar como se arrasta, diz por onde começar
              <>
                Ainda não há leads.{" "}
                <Link href="/painel/clientes/novo" className={styles.linkDica}>
                  Adicionar o primeiro
                </Link>
              </>
            ) : (
              <>
                {/* no telemóvel não se arrasta: lá a dica fala só dos botões (CSS) */}
                <span className={styles.soRato}>Arrasta os cartões para outra coluna ou usa os botões de cada cartão.</span>
                <span className={styles.soToque}>Usa os botões de cada cartão para o mudar de fase.</span>
              </>
            )}
        </p>
      </div>

      <div className={styles.quadro}>
        {ESTADOS.map((estado, i) => {
          const daColuna = porFase[i]?.data ?? [];
          const nTotal = total(estado.chave).n;
          const foraDoQuadro = nTotal - daColuna.length; // os que nem vieram

          return (
            // coluna onde se podem largar cartões (componente de cliente)
            <ColunaArrastavel
              key={estado.chave}
              estado={estado.chave}
              className={styles.coluna}
              style={{ "--cor": estado.cor }}
            >
              {/* topo da coluna: nome da fase com a bolinha da cor, quantos leads e o valor em jogo */}
              <header className={styles.topoColuna}>
                <div className={styles.linhaTopo}>
                  <h2>
                    <i aria-hidden="true"></i>
                    {estado.texto}
                  </h2>
                  <span>{numero(nTotal)}</span>
                </div>
                <strong className={styles.somaColuna}>{formatarEuros(total(estado.chave).soma)}</strong>
              </header>

              {/* os cartões fazem scroll aqui dentro (a coluna tem altura fixa) */}
              <div className={styles.listaColuna}>
                {daColuna.length === 0 && <p className={styles.vazia}>{termo ? "Nenhum resultado nesta fase." : "Nenhum lead nesta fase."}</p>}

                {daColuna.map(cartao)}

                {/* ainda há mais: a lista de leads tem páginas e pesquisa */}
                {foraDoQuadro > 0 && (
                  <Link href={`/painel/clientes?estado=${estado.chave}${termo ? `&q=${encodeURIComponent(termo)}` : ""}`} className={styles.verTodos}>
                    Ver todos os {numero(nTotal)} na lista
                  </Link>
                )}
              </div>

              {/* os clientes novos entram sempre na fase "Novo" */}
              {estado.chave === "novo" && (
                <Link href="/painel/clientes/novo" className={styles.adicionar}>
                  <Icone nome="mais" tamanho={15} /> Novo lead
                </Link>
              )}
            </ColunaArrastavel>
          );
        })}
      </div>
    </div>
  );
}
