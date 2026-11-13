import Link from "next/link";
import IndicadorLink from "@/components/painel/IndicadorLink";
import { obterSessao } from "@/lib/sessao";
import { ESTADOS, obterEstado, formatarEuros, formatarData } from "@/lib/estados";
import { termoPesquisa } from "@/lib/texto";
import Icone from "@/components/Icone";
import styles from "./clientes.module.css";

// Rota /painel/clientes — lista de clientes com pesquisa, filtro por estado e páginas.
// Visual ao estilo das listas da Apple: controlo segmentado para os estados,
// lista com linhas finas a separar e uma seta ">" no fim de cada linha.
// A pesquisa, o filtro e a página vivem no URL (ex.: ?q=oficina&estado=novo&pagina=2):
// assim a página é de servidor, e um link filtrado pode ser guardado ou partilhado.
//
// Escala: só vêm POR_PAGINA clientes de cada vez; os números dos separadores e os
// totais vêm da função resumo_clientes (migração 07), sem trazer os clientes todos.
export const metadata = { title: "Clientes · FlowCRM" };

const POR_PAGINA = 50;

const AVISOS = {
  adicionado: "Cliente adicionado.",
  guardado: "Alterações guardadas.",
  apagado: "Cliente apagado.",
};

const numero = (n) => new Intl.NumberFormat("pt-PT").format(n);

