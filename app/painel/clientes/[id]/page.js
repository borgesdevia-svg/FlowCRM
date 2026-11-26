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
import BotaoWhatsapp from "@/components/clientes/BotaoWhatsapp";
import BotaoEmail from "@/components/clientes/BotaoEmail";
import ListaPropostas from "@/components/propostas/ListaPropostas";
import { EtiquetaPro } from "@/components/painel/AvisoPro";
import { formatarTelefone, linkTelefone } from "@/lib/texto";
import { tempoRelativo } from "@/lib/datas";
import { eEmail, eUuid } from "@/lib/validacao";
import { nomeCanal } from "@/lib/canais";
import { procurarDuplicado } from "@/lib/procurarDuplicado";
import styles from "../ficha.module.css";

// Rota DINÂMICA /painel/clientes/[id] — a pasta [id] apanha qualquer valor no URL.
// Ex.: /painel/clientes/3f2a...  ->  params.id = "3f2a..."
export const metadata = { title: "Lead · FlowCRM" };

// ESCALA: um cliente antigo pode ter centenas de registos e tarefas.
// O histórico mostra HISTORICO registos de cada vez ("Ver mais antigos" pede mais, pelo URL ?historico=60);
// das tarefas vêm as por fazer (até MAX_POR_FAZER) e só as FEITAS_RECENTES feitas mais recentes.
const HISTORICO = 30;
const MAX_HISTORICO = 1000;
const MAX_POR_FAZER = 50;
const FEITAS_RECENTES = 10;

