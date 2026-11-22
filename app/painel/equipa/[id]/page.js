import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { ESTADOS, formatarEuros } from "@/lib/estados";
import { hojeEmPortugal, tempoRelativo } from "@/lib/datas";
import { iniciais } from "@/lib/texto";
import Icone from "@/components/Icone";
import styles from "./membro.module.css";

// Rota /painel/equipa/[id] — detalhes de um membro da equipa (só o administrador):
// números (clientes, valor em aberto, tarefas), ações recentes, tarefas resolvidas e clientes.
// O RLS garante que só se vê gente da própria empresa: um id de outra empresa dá "não encontrado".
export const metadata = { title: "Membro da equipa · FlowCRM" };

const N_ACOES = 20;
const N_TAREFAS = 15;
const N_CLIENTES = 30;
// em cada lista só aparecem os primeiros VISIVEIS; o resto abre num "Ver mais"
const VISIVEIS = 5;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const numero = (n) => new Intl.NumberFormat("pt-PT").format(n);
const formatarData = (data) => new Intl.DateTimeFormat("pt-PT", { dateStyle: "long" }).format(new Date(data));

// ícone e frase de cada ação (registos do histórico dos clientes feitos por este membro)
const TIPOS = {
  nota: { icone: "mensagem", texto: "Escreveu uma nota em" },
  chamada: { icone: "telemovel", texto: "Registou uma chamada com" },
  email: { icone: "email", texto: "Registou um email com" },
  reuniao: { icone: "utilizadores", texto: "Registou uma reunião com" },
};

// transforma um registo do histórico numa linha da lista "Ações recentes"
function descreverAcao(a) {
  if (a.tipo === "sistema") {
    // eventos automáticos: "Passou para Ativo" e "Concluiu a tarefa: Ligar ao Rui"
    if (a.nota.startsWith("Passou para ")) {
      return { icone: "subida", classe: "fase", antes: "Moveu", depois: a.nota.replace("Passou para ", "para ") };
    }
    if (a.nota.startsWith("Concluiu a tarefa: ")) {
      return { icone: "visto", classe: "tarefa", antes: "Concluiu uma tarefa de", depois: `· ${a.nota.replace("Concluiu a tarefa: ", "")}` };
    }
    return { icone: "raio", classe: "sistema", antes: a.nota, depois: "", ligacao: "·" };
  }
  const tipo = TIPOS[a.tipo] ?? TIPOS.nota;
  return { icone: tipo.icone, classe: a.tipo, antes: tipo.texto, depois: "", excerto: a.nota };
}

// mostra os primeiros VISIVEIS itens e esconde o resto num <details> ("Ver mais N" / "Ver menos").
// Funciona sem JavaScript; "Lista" é a tag da lista (ol ou ul) com a sua classe.
function ListaComMais({ itens, desenhar, Lista = "ul", className }) {
  const primeiros = itens.slice(0, VISIVEIS);
  const resto = itens.slice(VISIVEIS);
  return (
    <>
      <Lista className={className}>{primeiros.map(desenhar)}</Lista>
      {resto.length > 0 && (
        <details className={styles.mais}>
          <summary>
            <span className={styles.abrir}>Ver mais {resto.length}</span>
            <span className={styles.fechar}>Ver menos</span>
          </summary>
          <Lista className={className}>{resto.map(desenhar)}</Lista>
        </details>
      )}
    </>
  );
}

