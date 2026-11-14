import Link from "next/link";
import { obterSessao } from "@/lib/sessao";
import { hojeEmPortugal } from "@/lib/datas";
import { termoPesquisa } from "@/lib/texto";
import FormTarefa from "@/components/tarefas/FormTarefa";
import TabelaTarefas from "@/components/tarefas/TabelaTarefas";
import VistasTarefas from "@/components/tarefas/VistasTarefas";
import FiltroPessoa from "@/components/tarefas/FiltroPessoa";
import IndicadorLink from "@/components/painel/IndicadorLink";
import Icone from "@/components/Icone";
import styles from "./tarefas.module.css";

// Rota /painel/tarefas — as tarefas numa TABELA com separadores
// (como as listas de tarefas do HubSpot e do Pipedrive):
//   Atrasadas · Hoje · Próximas · Sem data · Feitas, cada um com a sua contagem.
// O admin vê as da equipa toda (e filtra por pessoa); o comercial vê só as suas.
//
// Tudo vive no URL: ?vista=hoje&q=padaria&pessoa=...&pagina=2 (e ?nova=1 abre o formulário).
// Sem ?vista, a página abre no separador mais urgente que tenha tarefas.
//
// ESCALA: só vem uma página de POR_PAGINA tarefas de cada vez; as contagens vêm já
// contadas da base de dados. A pesquisa usa a vista "tarefas_lista" (migração 13),
// que junta o título da tarefa e o nome do cliente, sem acentos.
export const metadata = { title: "Tarefas · FlowCRM" };

const POR_PAGINA = 50;

// os separadores: que tarefas mostra cada um (filtro) e por que ordem (ordem)
const SEPARADORES = [
  {
    chave: "atrasadas",
    texto: "Atrasadas",
    vazio: "Nada em atraso.",
    filtro: (c, hoje) => c.eq("concluida", false).lt("data_limite", hoje),
    ordem: (c) => c.order("data_limite", { ascending: true }), // as mais antigas primeiro
  },
  {
    chave: "hoje",
    texto: "Hoje",
    vazio: "Nada para hoje.",
    filtro: (c, hoje) => c.eq("concluida", false).eq("data_limite", hoje),
    ordem: (c) => c.order("criado_em", { ascending: true }),
  },
  {
    chave: "proximas",
    texto: "Próximas",
    vazio: "Nada marcado para os próximos dias.",
    filtro: (c, hoje) => c.eq("concluida", false).gt("data_limite", hoje),
    ordem: (c) => c.order("data_limite", { ascending: true }), // as mais próximas primeiro
  },
  {
    chave: "semdata",
    texto: "Sem data",
    vazio: "Todas as tarefas por fazer têm data.",
    filtro: (c) => c.eq("concluida", false).is("data_limite", null),
    ordem: (c) => c.order("criado_em", { ascending: true }),
  },
  {
    chave: "feitas",
    texto: "Feitas",
    vazio: "Ainda não há tarefas feitas.",
    filtro: (c) => c.eq("concluida", true),
    ordem: (c) => c.order("concluida_em", { ascending: false, nullsFirst: false }), // as mais recentes primeiro
  },
];

const numero = (n) => new Intl.NumberFormat("pt-PT").format(n);