// No Next.js 16, searchParams chega como uma Promise: por isso o "await"
export default async function PaginaClientes({ searchParams }) {
  const { q = "", estado = "", aviso = "", pagina = "1" } = await searchParams;
  const { supabase, eAdmin } = await obterSessao();

  const estadoValido = ESTADOS.some((e) => e.chave === estado);
  const termo = q.trim().slice(0, 80); // o que a pessoa escreveu (para mostrar na caixa)
  const procura = termoPesquisa(termo); // sem acentos, para a base de dados
  const numPagina = Math.max(1, Number.parseInt(pagina, 10) || 1);
  const inicio = (numPagina - 1) * POR_PAGINA;

  // a lista: só uma página, mais recentes primeiro
  let consulta = supabase
    .from("clientes")
    .select("id, nome, email, telefone, estado, valor_previsto, origem, criado_em, perfis(nome)")
    .order("criado_em", { ascending: false })
    .range(inicio, inicio + POR_PAGINA - 1);
  if (estadoValido) consulta = consulta.eq("estado", estado);
  if (procura) consulta = consulta.like("pesquisa", `%${procura}%`);

  // em paralelo: a página de clientes e os totais por estado (com a mesma pesquisa)
  const [{ data: clientes }, { data: resumo }] = await Promise.all([
    consulta,
    supabase.rpc("resumo_clientes", { termo: procura }),
  ]);
  const lista = clientes ?? [];

  const contagem = {};
  const somas = {};
  for (const r of resumo ?? []) {
    contagem[r.estado] = Number(r.n);
    somas[r.estado] = Number(r.soma);
  }
  const total = Object.values(contagem).reduce((a, b) => a + b, 0);
  const totalFiltro = estadoValido ? (contagem[estado] ?? 0) : total;
  const somaFiltro = estadoValido ? (somas[estado] ?? 0) : Object.values(somas).reduce((a, b) => a + b, 0);
  const ultimaPagina = Math.max(1, Math.ceil(totalFiltro / POR_PAGINA));

  // monta um link mantendo a pesquisa (e o estado escolhido, se não se pedir outro)
  const linkPara = ({ chave = estadoValido ? estado : "", pag = 1 } = {}) => {
    const params = new URLSearchParams();
    if (termo) params.set("q", termo);
    if (chave) params.set("estado", chave);
    if (pag > 1) params.set("pagina", String(pag));
    const texto = params.toString();
    return `/painel/clientes${texto ? `?${texto}` : ""}`;
  };
  const linkExportar = linkPara().replace("/painel/clientes", "/painel/clientes/exportar");

  let frase = `${numero(total)} ${total === 1 ? "cliente" : "clientes"}`;
  if (termo) frase += ` com "${termo}"`;
  else frase += eAdmin ? " na empresa" : " teus";

  return (
    <div className={`entrar ${styles.pagina}`}>
      {/* cabeçalho: título grande à esquerda, ações à direita */}
      <header className={styles.cabecalho}>
        <div>
          <h1>Clientes</h1>
          <p className={styles.resumo}>{frase}</p>
        </div>
        <div className={styles.acoesTopo}>
          {/* exporta o que está a ser visto. É um <a> normal (não <Link>) porque descarrega um ficheiro */}
          <a href={linkExportar} className={styles.botaoTexto}>
            <Icone nome="folha" tamanho={16} /> Exportar
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

      {/* barra: controlo segmentado com os estados à esquerda, pesquisa à direita */}
      <div className={styles.ferramentas}>
        <nav className={styles.segmentos} aria-label="Filtrar por estado">
          <Link
            href={linkPara({ chave: "" })}
            className={!estadoValido ? styles.segmentoAtivo : styles.segmento}
            aria-current={!estadoValido ? "page" : undefined}
          >
            Todos <span>{numero(total)}</span>
            <IndicadorLink className={styles.aCarregar} classeAtiva={styles.aCarregarAtivo} />
          </Link>
          {ESTADOS.map((e) => (
            <Link
              key={e.chave}
              href={linkPara({ chave: e.chave })}
              className={estado === e.chave ? styles.segmentoAtivo : styles.segmento}
              aria-current={estado === e.chave ? "page" : undefined}
            >
              <i style={{ background: e.cor }}></i>
              {e.texto} <span>{numero(contagem[e.chave] ?? 0)}</span>
              <IndicadorLink className={styles.aCarregar} classeAtiva={styles.aCarregarAtivo} />
            </Link>
          ))}
        </nav>

        {/* pesquisa: um formulário GET normal, que só muda o URL (Enter para pesquisar) */}
        <form className={styles.pesquisa} role="search">
          {estadoValido && <input type="hidden" name="estado" value={estado} />}
          <Icone nome="pesquisa" tamanho={16} className={styles.lupa} />
          <input
            type="search"
            name="q"
            defaultValue={termo}
            placeholder="Pesquisar nome ou email"
            aria-label="Pesquisar clientes"
          />
        </form>
      </div>

      {/* a lista */}
      <section className={styles.bloco}>
        {lista.length === 0 ? (
          <div className={styles.vazio}>
            {total === 0 && !termo ? (
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
                  <th>Nome</th>
                  <th className={styles.colTelefone}>Telefone</th>
                  {eAdmin && <th className={styles.colResponsavel}>Responsável</th>}
                  <th className={styles.colValor}>Valor</th>
                  <th className={styles.colEstado}>Estado</th>
                  <th className={styles.colData}>Criado</th>
                  <th className={styles.colSeta}>
                    <span className="so-leitores">Abrir</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => {
                  const est = obterEstado(c.estado);
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className={styles.nomeEmail}>
                          {/* o link ocupa a linha toda (ver CSS) para a linha inteira ser clicável */}
                          <Link href={`/painel/clientes/${c.id}`} className={styles.linkCliente}>
                            {c.nome}
                          </Link>
                          <small>
                            {c.email ?? "Sem email"}
                            {c.origem === "formulario" && <em className={styles.origem}>Formulário</em>}
                          </small>
                        </div>
                      </td>
                      <td className={styles.colTelefone}>{c.telefone ?? "—"}</td>
                      {eAdmin && (
                        <td className={styles.colResponsavel}>
                          {c.perfis?.nome ?? <span className={styles.semResponsavel}>Por atribuir</span>}
                        </td>
                      )}
                      <td className={styles.colValor}>
                        {c.valor_previsto !== null ? formatarEuros(c.valor_previsto) : "—"}
                      </td>
                      <td className={styles.colEstado}>
                        {/* bolinha com a cor do estado + nome (no telemóvel, só a bolinha) */}
                        <span className={styles.estado} style={{ "--cor": est.cor }} title={est.texto}>
                          <span className={styles.textoEstado}>{est.texto}</span>
                        </span>
                      </td>
                      <td className={styles.colData}>{formatarData(c.criado_em)}</td>
                      <td aria-hidden="true" className={styles.colSeta}>
                        <svg width="8" height="13" viewBox="0 0 8 13">
                          <path
                            d="M1.5 1.5l5 5-5 5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* rodapé: que clientes estão a ser vistos, o valor total e as páginas */}
        {lista.length > 0 && (
          <footer className={styles.rodape}>
            <span>
              {numero(inicio + 1)}–{numero(inicio + lista.length)} de {numero(totalFiltro)}
              <span className={styles.somaTotal}> · {formatarEuros(somaFiltro)} no total</span>
            </span>
            {ultimaPagina > 1 && (
              <nav className={styles.paginas} aria-label="Páginas">
                {numPagina > 1 ? (
                  <Link href={linkPara({ pag: numPagina - 1 })} className={styles.botaoPagina}>
                    Anterior
                  </Link>
                ) : (
                  <span className={`${styles.botaoPagina} ${styles.desligado}`}>Anterior</span>
                )}
                <span className={styles.numPagina}>
                  {numPagina} de {ultimaPagina}
                </span>
                {numPagina < ultimaPagina ? (
                  <Link href={linkPara({ pag: numPagina + 1 })} className={styles.botaoPagina}>
                    Seguinte
                  </Link>
                ) : (
                  <span className={`${styles.botaoPagina} ${styles.desligado}`}>Seguinte</span>
                )}
              </nav>
            )}
          </footer>
        )}
      </section>
    </div>
  );
}