export default async function PaginaMembro({ params }) {
  const { id } = await params;
  const { supabase, perfil: eu, empresa, eAdmin } = await obterSessao();
  if (!eAdmin) redirect("/painel");
  if (!UUID.test(id)) notFound();

  const hoje = hojeEmPortugal();
  const contar = (tabela) => supabase.from(tabela).select("id", { count: "exact", head: true });

  // tudo em paralelo; o RLS deixa o admin ver os dados de toda a empresa
  const [
    { data: membro },
    { data: resumo },
    { data: acoes, count: nAcoes },
    { data: resolvidas, count: nResolvidas },
    { count: nPorFazer },
    { count: nAtrasadas },
    { data: clientes, count: nClientes },
  ] = await Promise.all([
    supabase.from("perfis").select("id, nome, email, papel, criado_em").eq("id", id).maybeSingle(),
    supabase.rpc("resumo_equipa"),
    supabase
      .from("interacoes")
      .select("id, tipo, nota, criado_em, cliente_id, clientes(nome)", { count: "exact" })
      .eq("autor_id", id)
      .order("criado_em", { ascending: false })
      .limit(N_ACOES),
    supabase
      .from("tarefas")
      .select("id, titulo, concluida_em, data_limite, cliente_id, clientes(nome)", { count: "exact" })
      .eq("responsavel_id", id)
      .eq("concluida", true)
      .order("concluida_em", { ascending: false, nullsFirst: false })
      .limit(N_TAREFAS),
    contar("tarefas").eq("responsavel_id", id).eq("concluida", false),
    contar("tarefas").eq("responsavel_id", id).eq("concluida", false).lt("data_limite", hoje),
    supabase
      .from("clientes")
      .select("id, nome, email, estado, valor_previsto, criado_em", { count: "exact" })
      .eq("responsavel_id", id)
      .order("criado_em", { ascending: false })
      .limit(N_CLIENTES),
  ]);

  if (!membro) notFound();

  // clientes por fase e valor em aberto (novo + em negociação), já contados pela base de dados
  const porEstado = {};
  let emAberto = 0;
  for (const r of resumo ?? []) {
    if (r.responsavel_id !== id) continue;
    porEstado[r.estado] = (porEstado[r.estado] ?? 0) + Number(r.n);
    if (r.estado === "novo" || r.estado === "negociacao") emAberto += Number(r.soma) || 0;
  }
  const totalClientes = nClientes ?? 0;
  const ganhos = porEstado.ativo ?? 0;

  const eDono = membro.id === empresa.dono_id;
  const nomePapel = eDono ? "Dono" : membro.papel === "admin" ? "Administrador" : "Comercial";
  const primeiroNome = membro.nome.split(" ")[0];

  const listaAcoes = acoes ?? [];
  const listaResolvidas = resolvidas ?? [];
  const listaClientes = clientes ?? [];

  return (
    <div className={`entrar ${styles.pagina}`}>
      {/* ---------- cabeçalho: quem é ---------- */}
      <header className={styles.cabecalho}>
        <Link href="/painel/equipa" className={styles.voltar}>
          Equipa
        </Link>
        <div className={styles.identidade}>
          <span className={styles.avatar} aria-hidden="true">
            {iniciais(membro.nome)}
          </span>
          <div>
            <h1>
              {membro.nome} {membro.id === eu.id && <em>(tu)</em>}
            </h1>
            <p className={styles.resumo}>
              <span className={membro.papel === "admin" ? styles.papelAdmin : styles.papel}>{nomePapel}</span>
              <a href={`mailto:${membro.email}`}>{membro.email}</a>
              <span>Na equipa desde {formatarData(membro.criado_em)}</span>
            </p>
          </div>
        </div>
      </header>

      {/* ---------- números ---------- */}
      <section className={styles.numeros} aria-label="Resumo">
        <div className={styles.numeroCartao}>
          <span>Leads</span>
          <strong>{numero(totalClientes)}</strong>
          {/* barra com os clientes por fase */}
          <div className={styles.barra} aria-hidden="true">
            {totalClientes === 0 ? (
              <i className={styles.barraVazia} />
            ) : (
              ESTADOS.map((e) =>
                porEstado[e.chave] ? <i key={e.chave} style={{ flexGrow: porEstado[e.chave], background: e.cor }} /> : null
              )
            )}
          </div>
        </div>
        <div className={styles.numeroCartao}>
          <span>Em aberto</span>
          <strong>{formatarEuros(emAberto)}</strong>
          <small>novos + em negociação</small>
        </div>
        <div className={styles.numeroCartao}>
          <span>Leads ganhos</span>
          <strong>{numero(ganhos)}</strong>
          <small>na fase Ativo</small>
        </div>
        <div className={styles.numeroCartao}>
          <span>Tarefas resolvidas</span>
          <strong>{numero(nResolvidas ?? 0)}</strong>
          <small>
            {numero(nPorFazer ?? 0)} por fazer
            {nAtrasadas ? <b className={styles.atraso}> · {numero(nAtrasadas)} em atraso</b> : null}
          </small>
        </div>
      </section>

      <div className={styles.grelha}>
        {/* ---------- ações recentes ---------- */}
        <section className={styles.bloco} aria-labelledby="titulo-acoes">
          <header className={styles.topoBloco}>
            <h2 id="titulo-acoes">Ações recentes</h2>
            <span>{numero(nAcoes ?? 0)}</span>
          </header>
          {listaAcoes.length === 0 ? (
            <p className={styles.vazio}>{primeiroNome} ainda não registou nada no histórico dos leads.</p>
          ) : (
            <ListaComMais
              Lista="ol"
              className={styles.acoes}
              itens={listaAcoes}
              desenhar={(a) => {
                const d = descreverAcao(a);
                return (
                  <li key={a.id} className={`${styles.acao} ${styles[`tipo-${d.classe}`] ?? ""}`}>
                    <span className={styles.iconeAcao}>
                      <Icone nome={d.icone} tamanho={14} />
                    </span>
                    <div className={styles.corpoAcao}>
                      <p>
                        {d.antes} {d.ligacao && `${d.ligacao} `}
                        <Link href={`/painel/clientes/${a.cliente_id}`} className={styles.cliente}>
                          {a.clientes?.nome ?? "lead"}
                        </Link>
                        {d.depois && ` ${d.depois}`}
                      </p>
                      {d.excerto && <p className={styles.excerto}>{d.excerto}</p>}
                      <time dateTime={a.criado_em}>{tempoRelativo(a.criado_em)}</time>
                    </div>
                  </li>
                );
              }}
            />
          )}
          {(nAcoes ?? 0) > listaAcoes.length && (
            <p className={styles.nota}>A mostrar as {N_ACOES} mais recentes.</p>
          )}
        </section>

        <div className={styles.coluna}>
          {/* ---------- tarefas resolvidas ---------- */}
          <section className={styles.bloco} aria-labelledby="titulo-tarefas">
            <header className={styles.topoBloco}>
              <h2 id="titulo-tarefas">Tarefas resolvidas</h2>
              <span>{numero(nResolvidas ?? 0)}</span>
            </header>
            {listaResolvidas.length === 0 ? (
              <p className={styles.vazio}>Ainda não há tarefas concluídas.</p>
            ) : (
              <ListaComMais
                className={styles.lista}
                itens={listaResolvidas}
                desenhar={(t) => (
                  <li key={t.id} className={styles.linha}>
                    <Icone nome="visto" tamanho={15} className={styles.visto} />
                    <div className={styles.textoLinha}>
                      <strong>{t.titulo}</strong>
                      <small>
                        <Link href={`/painel/clientes/${t.cliente_id}`}>{t.clientes?.nome ?? "cliente"}</Link>
                        {t.concluida_em && <> · {tempoRelativo(t.concluida_em)}</>}
                      </small>
                    </div>
                  </li>
                )}
              />
            )}
            {(nResolvidas ?? 0) > listaResolvidas.length && (
              <p className={styles.nota}>A mostrar as {N_TAREFAS} mais recentes.</p>
            )}
          </section>

          {/* ---------- clientes ---------- */}
          <section className={styles.bloco} aria-labelledby="titulo-clientes">
            <header className={styles.topoBloco}>
              <h2 id="titulo-clientes">Leads</h2>
              <span>{numero(totalClientes)}</span>
            </header>
            {listaClientes.length === 0 ? (
              <p className={styles.vazio}>{primeiroNome} ainda não é responsável por nenhum lead.</p>
            ) : (
              <ListaComMais
                className={styles.lista}
                itens={listaClientes}
                desenhar={(c) => {
                  const estado = ESTADOS.find((e) => e.chave === c.estado) ?? ESTADOS[0];
                  return (
                    <li key={c.id}>
                      <Link href={`/painel/clientes/${c.id}`} className={`${styles.linha} ${styles.linhaCliente}`}>
                        <div className={styles.textoLinha}>
                          <strong>{c.nome}</strong>
                          <small>{c.email ?? "Sem email"}</small>
                        </div>
                        <span className={styles.estado} style={{ "--cor": estado.cor }}>
                          {estado.texto}
                        </span>
                        <span className={styles.valor}>
                          {c.valor_previsto !== null ? formatarEuros(c.valor_previsto) : "—"}
                        </span>
                      </Link>
                    </li>
                  );
                }}
              />
            )}
            {totalClientes > listaClientes.length && (
              <p className={styles.nota}>A mostrar os {N_CLIENTES} mais recentes.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
