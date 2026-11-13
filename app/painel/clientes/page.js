import Link from "next/link";
import IndicadorLink from "@/components/painel/IndicadorLink";
import { obterSessao } from "@/lib/sessao";
import { ESTADOS, obterEstado, formatarEuros, formatarData } from "@/lib/estados";
import { iniciais } from "@/lib/texto";
import Icone from "@/components/Icone";
import styles from "./clientes.module.css";

// Rota /painel/clientes — lista de clientes com pesquisa e filtro por estado.
// Visual: separadores e troca Tabela/Quadro da referência E + tabela sóbria da referência D.
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

  // as duas consultas vão ao mesmo tempo (mais rápido do que uma a seguir à outra):
  //  1) o estado de todos os clientes visíveis, sem filtros: para os números de cada separador
  //  2) a lista filtrada
  const [{ data: todos }, { data: clientes }] = await Promise.all([
    supabase.from("clientes").select("estado"),
    consulta,
  ]);
  const lista = clientes ?? [];
  const total = todos?.length ?? 0;
  const contagem = {};
  for (const c of todos ?? []) contagem[c.estado] = (contagem[c.estado] ?? 0) + 1;

  // monta um link de filtro mantendo a pesquisa atual
  const linkFiltro = (chave) => {
    const params = new URLSearchParams();
    if (termo) params.set("q", termo);
    if (chave) params.set("estado", chave);
    const texto = params.toString();
    return `/painel/clientes${texto ? `?${texto}` : ""}`;
  };

  // soma do valor previsto dos clientes que estão a ser vistos (para o rodapé da tabela)
  const somaVisiveis = lista.reduce((soma, c) => soma + (Number(c.valor_previsto) || 0), 0);
  const linkExportar = linkFiltro(estadoValido ? estado : "").replace("/painel/clientes", "/painel/clientes/exportar");

  return (
    <div className={`entrar ${styles.pagina}`}>
      {/* cabeçalho: título à esquerda, ações à direita */}
      <header className={styles.cabecalho}>
        <div>
          <h1>Clientes</h1>
          <p className={styles.resumo}>
            {eAdmin ? "Todos os clientes da empresa." : "Os clientes por que és responsável."}
          </p>
        </div>
        <div className={styles.acoesTopo}>
          {/* exporta o que está a ser visto: mesma pesquisa e mesmo filtro.
              É um <a> normal (não <Link>) porque descarrega um ficheiro, não abre uma página. */}
          <a href={linkExportar} className="botao botao-secundario">
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

      {/* separadores por estado (referência E): o ativo fica sublinhado a verde */}
      <nav className={styles.separadores} aria-label="Filtrar por estado">
        <Link
          href={linkFiltro("")}
          className={!estadoValido ? styles.separadorAtivo : styles.separador}
          aria-current={!estadoValido ? "page" : undefined}
        >
          Todos <span>{total}</span>
          <IndicadorLink className={styles.aCarregar} classeAtiva={styles.aCarregarAtivo} />
        </Link>
        {ESTADOS.map((e) => (
          <Link
            key={e.chave}
            href={linkFiltro(e.chave)}
            className={estado === e.chave ? styles.separadorAtivo : styles.separador}
            aria-current={estado === e.chave ? "page" : undefined}
          >
            <i style={{ background: e.cor }}></i>
            {e.texto} <span>{contagem[e.chave] ?? 0}</span>
            <IndicadorLink className={styles.aCarregar} classeAtiva={styles.aCarregarAtivo} />
          </Link>
        ))}
      </nav>

      {/* barra de ferramentas: vista (Tabela / Quadro) à esquerda, pesquisa à direita */}
      <div className={styles.ferramentas}>
        <div className={styles.vistas} aria-label="Vista">
          <span className={styles.vistaAtiva} aria-current="page">
            <Icone nome="lista" tamanho={15} /> Tabela
          </span>
          {/* o "quadro" dos clientes é o pipeline: colunas por fase */}
          <Link href="/painel/pipeline" className={styles.vista}>
            <Icone nome="grelha" tamanho={15} /> Quadro
          </Link>
        </div>

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
      </div>

      {/* tabela (referência D): sóbria, com ícone em cada coluna e totais no fundo */}
      <section className={styles.bloco}>
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
                  <th>
                    <span className={styles.th}>
                      <Icone nome="utilizador" tamanho={15} /> Cliente
                    </span>
                  </th>
                  <th className={styles.colTelefone}>
                    <span className={styles.th}>
                      <Icone nome="telemovel" tamanho={15} /> Telefone
                    </span>
                  </th>
                  {eAdmin && (
                    <th className={styles.colResponsavel}>
                      <span className={styles.th}>
                        <Icone nome="utilizadores" tamanho={15} /> Responsável
                      </span>
                    </th>
                  )}
                  <th className={styles.colValor}>
                    <span className={styles.th}>
                      <Icone nome="subida" tamanho={15} /> Valor
                    </span>
                  </th>
                  <th>
                    <span className={styles.th}>
                      <Icone nome="grelha" tamanho={15} /> Estado
                    </span>
                  </th>
                  <th className={styles.colData}>
                    <span className={styles.th}>
                      <Icone nome="lista" tamanho={15} /> Criado
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => {
                  const est = obterEstado(c.estado);
                  const responsavel = c.perfis?.nome;
                  return (
                    <tr key={c.id}>
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
              {/* rodapé com os totais do que está a ser visto (referência D) */}
              <tfoot>
                <tr>
                  <td>
                    {lista.length} {lista.length === 1 ? "cliente" : "clientes"}
                  </td>
                  <td className={styles.colTelefone}></td>
                  {eAdmin && <td className={styles.colResponsavel}></td>}
                  <td className={styles.colValor}>Soma: {formatarEuros(somaVisiveis)}</td>
                  <td></td>
                  <td className={styles.colData}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
