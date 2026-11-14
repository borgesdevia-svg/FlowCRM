import Link from "next/link";
import { obterSessao } from "@/lib/sessao";
import { hojeEmPortugal } from "@/lib/datas";
import TabelaTarefas from "@/components/tarefas/TabelaTarefas";
import Icone from "@/components/Icone";
import VistasTarefas from "@/components/tarefas/VistasTarefas";
import FiltroPessoa from "@/components/tarefas/FiltroPessoa";
import styles from "./calendario.module.css";

// Rota /painel/tarefas/calendario — as tarefas num calendário do mês, pela data limite.
// O mês, o dia escolhido e a pessoa vivem no URL (?mes=2026-11&dia=2026-11-14&pessoa=...).
// Cada dia mostra as primeiras tarefas; ao clicar num dia, as tarefas desse dia aparecem
// por baixo numa tabela (com seleção para concluir ou apagar várias).
// Tal como na página Tarefas: o admin vê a equipa toda (e filtra por pessoa), o comercial as suas.
export const metadata = { title: "Calendário · FlowCRM" };

const NO_DIA = 3; // tarefas que cabem dentro de cada dia
const LIMITE = 1000; // máximo de tarefas pedidas para um mês
const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

// "2026-11-14" -> Date em UTC (assim o dia nunca "foge" por causa do fuso)
const paraData = (iso) => new Date(`${iso}T00:00:00Z`);
const paraISO = (d) => d.toISOString().slice(0, 10);

