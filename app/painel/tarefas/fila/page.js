import Link from "next/link";
import { obterSessao } from "@/lib/sessao";
import { hojeEmPortugal, formatarDiaCurto, tempoRelativo } from "@/lib/datas";
import { obterEstado } from "@/lib/estados";
import { alternarTarefa, adiarTarefa } from "@/lib/acoes/tarefas";
import FormNota from "@/components/clientes/FormNota";
import Icone from "@/components/Icone";
import VistasTarefas from "@/components/tarefas/VistasTarefas";
import styles from "./fila.module.css";

// Rota /painel/tarefas/fila — MODO FILA: as minhas tarefas uma de cada vez,
// da mais urgente para a menos urgente (como a "fila" de tarefas do HubSpot).
// Para cada tarefa aparece o que é preciso para a fazer logo: o cliente, os contactos
// e o último registo; e os botões Feita, Adiar e Saltar.
//
// A posição na fila vive no URL (?pos=3). Ao concluir ou adiar, a tarefa sai da fila
// e a seguinte "sobe" para a mesma posição; ao saltar, a posição avança.
// Por defeito a fila tem só as atrasadas e as de hoje; ?vista=todas junta as próximas.
//
// ESCALA: só se pede UMA tarefa à base de dados de cada vez (range), mais o total.
export const metadata = { title: "Fila de tarefas · FlowCRM" };

const TIPOS_REGISTO = { nota: "Nota", chamada: "Chamada", email: "Email", reuniao: "Reunião", sistema: "Automático" };

// dias entre duas datas AAAA-MM-DD ("2026-11-10" e "2026-11-13" -> 3)
function diasEntre(de, ate) {
  return Math.round((new Date(`${ate}T00:00:00Z`) - new Date(`${de}T00:00:00Z`)) / 86400000);
}

// texto e cor do prazo
function prazo(dataLimite, hoje) {
  if (!dataLimite) return { texto: "Sem data", classe: styles.semData };
  const dias = diasEntre(dataLimite, hoje);
  if (dias > 1) return { texto: `Atrasada há ${dias} dias`, classe: styles.atrasada };
  if (dias === 1) return { texto: "Atrasada desde ontem", classe: styles.atrasada };
  if (dias === 0) return { texto: "Para hoje", classe: styles.hoje };
  return { texto: `Até ${formatarDiaCurto(dataLimite)}`, classe: styles.proxima };
}