export default async function PaginaCliente({ params, searchParams }) {
  const { id } = await params;
  const { historico = "", proposta = "" } = await searchParams;
  // quantos registos mostrar: número do URL, entre HISTORICO e MAX_HISTORICO
  const nHistorico = Math.min(MAX_HISTORICO, Math.max(HISTORICO, Number.parseInt(historico, 10) || HISTORICO));
  if (!eUuid(id)) notFound();

  const { supabase, perfil, empresa, eAdmin, plano } = await obterSessao();

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
  //  - interações (histórico), da mais recente para a mais antiga, com o nome do autor, + o total
  //  - tarefas por fazer (por data limite) + o total
  //  - as últimas tarefas feitas + o total
  const tarefasDoCliente = (concluida) =>
    supabase
      .from("tarefas")
      .select("id, cliente_id, responsavel_id, titulo, data_limite, concluida", { count: "exact" })
      .eq("cliente_id", id)
      .eq("concluida", concluida);
  const [membrosRes, { data: interacoes, count: totalHistorico }, porFazerRes, feitasRes, propostasRes, canalRes] = await Promise.all([
    eAdmin ? supabase.from("perfis").select("id, nome").order("nome") : Promise.resolve({ data: null }),
    supabase
      .from("interacoes")
      .select("id, tipo, nota, criado_em, autor_id, perfis(nome)", { count: "exact" })
      .eq("cliente_id", id)
      .order("criado_em", { ascending: false })
      .limit(nHistorico),
    tarefasDoCliente(false).order("data_limite", { ascending: true, nullsFirst: false }).limit(MAX_POR_FAZER),
    tarefasDoCliente(true).order("concluida_em", { ascending: false, nullsFirst: false }).limit(FEITAS_RECENTES),
    // propostas deste lead (CRM Pro), da mais recente para a mais antiga
    supabase
      .from("propostas")
      .select("id, token, titulo, total, estado, validade, criado_em, respondida_em, aceite_por, autor_id")
      .eq("cliente_id", id)
      .order("criado_em", { ascending: false })
      .limit(20),
    // de onde veio (?de=instagram, migração 35). Pedido à parte: antes da migração a coluna
    // não existe, vem um erro e a ficha mostra-se na mesma, só sem o sítio.
    cliente.origem === "formulario"
      ? supabase.from("clientes").select("canal").eq("id", id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const canal = nomeCanal(canalRes.data?.canal);
  // outro lead com o mesmo email ou telefone (ex.: a pessoa preencheu o formulário duas vezes)
  const duplicado = await procurarDuplicado(supabase, { email: cliente.email ?? "", telefone: cliente.telefone ?? "" }, cliente.id);
  const propostas = propostasRes.data ?? [];
  // a própria pessoa aparece como "(eu)" na escolha do responsável
  const membros = eAdmin
    ? (membrosRes.data ?? []).map((m) => (m.id === perfil.id ? { ...m, nome: `${m.nome} (eu)` } : m))
    : null;
  const listaTarefas = [...(porFazerRes.data ?? []), ...(feitasRes.data ?? [])];
  const porFazer = porFazerRes.count ?? 0;
  // tarefas que não aparecem aqui (por fazer além das 50, feitas mais antigas)
  const tarefasEscondidas = porFazer + (feitasRes.count ?? 0) - listaTarefas.length;

  // o histórico vem do mais recente para o mais antigo: o primeiro que não é automático
  const ultimoContacto = (interacoes ?? []).find((i) => i.tipo !== "sistema");
  const est = obterEstado(cliente.estado);
  const responsavel = cliente.perfis?.nome;

  return (
    <div className={styles.pagina}>
      <Link href="/painel/clientes" className={styles.voltar}>
        Leads
      </Link>

      {duplicado && (
        <p className={`alerta ${styles.avisoDuplicado}`} role="status">
          Parece repetido: <Link href={`/painel/clientes/${duplicado.id}`}>{duplicado.nome}</Link> tem o mesmo{" "}
          {duplicado.campo === "email" ? "email" : "telefone"}. Se for a mesma pessoa, junta as notas num deles e apaga o
          outro.
        </p>
      )}

      {/* ---------- cabeçalho grande do cliente ---------- */}
      <header className={`entrar ${styles.cabecalhoFicha}`} style={{ "--cor": est.cor }}>
        <div className={styles.identidade}>
          <div className={styles.nomeMeta}>
            <div className={styles.linhaNome}>
              <h1>{cliente.nome}</h1>
              <span className={styles.etiquetaEstado}>{est.texto}</span>
            </div>
            <p className={styles.meta}>
              {cliente.origem === "formulario"
                ? `Chegou pelo formulário público${canal ? ` (${canal})` : ""}`
                : "Adicionado à mão"}{" "}
              em{" "}
              {formatarData(cliente.criado_em)}
              {/* último contacto registado (nota, chamada, email, reunião ou WhatsApp; os automáticos não contam) */}
              {" · "}
              {ultimoContacto ? `Último contacto ${tempoRelativo(ultimoContacto.criado_em)}` : "Ainda sem contactos registados"}
            </p>

            {/* contactos clicáveis: mailto abre o email, tel liga (no telemóvel) */}
            <div className={styles.contactos}>
              {/* email: abre a janela com mensagens prontas (e regista no histórico) */}
              {cliente.email && (
                <BotaoEmail
                  clienteId={cliente.id}
                  nome={cliente.nome}
                  email={cliente.email}
                  empresa={empresa.nome}
                  eu={perfil.nome}
                  className={`${styles.contacto} ${styles.contactoBotao}`}
                />
              )}
              {cliente.telefone && (
                <a href={linkTelefone(cliente.telefone)} className={styles.contacto}>
                  <Icone nome="telemovel" tamanho={15} />
                  {formatarTelefone(cliente.telefone)}
                </a>
              )}
              {cliente.telefone && (
                <BotaoWhatsapp
                  clienteId={cliente.id}
                  nome={cliente.nome}
                  telefone={cliente.telefone}
                  empresa={empresa.nome}
                  eu={perfil.nome}
                  className={`${styles.contacto} ${styles.contactoWhatsapp}`}
                />
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
                    <dd>
                      {/* sites e emails das perguntas "Site ou link" e "Email" abrem-se com um clique */}
                      {/^https?:\/\/\S+$/.test(r.resposta) ? (
                        <a href={r.resposta} target="_blank" rel="noopener noreferrer nofollow">
                          {r.resposta}
                        </a>
                      ) : eEmail(r.resposta) ? (
                        <a href={`mailto:${r.resposta}`}>{r.resposta}</a>
                      ) : (
                        r.resposta
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* propostas com aceitação online (CRM Pro) */}
          <section id="propostas" className={`entrar ${styles.cartao}`} style={{ "--atraso": "70ms" }}>
            <header className={`${styles.topoCartao} ${styles.topoComBotao}`}>
              <h2>
                Propostas {propostas.length > 0 && <span>{propostas.length}</span>}
              </h2>
              {plano.pro ? (
                <Link href={`/painel/clientes/${cliente.id}/proposta`} className="botao botao-secundario">
                  <Icone nome="documento" tamanho={15} />
                  Nova proposta
                </Link>
              ) : (
                <EtiquetaPro />
              )}
            </header>
            {plano.pro || propostas.length > 0 ? (
              <ListaPropostas
                propostas={propostas}
                clienteId={cliente.id}
                nomeCliente={cliente.nome}
                telefone={cliente.telefone}
                perfilId={perfil.id}
                eAdmin={eAdmin}
                destacarNova={proposta === "nova"}
              />
            ) : (
              <p className={styles.notaTarefas}>
                Com o CRM Pro crias orçamentos, envias o link e o cliente aceita online. O lead passa sozinho a Ativo.
              </p>
            )}
          </section>

          <section className={`entrar ${styles.cartao}`} style={{ "--atraso": "80ms" }}>
            <header className={styles.topoCartao}>
              <h2>Dados do lead</h2>
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
            <ListaTarefas
              tarefas={listaTarefas}
              mensagemVazia="Sem tarefas para este lead."
              membros={membros}
              perfilId={perfil.id}
            />
            {tarefasEscondidas > 0 && (
              <p className={styles.notaTarefas}>
                {tarefasEscondidas === 1 ? "Há mais 1 tarefa" : `Há mais ${tarefasEscondidas} tarefas`} deste lead
                (as feitas mais antigas) que não aparecem aqui.
              </p>
            )}
          </section>

          {/* RGPD: o lead pode pedir uma cópia de tudo o que a empresa guarda sobre ele */}
          <section className={`entrar ${styles.zonaDados}`} style={{ "--atraso": "180ms" }}>
            <div>
              <strong>Dados pessoais</strong>
              <p>Se este lead pedir os seus dados (RGPD), descarrega tudo o que o CRM guarda sobre ele.</p>
            </div>
            {/* <a> normal (não <Link>) porque descarrega um ficheiro */}
            <a href={`/painel/clientes/${cliente.id}/dados`} className="botao botao-secundario" download>
              <Icone nome="folha" tamanho={15} /> Descarregar
            </a>
          </section>

          <section className={`entrar ${styles.zonaPerigo}`} style={{ "--atraso": "200ms" }}>
            <div>
              <strong>Apagar este lead</strong>
              <p>Apaga também as notas e as tarefas. Não dá para desfazer.</p>
            </div>
            <BotaoApagarCliente id={cliente.id} nome={cliente.nome} />
          </section>
        </div>

        <div className={`entrar ${styles.cartao}`} style={{ "--atraso": "110ms" }}>
          <Historico
            clienteId={cliente.id}
            interacoes={interacoes ?? []}
            total={totalHistorico ?? 0}
            linkMais={`/painel/clientes/${cliente.id}?historico=${nHistorico + HISTORICO}`}
            perfilId={perfil.id}
            eAdmin={eAdmin}
          />
        </div>
      </div>
    </div>
  );
}