export default async function PaginaTarefas({ searchParams }) {
  const { vista = "", q = "", pessoa = "", pagina = "1", nova = "" } = await searchParams;
  const { supabase, perfil, eAdmin } = await obterSessao();
  const hoje = hojeEmPortugal();

  const termo = q.trim().slice(0, 80); // o que a pessoa escreveu (para mostrar na caixa)
  const procura = termoPesquisa(termo); // sem acentos, para a base de dados
  // o valor de "pessoa" vem do URL: só o usamos se tiver o formato de um id
  const pessoaValida = eAdmin && /^[0-9a-f-]{36}$/i.test(pessoa) ? pessoa : "";

  // consulta base: o comercial vê só as suas; o admin todas ou as da pessoa escolhida; + pesquisa
  const base = (campos, opcoes) => {
    let c = supabase.from("tarefas_lista").select(campos, opcoes);
    if (!eAdmin) c = c.eq("responsavel_id", perfil.id);
    else if (pessoaValida) c = c.eq("responsavel_id", pessoaValida);
    if (procura) c = c.like("pesquisa", `%${procura}%`);
    return c;
  };

  // em paralelo: a contagem de cada separador (head: true = só o número),
  // os clientes mais recentes (sugestões no formulário) e a equipa (só o admin)
  const [contagens, { data: clientes }, membrosRes] = await Promise.all([
    Promise.all(SEPARADORES.map((s) => s.filtro(base("id", { count: "exact", head: true }), hoje))),
    supabase.from("clientes").select("id, nome, email, estado").order("criado_em", { ascending: false }).limit(6),
    eAdmin ? supabase.from("perfis").select("id, nome").order("nome") : Promise.resolve({ data: null }),
  ]);
  const totais = Object.fromEntries(SEPARADORES.map((s, i) => [s.chave, contagens[i].count ?? 0]));
  const membros = eAdmin ? (membrosRes.data ?? []) : null;

  // separador aberto: o do URL; sem ele, o mais urgente que tenha tarefas
  const separador =
    SEPARADORES.find((s) => s.chave === vista) ??
    SEPARADORES.find((s) => s.chave === (totais.atrasadas ? "atrasadas" : totais.hoje ? "hoje" : "proximas"));
  const total = totais[separador.chave];

  // a página pedida (nunca depois da última)
  const ultimaPagina = Math.max(1, Math.ceil(total / POR_PAGINA));
  const numPagina = Math.min(ultimaPagina, Math.max(1, Number.parseInt(pagina, 10) || 1));
  const inicio = (numPagina - 1) * POR_PAGINA;

  // a página de tarefas deste separador (o id desempata, para nada saltar entre páginas)
  const { data } = await separador
    .ordem(
      separador.filtro(
        base("id, cliente_id, responsavel_id, titulo, data_limite, concluida, cliente_nome, responsavel_nome"),
        hoje
      )
    )
    .order("id")
    .range(inicio, inicio + POR_PAGINA - 1);
  // no formato que a tabela usa nas outras páginas (clientes.nome, perfis.nome)
  const tarefas = (data ?? []).map((t) => ({
    ...t,
    clientes: { nome: t.cliente_nome },
    perfis: t.responsavel_nome ? { nome: t.responsavel_nome } : null,
  }));

  // links que mantêm a pesquisa e a pessoa (e o separador, se não se pedir outro)
  const linkPara = ({ chave = separador.chave, pag = 1 } = {}) => {
    const params = new URLSearchParams();
    params.set("vista", chave);
    if (termo) params.set("q", termo);
    if (pessoaValida) params.set("pessoa", pessoaValida);
    if (pag > 1) params.set("pagina", String(pag));
    return `/painel/tarefas?${params}`;
  };

  // frase do topo: "12 por fazer na equipa", "Tens 3 por fazer", "5 por fazer da Ana"...
  const porFazer = numero(totais.atrasadas + totais.hoje + totais.proximas + totais.semdata);
  const nomePessoa = membros?.find((m) => m.id === pessoaValida)?.nome;
  let frase = !eAdmin
    ? `Tens ${porFazer} por fazer`
    : pessoaValida
      ? `${porFazer} por fazer ${pessoaValida === perfil.id ? "tuas" : `de ${nomePessoa}`}`
      : `${porFazer} por fazer na equipa`;
  if (termo) frase += ` com "${termo}"`;

  return (
    <div className={`entrar ${styles.pagina}`}>
      <header className={styles.cabecalho}>
        <div>
          <h1>Tarefas</h1>
          <p className={styles.resumo}>{frase}</p>
        </div>
        <VistasTarefas atual="lista" />
      </header>

      {/* barra: separadores à esquerda; pesquisa, pessoa e nova tarefa à direita */}
      <div className={styles.ferramentas}>
        <nav className={styles.segmentos} aria-label="Separadores das tarefas">
          {SEPARADORES.map((s) => (
            <Link
              key={s.chave}
              href={linkPara({ chave: s.chave })}
              className={s.chave === separador.chave ? styles.segmentoAtivo : styles.segmento}
              aria-current={s.chave === separador.chave ? "page" : undefined}
            >
              {s.texto}
              {/* a contagem das atrasadas fica vermelha quando há alguma */}
              <span className={s.chave === "atrasadas" && totais.atrasadas > 0 ? styles.alerta : undefined}>
                {numero(totais[s.chave])}
              </span>
              <IndicadorLink className={styles.aCarregar} classeAtiva={styles.aCarregarAtivo} />
            </Link>
          ))}
        </nav>

        <div className={styles.direita}>
          {/* pesquisa: um formulário GET normal, que só muda o URL (Enter para pesquisar) */}
          <form className={styles.pesquisa} role="search">
            {vista && <input type="hidden" name="vista" value={separador.chave} />}
            {pessoaValida && <input type="hidden" name="pessoa" value={pessoaValida} />}
            <Icone nome="pesquisa" tamanho={16} className={styles.lupa} />
            <input
              type="search"
              name="q"
              defaultValue={termo}
              placeholder="Pesquisar tarefa ou cliente"
              aria-label="Pesquisar tarefas"
            />
          </form>

          {eAdmin && membros.length > 1 && <FiltroPessoa membros={membros} perfilId={perfil.id} atual={pessoaValida} />}

          {/* "Nova tarefa": <details> abre e fecha o formulário sem JavaScript */}
          <details className={styles.nova} open={nova === "1"}>
            <summary className="botao">
              <Icone nome="mais" tamanho={16} /> Nova tarefa
            </summary>
            <div className={styles.painelNova}>
              {(clientes ?? []).length === 0 ? (
                <p className={styles.semClientes}>
                  Para criar tarefas precisas de clientes. <Link href="/painel/clientes/novo">Adiciona o primeiro.</Link>
                </p>
              ) : (
                <FormTarefa clientes={clientes} membros={membros} perfilId={perfil.id} />
              )}
            </div>
          </details>
        </div>
      </div>

      {/* a tabela do separador aberto */}
      <section className={styles.bloco} aria-label={separador.texto}>
        {total === 0 ? (
          <div className={styles.vazio}>
            {termo ? (
              <>
                <h2>Nenhuma tarefa encontrada</h2>
                <p>Não há tarefas com &quot;{termo}&quot; em {separador.texto}.</p>
                <Link href={`/painel/tarefas?vista=${separador.chave}`} className="botao botao-secundario">
                  Limpar pesquisa
                </Link>
              </>
            ) : (
              <p>{separador.vazio}</p>
            )}
          </div>
        ) : (
          <>
            {/* key: ao mudar de separador ou de página, a seleção começa vazia */}
            <TabelaTarefas
              key={`${separador.chave}-${numPagina}`}
              tarefas={tarefas}
              hoje={hoje}
              mensagemVazia={separador.vazio}
              membros={membros}
              perfilId={perfil.id}
              mostrarResponsavel={eAdmin}
              mostrarEstado={false}
            />

            {/* rodapé: que tarefas estão a ser vistas e as páginas */}
            <footer className={styles.rodape}>
              <span>
                {numero(inicio + 1)}–{numero(inicio + tarefas.length)} de {numero(total)}
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
          </>
        )}
      </section>
    </div>
  );
}