export default async function PaginaCalendario({ searchParams }) {
  const { mes = "", dia = "", pessoa = "" } = await searchParams;
  const { supabase, perfil, eAdmin } = await obterSessao();
  const hoje = hojeEmPortugal();

  // o mês vem do URL ("2026-11"); se não vier ou for inválido, é o mês de hoje
  const mesAtual = /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : hoje.slice(0, 7);
  const primeiro = paraData(`${mesAtual}-01`);
  const ano = primeiro.getUTCFullYear();
  const numMes = primeiro.getUTCMonth();
  const diasNoMes = new Date(Date.UTC(ano, numMes + 1, 0)).getUTCDate();

  // a grelha começa na segunda-feira antes do dia 1 (getUTCDay: 0 = domingo)
  const recuo = (primeiro.getUTCDay() + 6) % 7;
  const semanas = Math.ceil((recuo + diasNoMes) / 7);
  const inicio = new Date(primeiro);
  inicio.setUTCDate(1 - recuo);
  const dias = Array.from({ length: semanas * 7 }, (_, i) => {
    const d = new Date(inicio);
    d.setUTCDate(inicio.getUTCDate() + i);
    return paraISO(d);
  });
  const fim = dias.at(-1);

  // o dia escolhido: o do URL (se estiver na grelha) ou hoje (se estiver neste mês)
  const diaEscolhido = dias.includes(dia) ? dia : hoje.startsWith(mesAtual) ? hoje : "";

  // filtro por pessoa (igual à página Tarefas)
  const pessoaValida = /^[0-9a-f-]{36}$/i.test(pessoa) ? pessoa : "";
  const filtrar = (consulta) => {
    if (!eAdmin) return consulta.eq("responsavel_id", perfil.id);
    if (pessoaValida) return consulta.eq("responsavel_id", pessoaValida);
    return consulta;
  };

  // em paralelo: as tarefas da grelha (+ o total), quantas não têm data, e a equipa (admin)
  const [{ data, count }, { count: semData }, membrosRes] = await Promise.all([
    filtrar(
      supabase
        .from("tarefas")
        .select("id, cliente_id, responsavel_id, titulo, data_limite, concluida, clientes(nome), perfis(nome)", {
          count: "exact",
        })
        .gte("data_limite", dias[0])
        .lte("data_limite", fim)
    )
      .order("data_limite", { ascending: true })
      .order("concluida", { ascending: true }) // dentro do dia: por fazer primeiro
      .limit(LIMITE),
    filtrar(
      supabase.from("tarefas").select("id", { count: "exact", head: true }).eq("concluida", false).is("data_limite", null)
    ),
    eAdmin ? supabase.from("perfis").select("id, nome").order("nome") : Promise.resolve({ data: null }),
  ]);
  const membros = membrosRes.data ?? [];

  // agrupar por dia: { "2026-11-14": [tarefa, ...] }
  const porDia = {};
  for (const t of data ?? []) (porDia[t.data_limite] ??= []).push(t);

  // links que mantêm o que já estava escolhido
  const link = (mudar) => {
    const valores = { mes: mesAtual, dia: diaEscolhido, pessoa: pessoaValida, ...mudar };
    const params = new URLSearchParams();
    for (const [chave, valor] of Object.entries(valores)) if (valor) params.set(chave, valor);
    return `/painel/tarefas/calendario?${params}`;
  };
  const mesVizinho = (passo) => paraISO(new Date(Date.UTC(ano, numMes + passo, 1))).slice(0, 7);

  const nomeMes = new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    primeiro
  );
  const nomeDia = (iso) =>
    new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
      paraData(iso)
    );

  // cor de cada tarefa no calendário
  const classeTarefa = (t) => {
    if (t.concluida) return styles.feita;
    if (t.data_limite < hoje) return styles.atrasada;
    if (t.data_limite === hoje) return styles.hoje;
    return styles.proxima;
  };

  const doDia = diaEscolhido ? porDia[diaEscolhido] ?? [] : [];

  return (
    <div className={`entrar ${styles.pagina}`}>
      <header className={styles.cabecalho}>
        <div>
          <h1>Calendário</h1>
          <p className={styles.resumo}>
            {eAdmin ? "As tarefas da equipa" : "As tuas tarefas"} pela data limite.
            {semData > 0 && ` ${semData} por fazer sem data não aparecem aqui.`}
          </p>
        </div>
        <VistasTarefas atual="calendario" />
      </header>

      {/* barra: mudar de mês à esquerda, filtro por pessoa (só o admin) à direita */}
      <div className={styles.ferramentas}>
        <nav className={styles.meses} aria-label="Mudar de mês">
          <Link href={link({ mes: mesVizinho(-1), dia: "" })} className={styles.seta} aria-label="Mês anterior">
            <Icone nome="esquerda" tamanho={18} />
          </Link>
          <h2 className={styles.nomeMes}>{nomeMes}</h2>
          <Link href={link({ mes: mesVizinho(1), dia: "" })} className={styles.seta} aria-label="Mês seguinte">
            <Icone nome="direita" tamanho={18} />
          </Link>
          {!hoje.startsWith(mesAtual) && (
            <Link href={link({ mes: hoje.slice(0, 7), dia: hoje })} className={styles.irHoje}>
              Hoje
            </Link>
          )}
        </nav>

        {eAdmin && membros.length > 1 && <FiltroPessoa membros={membros} perfilId={perfil.id} atual={pessoaValida} />}
      </div>

      {count > LIMITE && (
        <p className="alerta alerta-erro">
          Este mês tem {count} tarefas e só aparecem as primeiras {LIMITE}. Filtra por pessoa para ver as restantes.
        </p>
      )}

      {/* a grelha do mês: cada dia é um link que o escolhe */}
      <section className={styles.grelha} aria-label={`Tarefas de ${nomeMes}`}>
        {DIAS_SEMANA.map((d) => (
          <span key={d} className={styles.diaSemana}>
            {d}
          </span>
        ))}
        {dias.map((d) => {
          const tarefas = porDia[d] ?? [];
          const porFazer = tarefas.filter((t) => !t.concluida).length;
          const classes = [
            styles.dia,
            !d.startsWith(mesAtual) && styles.foraDoMes,
            d === hoje && styles.eHoje,
            d === diaEscolhido && styles.escolhido,
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <Link
              key={d}
              href={link({ dia: d, mes: d.slice(0, 7) })}
              scroll={false}
              className={classes}
              aria-label={`${nomeDia(d)}: ${tarefas.length} ${tarefas.length === 1 ? "tarefa" : "tarefas"}`}
            >
              <span className={styles.numeroDia}>{Number(d.slice(8))}</span>
              {/* no computador: os títulos das primeiras tarefas */}
              <span className={styles.tarefasDia}>
                {tarefas.slice(0, NO_DIA).map((t) => (
                  <span key={t.id} className={`${styles.tarefa} ${classeTarefa(t)}`}>
                    {t.titulo}
                  </span>
                ))}
                {tarefas.length > NO_DIA && <span className={styles.maisDia}>+{tarefas.length - NO_DIA}</span>}
              </span>
              {/* no telemóvel: só um número com as que faltam fazer */}
              {porFazer > 0 && <span className={styles.ponto}>{porFazer}</span>}
            </Link>
          );
        })}
      </section>

      {/* as tarefas do dia escolhido */}
      <section className={styles.bloco} aria-live="polite">
        {diaEscolhido ? (
          <>
            <h2 className={styles.tituloDia}>{nomeDia(diaEscolhido)}</h2>
            {/* key: ao mudar de dia a seleção começa vazia */}
            <TabelaTarefas
              key={diaEscolhido}
              tarefas={doDia}
              hoje={hoje}
              mensagemVazia="Nada marcado para este dia."
              membros={eAdmin ? membros : null}
              perfilId={perfil.id}
              mostrarResponsavel={eAdmin}
            />
          </>
        ) : (
          <p className={styles.dica}>Escolhe um dia para ver as tarefas.</p>
        )}
      </section>
    </div>
  );
}
