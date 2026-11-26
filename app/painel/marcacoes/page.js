import Link from "next/link";
import { obterSessao } from "@/lib/sessao";
import { CONFIG_PADRAO, FUSO, diaEmLisboa, instanteLisboa, normalizarConfig } from "@/lib/marcacoes";
import BotaoCopiar from "@/components/painel/BotaoCopiar";
import FormHorario from "@/components/marcacoes/FormHorario";
import BotaoCancelarMarcacao from "@/components/marcacoes/BotaoCancelarMarcacao";
import Icone from "@/components/Icone";
import styles from "./marcacoes.module.css";

// Rota /painel/marcacoes — as reuniões que os clientes marcaram na página pública /m/<slug>.
// Todos veem as próximas marcações dos leads que podem ver (o RLS trata disso);
// só os administradores mudam o horário e ligam/desligam a página pública.
export const metadata = { title: "Marcações · FlowCRM" };

const MAX_MARCACOES = 200;

const formatoDia = new Intl.DateTimeFormat("pt-PT", { timeZone: FUSO, weekday: "long", day: "numeric", month: "long" });
const formatoHora = new Intl.DateTimeFormat("pt-PT", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

// "Hoje", "Amanhã" ou "quinta-feira, 4 de dezembro"
function tituloDia(dia, hoje, amanha) {
  if (dia === hoje) return "Hoje";
  if (dia === amanha) return "Amanhã";
  const texto = formatoDia.format(new Date(`${dia}T12:00:00Z`));
  return texto[0].toUpperCase() + texto.slice(1);
}

// o momento atual (fora do componente: o React pede que o render não leia o relógio diretamente)
function momentoAtual() {
  return Date.now();
}

export default async function PaginaMarcacoes() {
  const { supabase, perfil, empresa, eAdmin } = await obterSessao();

  const agora = momentoAtual();
  const hoje = diaEmLisboa(agora);
  const amanha = diaEmLisboa(agora + 86400000);
  // desde o início de hoje (assim as reuniões de hoje que já passaram continuam à vista)
  const inicioHoje = instanteLisboa(hoje, 0).toISOString();

  const [{ data: marcacoes, error }, { data: bruto }] = await Promise.all([
    supabase
      .from("marcacoes")
      .select("id, inicio, fim, nota, cliente_id, clientes(nome, telefone, responsavel_id)")
      .eq("estado", "marcada")
      .gte("inicio", inicioHoje)
      .order("inicio")
      .limit(MAX_MARCACOES),
    supabase.from("marcacoes_config").select("*").eq("empresa_id", perfil.empresa_id).maybeSingle(),
  ]);
  const config = bruto ? normalizarConfig(bruto) : CONFIG_PADRAO;

  // agrupadas por dia (na hora de Portugal)
  const porDia = [];
  for (const m of marcacoes ?? []) {
    const dia = diaEmLisboa(m.inicio);
    const grupo = porDia.at(-1);
    if (grupo?.dia === dia) grupo.lista.push(m);
    else porDia.push({ dia, lista: [m] });
  }

  const link = `/m/${empresa.slug}`;

  return (
    <div className={`entrar ${styles.pagina}`}>
      <header className={styles.cabecalho}>
        <h1>Marcações</h1>
        <p className={styles.resumo}>
          {config.ligada
            ? "Os clientes marcam reuniões sozinhos, nas horas livres do teu horário."
            : "Liga as marcações online para os clientes marcarem reuniões sozinhos, nas horas livres."}
        </p>
      </header>

      {/* ---------- link da página pública ---------- */}
      {config.ligada && (
        <section className={styles.link} aria-label="Link das marcações">
          <div>
            <h2>Link para marcar</h2>
            <p>Põe-no no site, no Instagram ou envia-o por WhatsApp.</p>
          </div>
          <code>{link}</code>
          <div className={styles.acoesLink}>
            <BotaoCopiar caminho={link} className="botao botao-secundario" />
            <Link href={link} target="_blank" className="botao botao-secundario">
              Abrir <Icone nome="externo" tamanho={14} />
            </Link>
          </div>
        </section>
      )}

      {/* ---------- próximas marcações ---------- */}
      <section className={styles.agenda} aria-labelledby="titulo-agenda">
        <h2 id="titulo-agenda">Próximas marcações</h2>
        {error ? (
          <p className="alerta alerta-erro">Não foi possível carregar as marcações. Atualiza a página.</p>
        ) : porDia.length === 0 ? (
          <p className={styles.vazio}>
            {config.ligada
              ? "Ainda não há marcações. Partilha o link para os clientes começarem a marcar."
              : "Ainda não há marcações."}
          </p>
        ) : (
          porDia.map(({ dia, lista }) => (
            <div key={dia} className={styles.dia}>
              <h3>{tituloDia(dia, hoje, amanha)}</h3>
              <ul className={styles.lista}>
                {lista.map((m) => {
                  const passou = new Date(m.fim).getTime() < agora;
                  const minha = m.clientes?.responsavel_id === perfil.id;
                  return (
                    <li key={m.id} className={styles.linha} data-passou={passou || undefined}>
                      <span className={styles.hora}>
                        {formatoHora.format(new Date(m.inicio))}
                        <small>{formatoHora.format(new Date(m.fim))}</small>
                      </span>
                      <div className={styles.quem}>
                        <Link href={`/painel/clientes/${m.cliente_id}`} className={styles.nome}>
                          {m.clientes?.nome ?? "Lead"}
                        </Link>
                        <p>
                          {m.clientes?.telefone ? (
                            <a href={`tel:${m.clientes.telefone.replace(/[^\d+]/g, "")}`}>{m.clientes.telefone}</a>
                          ) : null}
                          {m.clientes?.telefone && minha ? " · " : ""}
                          {minha ? "O teu lead" : ""}
                        </p>
                        {m.nota && <p className={styles.nota}>{m.nota}</p>}
                      </div>
                      {!passou && <BotaoCancelarMarcacao id={m.id} />}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
        {(marcacoes?.length ?? 0) === MAX_MARCACOES && (
          <p className={styles.vazio}>Estão a aparecer as primeiras {MAX_MARCACOES} marcações.</p>
        )}
      </section>

      {/* ---------- horário (só administradores) ---------- */}
      {eAdmin && (
        <section className={styles.horario} aria-labelledby="titulo-horario">
          <h2 id="titulo-horario">Horário</h2>
          <FormHorario inicial={config} />
        </section>
      )}
    </div>
  );
}
