import Link from "next/link";
import { obterSessao } from "@/lib/sessao";
import { ESTADOS, obterEstado, formatarEuros, formatarData } from "@/lib/estados";
import { iniciais } from "@/lib/texto";
import Icone from "@/components/Icone";
import styles from "./clientes.module.css";

// Rota /painel/clientes — lista de clientes com pesquisa e filtro por estado.
// A pesquisa e o filtro vivem no URL (ex.: ?q=oficina&estado=novo):
// assim a página é de servidor, e um link filtrado pode ser guardado ou partilhado.
export const metadata = { title: "Clientes · FlowCRM" };

const AVISOS = {
  adicionado: "Cliente adicionado.",
  guardado: "Alterações guardadas.",
  apagado: "Cliente apagado.",
};

// No Next.js 16, searchParams chega como uma Promise: por isso o "await"
export default async function PaginaClientes({ searchParams }) {
  const { q = "", estado = "", aviso = "" } = await searchParams;
  const { supabase, eAdmin } = await obterSessao();

  // 1) todos os clientes visíveis, sem filtros: para as contagens e o resumo do topo
  const { data: todos } = await supabase.from("clientes").select("estado, valor_previsto");
  const total = todos?.length ?? 0;
  const contagem = {};
  let valorTotal = 0;
  for (const c of todos ?? []) {
    contagem[c.estado] = (contagem[c.estado] ?? 0) + 1;
    valorTotal += Number(c.valor_previsto) || 0;
  }

  // 2) lista filtrada — o filtro é feito pela base de dados
  let consulta = supabase
    .from("clientes")
    .select("id, nome, email, telefone, estado, valor_previsto, origem, criado_em, perfis(nome)")
    .order("criado_em", { ascending: false });

  const estadoValido = ESTADOS.some((e) => e.chave === estado);
  if (estadoValido) consulta = consulta.eq("estado", estado);

  // tiramos caracteres que têm significado especial na pesquisa do Supabase
  const termo = q.replace(/[%,()]/g, "").trim();
  if (termo) consulta = consulta.or(`nome.ilike.%${termo}%,email.ilike.%${termo}%`);

  const { data: clientes } = await consulta;
  const lista = clientes ?? [];

  // monta um link de filtro mantendo a pesquisa atual
  const linkFiltro = (chave) => {
    const params = new URLSearchParams();
    if (termo) params.set("q", termo);
    if (chave) params.set("estado", chave);
    const texto = params.toString();
    return `/painel/clientes${texto ? `?${texto}` : ""}`;
  };

  return (
    <div className={styles.pagina}>
      {/* cabeçalho: título + resumo numa linha, igual ao Início e ao Pipeline */}
      <header className={`entrar ${styles.cabecalho}`}>
        <div>
          <h1>Clientes.</h1>
          <p className={styles.resumo}>
            {total} {total === 1 ? "cliente" : "clientes"}
            <span>·</span>
            {formatarEuros(valorTotal)} em valor previsto
            <span>·</span>
            {eAdmin ? "toda a empresa" : "só os teus"}
          </p>
        </div>
        <div className={styles.acoesTopo}>
          {/* exporta o que está a ser visto: mesma pesquisa e mesmo filtro.
              É um <a> normal (não <Link>) porque descarrega um ficheiro, não abre uma página. */}
          <a href={linkFiltro(estadoValido ? estado : "").replace("/painel/clientes", "/painel/clientes/exportar")} className="botao botao-secundario">
            <Icone nome="folha" tamanho={16} /> Exportar CSV
          </a>
          <Link href="/painel/clientes/novo" className="botao">
            <Icone nome="mais" tamanho={16} /> Novo cliente
          </Link>
        </div>
      </header>

      {AVISOS[aviso] && (
        <p className={`alerta alerta-sucesso ${styles.aviso}`} role="status">
          {AVISOS[aviso]}
        </p>
      )}

      {/* Filtros por estado. Por cima, a barra de distribuição: cada segmento tem
          largura proporcional ao nº de clientes nesse estado. */}
      <nav className={`entrar ${styles.distribuicao}`} style={{ "--atraso": "60ms" }} aria-label="Filtrar por estado">
        <div className={styles.barra} aria-hidden="true">
          {total === 0 ? (
            <span className={styles.barraVazia}></span>
          ) : (
            ESTADOS.map((e) =>
              contagem[e.chave] ? (
                <span
                  key={e.chave}
                  style={{ flexGrow: contagem[e.chave], background: e.cor }}
                  className={estadoValido && estado !== e.chave ? styles.apagado : ""}
                ></span>
              ) : null
            )
          )}
        </div>

        {/* "comprimido" de botões: o filtro ativo fica verde */}
        <div className={styles.filtros}>
          <Link href={linkFiltro("")} className={!estadoValido ? styles.filtroAtivo : styles.filtro}>
            Todos <span>{total}</span>
          </Link>
          {ESTADOS.map((e) => (
            <Link
              key={e.chave}
              href={linkFiltro(e.chave)}
              className={estado === e.chave ? styles.filtroAtivo : styles.filtro}
            >
              <i style={{ background: e.cor }}></i>
              {e.texto} <span>{contagem[e.chave] ?? 0}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* bloco com a tabela (como o "Open Deals" da referência) */}
      <section className={`entrar ${styles.bloco}`} style={{ "--atraso": "120ms" }}>
        <header className={styles.topoBloco}>
          <h2>
            {estadoValido ? obterEstado(estado).texto : "Todos os clientes"}
            <span>
              {lista.length} {lista.length === 1 ? "resultado" : "resultados"}
            </span>
          </h2>

          {/* pesquisa: um formulário GET normal, que só muda o URL */}
          <form className={styles.pesquisa} role="search">
            {estadoValido && <input type="hidden" name="estado" value={estado} />}
            <Icone nome="pesquisa" tamanho={17} className={styles.lupa} />
            <input
              type="search"
              name="q"
              defaultValue={termo}
              placeholder="Pesquisar por nome ou email…"
              aria-label="Pesquisar clientes"
            />
            <button type="submit" className={styles.botaoPesquisa}>
              Pesquisar
            </button>
          </form>
        </header>

        {lista.length === 0 ? (
          <div className={styles.vazio}>
            {total === 0 ? (
              <>
                <h2>Ainda não tens clientes</h2>
                <p>Adiciona o primeiro à mão ou partilha o formulário público da empresa.</p>
                <Link href="/painel/clientes/novo" className="botao">
                  Adicionar cliente
                </Link>
              </>
            ) : (
              <>
                <h2>Nenhum cliente encontrado</h2>
                <p>Experimenta outra pesquisa ou mostra todos os estados.</p>
                <Link href="/painel/clientes" className="botao botao-secundario">
                  Limpar filtros
                </Link>
              </>
            )}
          </div>
        ) : (
          // a tabela pode deslizar para o lado em ecrãs estreitos, em vez de rebentar
          <div className={styles.rolar}>
            <table className={styles.tabela}>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th className={styles.colTelefone}>Telefone</th>
                  {eAdmin && <th className={styles.colResponsavel}>Responsável</th>}
                  <th className={styles.colValor}>Valor</th>
                  <th>Estado</th>
                  <th className={styles.colData}>Criado</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c, i) => {
                  const est = obterEstado(c.estado);
                  const responsavel = c.perfis?.nome;
                  return (
                    // as primeiras 12 linhas entram em cascata (as seguintes já estão fora do ecrã)
                    <tr key={c.id} className="entrar" style={{ "--atraso": `${180 + Math.min(i, 12) * 35}ms` }}>
                      <td>
                        <div className={styles.cliente}>
                          <span className={styles.avatar}>{iniciais(c.nome)}</span>
                          <div className={styles.nomeEmail}>
                            {/* o link ocupa a linha toda (ver CSS) para a linha inteira ser clicável */}
                            <Link href={`/painel/clientes/${c.id}`} className={styles.linkCliente}>
                              {c.nome}
                            </Link>
                            <small>
                              {c.email ?? "Sem email"}
                              {c.origem === "formulario" && <em className={styles.origem}>formulário</em>}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td className={styles.colTelefone}>{c.telefone ?? "—"}</td>
                      {eAdmin && (
                        <td className={styles.colResponsavel}>
                          {responsavel ? (
                            <span className={styles.responsavel}>
                              <b>{iniciais(responsavel)}</b>
                              {responsavel}
                            </span>
                          ) : (
                            <span className={styles.semResponsavel}>Por atribuir</span>
                          )}
                        </td>
                      )}
                      <td className={styles.colValor}>
                        {c.valor_previsto !== null ? formatarEuros(c.valor_previsto) : "—"}
                      </td>
                      <td>
                        {/* etiqueta com a cor do estado (--cor) */}
                        <span className={styles.estado} style={{ "--cor": est.cor }}>
                          {est.texto}
                        </span>
                      </td>
                      <td className={styles.colData}>{formatarData(c.criado_em)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