export default async function PaginaFila({ searchParams }) {
  const { pos = "0", vista = "" } = await searchParams;
  const { supabase, perfil } = await obterSessao();
  const hoje = hojeEmPortugal();
  const todas = vista === "todas";
  const posicao = Math.max(0, Number.parseInt(pos, 10) || 0);

  // links que mantêm a vista escolhida
  const link = (p) => {
    const params = new URLSearchParams();
    if (todas) params.set("vista", "todas");
    if (p > 0) params.set("pos", String(p));
    const texto = params.toString();
    return texto ? `/painel/tarefas/fila?${texto}` : "/painel/tarefas/fila";
  };

  // as minhas por fazer; na vista normal, só até hoje (atrasadas + hoje)
  let consulta = supabase
    .from("tarefas")
    .select("id, titulo, data_limite, cliente_id, clientes(nome, email, telefone, estado)", { count: "exact" })
    .eq("responsavel_id", perfil.id)
    .eq("concluida", false);
  if (!todas) consulta = consulta.lte("data_limite", hoje);

  // em paralelo: a tarefa nesta posição (+ o total da fila) e quantas há para depois de hoje
  const [{ data, count }, { count: futuras }] = await Promise.all([
    consulta
      .order("data_limite", { ascending: true, nullsFirst: false })
      .order("criado_em", { ascending: true }) // desempate fixo: a ordem não muda entre pedidos
      .range(posicao, posicao),
    supabase
      .from("tarefas")
      .select("id", { count: "exact", head: true })
      .eq("responsavel_id", perfil.id)
      .eq("concluida", false)
      .or(`data_limite.gt.${hoje},data_limite.is.null`),
  ]);
  const tarefa = data?.[0];
  const total = count ?? 0;

  // o último registo do cliente, para saber em que ponto está antes de lhe ligar
  const { data: registos } = tarefa
    ? await supabase
        .from("interacoes")
        .select("tipo, nota, criado_em, perfis(nome)")
        .eq("cliente_id", tarefa.cliente_id)
        .order("criado_em", { ascending: false })
        .limit(1)
    : { data: [] };
  const ultimo = registos?.[0];

  return (
    <div className={`entrar ${styles.pagina}`}>
      <header className={styles.cabecalho}>
        <div>
          <h1>Fila de tarefas</h1>
          <p className={styles.resumo}>
            {todas ? "Todas as tuas tarefas por fazer" : "As tuas tarefas em atraso e para hoje"}, uma de cada vez
            {/* progresso: em que tarefa vou e quantas há */}
            {tarefa && (
              <>
                {" · "}
                <strong className={styles.progresso}>
                  {posicao + 1} de {total}
                </strong>
              </>
            )}
          </p>
        </div>
        <VistasTarefas atual="fila" />
      </header>

      {tarefa ? (
        <article className={styles.cartao} key={tarefa.id}>
          <div className={styles.topo}>
            {(() => {
              const p = prazo(tarefa.data_limite, hoje);
              return <span className={`${styles.prazo} ${p.classe}`}>{p.texto}</span>;
            })()}
            <h2 className={styles.titulo}>{tarefa.titulo}</h2>
          </div>

          {/* o cliente e os contactos: clicar no email ou no telefone abre o programa certo */}
          <section className={styles.cliente} aria-label="Cliente">
            <div className={styles.linhaCliente}>
              <Link href={`/painel/clientes/${tarefa.cliente_id}`} className={styles.nomeCliente}>
                {tarefa.clientes?.nome ?? "Cliente"}
              </Link>
              {tarefa.clientes?.estado && (
                <span className={styles.estado} style={{ "--cor": obterEstado(tarefa.clientes.estado).cor }}>
                  {obterEstado(tarefa.clientes.estado).texto}
                </span>
              )}
            </div>
            <div className={styles.contactos}>
              {tarefa.clientes?.telefone && (
                <a href={`tel:${tarefa.clientes.telefone}`} className={styles.contacto}>
                  <Icone nome="telemovel" tamanho={15} /> {tarefa.clientes.telefone}
                </a>
              )}
              {tarefa.clientes?.email && (
                <a href={`mailto:${tarefa.clientes.email}`} className={styles.contacto}>
                  <Icone nome="email" tamanho={15} /> {tarefa.clientes.email}
                </a>
              )}
              {!tarefa.clientes?.telefone && !tarefa.clientes?.email && (
                <span className={styles.fraco}>Sem contactos registados</span>
              )}
            </div>

            <div className={styles.ultimo}>
              <small>Último registo</small>
              {ultimo ? (
                <p>
                  <span className={styles.fraco}>
                    {TIPOS_REGISTO[ultimo.tipo] ?? "Nota"} · {ultimo.perfis?.nome ?? "Ex-membro"} ·{" "}
                    {tempoRelativo(ultimo.criado_em)}
                  </span>
                  <span className={styles.textoRegisto}>{ultimo.nota}</span>
                </p>
              ) : (
                <p className={styles.fraco}>Ainda não há registos deste cliente.</p>
              )}
            </div>
          </section>

          {/* registar o que aconteceu (chamada, email...) sem sair da fila */}
          <details className={styles.registar}>
            <summary>Registar o que aconteceu</summary>
            <FormNota clienteId={tarefa.cliente_id} />
          </details>

          {/* ações: Feita (principal), Adiar e Saltar */}
          <div className={styles.acoes}>
            <form action={alternarTarefa}>
              <input type="hidden" name="id" value={tarefa.id} />
              <input type="hidden" name="concluida" value="false" />
              <button type="submit" className="botao">
                <Icone nome="visto" tamanho={16} /> Feita
              </button>
            </form>
            <form action={adiarTarefa}>
              <input type="hidden" name="id" value={tarefa.id} />
              <input type="hidden" name="dias" value="1" />
              <button type="submit" className="botao botao-secundario">
                Para amanhã
              </button>
            </form>
            <form action={adiarTarefa}>
              <input type="hidden" name="id" value={tarefa.id} />
              <input type="hidden" name="dias" value="7" />
              <button type="submit" className="botao botao-secundario">
                Daqui a uma semana
              </button>
            </form>
            <div className={styles.navegar}>
              {posicao > 0 && (
                <Link href={link(posicao - 1)} className="botao botao-secundario" aria-label="Tarefa anterior">
                  <Icone nome="esquerda" tamanho={16} />
                </Link>
              )}
              {/* saltar a última leva ao fim da fila */}
              <Link href={link(posicao + 1)} className="botao botao-secundario">
                Saltar <Icone nome="direita" tamanho={16} />
              </Link>
            </div>
          </div>
        </article>
      ) : (
        // fila vazia ou chegou ao fim
        <section className={styles.fim}>
          {total > 0 ? (
            <>
              <h2>Chegaste ao fim da fila</h2>
              <p>
                Ficaram {total} {total === 1 ? "tarefa saltada" : "tarefas saltadas"}. Podes voltar ao início para
                as rever.
              </p>
              <Link href={link(0)} className="botao">
                Voltar ao início
              </Link>
            </>
          ) : (
            <>
              <h2>{todas ? "Não tens tarefas por fazer" : "Nada em atraso nem para hoje"}</h2>
              <p>
                {!todas && futuras > 0
                  ? `Tens ${futuras} ${futuras === 1 ? "tarefa para os próximos dias" : "tarefas para os próximos dias"}.`
                  : "Está tudo feito."}
              </p>
              {!todas && futuras > 0 ? (
                <Link href="/painel/tarefas/fila?vista=todas" className="botao">
                  Adiantar as próximas
                </Link>
              ) : (
                <Link href="/painel/tarefas" className="botao botao-secundario">
                  Ver as tarefas
                </Link>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
