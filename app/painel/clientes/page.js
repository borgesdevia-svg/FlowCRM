import Link from "next/link";
import { obterSessao } from "@/lib/sessao";
import { ESTADOS, obterEstado, formatarEuros } from "@/lib/estados";
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

  // 1) contagem por estado (para a barra) — todos os clientes visíveis, sem filtros
  const { data: todos } = await supabase.from("clientes").select("estado");
  const total = todos?.length ?? 0;
  const contagem = {};
  for (const c of todos ?? []) contagem[c.estado] = (contagem[c.estado] ?? 0) + 1;

  // 2) lista filtrada — o filtro é feito pela base de dados
  let consulta = supabase
    .from("clientes")
    .select("id, nome, email, telefone, estado, valor_previsto, origem, perfis(nome)")
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
      <header className={styles.cabecalho}>
        <div>
          <h1>Clientes</h1>
          <p className={styles.subtitulo}>
            {eAdmin ? "Todos os clientes da empresa." : "Os clientes de que és responsável."}
          </p>
        </div>
        <Link href="/painel/clientes/novo" className="botao">
          Adicionar cliente
        </Link>
      </header>

      {AVISOS[aviso] && (
        <p className={`alerta alerta-sucesso ${styles.aviso}`} role="status">
          {AVISOS[aviso]}
        </p>
      )}

      {/* Barra de distribuição: cada segmento tem largura proporcional ao nº de clientes
          nesse estado. Os separadores por baixo filtram a lista. */}
      <nav className={styles.distribuicao} aria-label="Filtrar por estado">
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

      {/* pesquisa: um formulário GET normal, que só muda o URL */}
      <form className={styles.pesquisa} role="search">
        {estadoValido && <input type="hidden" name="estado" value={estado} />}
        <input
          type="search"
          name="q"
          defaultValue={termo}
          placeholder="Pesquisar por nome ou email"
          aria-label="Pesquisar clientes"
        />
        <button type="submit" className="botao botao-secundario">
          Pesquisar
        </button>
      </form>

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
        <table className={styles.tabela}>
          <thead>
            <tr>
              <th>Cliente</th>
              <th className={styles.colTelefone}>Telefone</th>
              {eAdmin && <th className={styles.colResponsavel}>Responsável</th>}
              <th className={styles.colValor}>Valor previsto</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((c) => {
              const est = obterEstado(c.estado);
              return (
                <tr key={c.id}>
                  <td>
                    {/* o link ocupa a linha toda (ver CSS) para a linha inteira ser clicável */}
                    <Link href={`/painel/clientes/${c.id}`} className={styles.linkCliente}>
                      {c.nome}
                    </Link>
                    <small>
                      {c.email ?? "Sem email"}
                      {c.origem === "formulario" && <em className={styles.origem}>formulário</em>}
                    </small>
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
                  <td>
                    <span className={styles.estado}>
                      <i style={{ background: est.cor }}></i>
                      {est.texto}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
