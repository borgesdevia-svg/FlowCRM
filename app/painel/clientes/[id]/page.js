import Link from "next/link";
import { notFound } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { obterEstado, formatarData, formatarEuros } from "@/lib/estados";
import FormCliente from "@/components/clientes/FormCliente";
import BotaoApagarCliente from "@/components/clientes/BotaoApagarCliente";
import BotoesFase from "@/components/clientes/BotoesFase";
import Historico from "@/components/clientes/Historico";
import FormTarefa from "@/components/tarefas/FormTarefa";
import ListaTarefas from "@/components/tarefas/ListaTarefas";
import Icone from "@/components/Icone";
import styles from "../ficha.module.css";

// Rota DINÂMICA /painel/clientes/[id] — a pasta [id] apanha qualquer valor no URL.
// Ex.: /painel/clientes/3f2a...  ->  params.id = "3f2a..."
export const metadata = { title: "Cliente · FlowCRM" };

const REGEX_UUID = /^[0-9a-f-]{36}$/i;

export default async function PaginaCliente({ params }) {
  const { id } = await params;
  if (!REGEX_UUID.test(id)) notFound();

  const { supabase, perfil, eAdmin } = await obterSessao();

  // se o cliente não existir OU for de outra empresa/de outro comercial,
  // o RLS não o devolve e mostramos a página "não encontrado".
  // perfis(nome) junta o nome do responsável.
  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, nome, email, telefone, estado, valor_previsto, responsavel_id, origem, respostas, criado_em, perfis(nome)")
    .eq("id", id)
    .maybeSingle();

  if (!cliente) notFound();

  // As consultas seguintes não dependem umas das outras: fazemo-las ao mesmo tempo.
  //  - membros da equipa (só o admin precisa, para escolher o responsável)
  //  - interações (histórico), da mais recente para a mais antiga, com o nome do autor
  //  - tarefas: primeiro as por fazer, depois por data limite
  const [membrosRes, { data: interacoes }, { data: tarefas }] = await Promise.all([
    eAdmin ? supabase.from("perfis").select("id, nome").order("nome") : Promise.resolve({ data: null }),
    supabase
      .from("interacoes")
      .select("id, tipo, nota, criado_em, autor_id, perfis(nome)")
      .eq("cliente_id", id)
      .order("criado_em", { ascending: false }),
    supabase
      .from("tarefas")
      .select("id, cliente_id, titulo, data_limite, concluida")
      .eq("cliente_id", id)
      .order("concluida")
      .order("data_limite", { ascending: true, nullsFirst: false }),
  ]);
  // a própria pessoa aparece como "(eu)" na escolha do responsável
  const membros = eAdmin
    ? (membrosRes.data ?? []).map((m) => (m.id === perfil.id ? { ...m, nome: `${m.nome} (eu)` } : m))
    : null;
  const listaTarefas = tarefas ?? [];
  const porFazer = listaTarefas.filter((t) => !t.concluida).length;

  const est = obterEstado(cliente.estado);
  const responsavel = cliente.perfis?.nome;

  return (
    <div className={styles.pagina}>
      <Link href="/painel/clientes" className={styles.voltar}>
        Clientes
      </Link>

      {/* ---------- cabeçalho grande do cliente ---------- */}
      <header className={`entrar ${styles.cabecalhoFicha}`} style={{ "--cor": est.cor }}>
        <div className={styles.identidade}>
          <div className={styles.nomeMeta}>
            <div className={styles.linhaNome}>
              <h1>{cliente.nome}</h1>
              <span className={styles.etiquetaEstado}>{est.texto}</span>
            </div>
            <p className={styles.meta}>
              {cliente.origem === "formulario" ? "Chegou pelo formulário público" : "Adicionado à mão"} em{" "}
              {formatarData(cliente.criado_em)}
            </p>

            {/* contactos clicáveis: mailto abre o email, tel liga (no telemóvel) */}
            <div className={styles.contactos}>
              {cliente.email && (
                <a href={`mailto:${cliente.email}`} className={styles.contacto}>
                  <Icone nome="email" tamanho={15} />
                  {cliente.email}
                </a>
              )}
              {cliente.telefone && (
                <a href={`tel:${cliente.telefone}`} className={styles.contacto}>
                  <Icone nome="telemovel" tamanho={15} />
                  {cliente.telefone}
                </a>
              )}
              {!cliente.email && !cliente.telefone && (
                <span className={styles.semContactos}>Sem contactos registados</span>
              )}
            </div>
          </div>
        </div>

        {/* à direita: valor previsto, responsável e botões para mudar de fase */}
        <div className={styles.resumoCliente}>
          <div className={styles.numerosCliente}>
            <div>
              <small>Valor previsto</small>
              <strong>{cliente.valor_previsto !== null ? formatarEuros(cliente.valor_previsto) : "—"}</strong>
            </div>
            <div>
              <small>Responsável</small>
              <span className={styles.responsavel}>
                {responsavel ? (
                  responsavel
                ) : (
                  <em>Por atribuir</em>
                )}
              </span>
            </div>
          </div>
          <BotoesFase cliente={cliente} grande className={styles.fases} />
        </div>
      </header>

      {/* ---------- duas colunas: dados + tarefas | histórico ---------- */}
      <div className={styles.colunas}>
        <div className={styles.coluna}>
          {/* respostas às perguntas extra do formulário público (se o cliente veio de lá) */}
          {cliente.respostas?.length > 0 && (
            <section className={`entrar ${styles.cartao}`} style={{ "--atraso": "60ms" }}>
              <header className={styles.topoCartao}>
                <h2>Respostas do formulário</h2>
              </header>
              <dl className={styles.respostas}>
                {cliente.respostas.map((r, i) => (
                  <div key={i}>
                    <dt>{r.pergunta}</dt>
                    <dd>{r.resposta}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section className={`entrar ${styles.cartao}`} style={{ "--atraso": "80ms" }}>
            <header className={styles.topoCartao}>
              <h2>Dados do cliente</h2>
            </header>
            <FormCliente cliente={cliente} membros={membros} />
          </section>

          <section className={`entrar ${styles.cartao}`} style={{ "--atraso": "140ms" }}>
            <header className={styles.topoCartao}>
              <h2>
                Tarefas <span>{porFazer} por fazer</span>
              </h2>
            </header>
            <FormTarefa clienteId={cliente.id} />
            <ListaTarefas tarefas={listaTarefas} mensagemVazia="Sem tarefas para este cliente." />
          </section>

          <section className={`entrar ${styles.zonaPerigo}`} style={{ "--atraso": "200ms" }}>
            <div>
              <strong>Apagar este cliente</strong>
              <p>Apaga também as notas e as tarefas. Não dá para desfazer.</p>
            </div>
            <BotaoApagarCliente id={cliente.id} nome={cliente.nome} />
          </section>
        </div>

        <div className={`entrar ${styles.cartao}`} style={{ "--atraso": "110ms" }}>
          <Historico clienteId={cliente.id} interacoes={interacoes ?? []} perfilId={perfil.id} eAdmin={eAdmin} />
        </div>
      </div>
    </div>
  );
}
