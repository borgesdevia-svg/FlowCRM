import Link from "next/link";
import { obterSessao } from "@/lib/sessao";
import { hojeEmPortugal } from "@/lib/datas";
import FormTarefa from "@/components/tarefas/FormTarefa";
import QuadroTarefas from "@/components/tarefas/QuadroTarefas";
import Icone from "@/components/Icone";
import styles from "./tarefas.module.css";

// Rota /painel/tarefas — todas as tarefas num quadro (inspirado na referência H):
// contadores em cima e uma coluna por situação (Atrasadas, Hoje, Próximas, Feitas).
// O admin vê as da equipa toda (e pode filtrar por pessoa); o comercial vê só as suas.
// O filtro por pessoa vive no URL (ex.: ?pessoa=...); ?nova=1 abre logo o formulário.
export const metadata = { title: "Tarefas · FlowCRM" };

// As feitas só ficam no quadro durante uma semana; depois saem (não são apagadas:
// continuam na base de dados e no histórico do cliente)
const DIAS_FEITAS = 7;
// "Próximas" mostra a semana que vem; o que for depois fica em "Mais tarde"
const DIAS_PROXIMAS = 7;

// "2026-11-14" + 7 dias -> "2026-11-21"
function somarDias(dataISO, dias) {
  const d = new Date(`${dataISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export default async function PaginaTarefas({ searchParams }) {
  const { pessoa = "", nova = "" } = await searchParams;
  const { supabase, perfil, eAdmin } = await obterSessao();

  // o comercial vê só as suas; o admin vê todas, ou as da pessoa escolhida
  // (o valor de "pessoa" vem do URL: só o usamos se tiver o formato de um id)
  const pessoaValida = /^[0-9a-f-]{36}$/i.test(pessoa) ? pessoa : "";
  const filtrar = (consulta) => {
    if (!eAdmin) return consulta.eq("responsavel_id", perfil.id);
    if (pessoaValida) return consulta.eq("responsavel_id", pessoaValida);
    return consulta;
  };

  const campos = "id, cliente_id, titulo, data_limite, concluida, responsavel_id, clientes(nome), perfis(nome)";
  // datas AAAA-MM-DD no dia de Portugal (comparam-se como texto)
  const hoje = hojeEmPortugal();
  const desde = somarDias(hoje, -DIAS_FEITAS); // feitas a partir deste dia

  // em paralelo (o RLS já filtra pela empresa):
  //  - as tarefas por fazer (todas)
  //  - as feitas da última semana (as antigas não vêm: assim a página não cresce com o tempo)
  //  - quantas feitas há no total (só o número, para o contador)
  //  - os clientes mais recentes (sugestões no formulário; os outros encontram-se a pesquisar)
  //  - a equipa (só o admin precisa)
  const [{ data: porFazerRes }, { data: feitasRes }, { count: totalFeitas }, { data: clientes }, membrosRes] =
    await Promise.all([
      filtrar(supabase.from("tarefas").select(campos).eq("concluida", false)).order("data_limite", {
        ascending: true,
        nullsFirst: false,
      }),
      filtrar(supabase.from("tarefas").select(campos).eq("concluida", true).gte("concluida_em", desde)).order(
        "concluida_em",
        { ascending: false }
      ),
      filtrar(supabase.from("tarefas").select("id", { count: "exact", head: true }).eq("concluida", true)),
      supabase.from("clientes").select("id, nome, email, estado").order("criado_em", { ascending: false }).limit(6),
      eAdmin ? supabase.from("perfis").select("id, nome").order("nome") : Promise.resolve({ data: null }),
    ]);
  const porFazer = porFazerRes ?? [];
  const membros = eAdmin ? (membrosRes.data ?? []) : null;

  // separar as tarefas pelas colunas
  const fimSemana = somarDias(hoje, DIAS_PROXIMAS);
  const futuras = porFazer.filter((t) => !t.data_limite || t.data_limite > hoje);
  const colunas = [
    {
      chave: "atrasadas",
      titulo: "Atrasadas",
      tarefas: porFazer.filter((t) => t.data_limite && t.data_limite < hoje),
      vazio: "Nada em atraso.",
    },
    {
      chave: "hoje",
      titulo: "Hoje",
      tarefas: porFazer.filter((t) => t.data_limite === hoje),
      vazio: "Nada para hoje.",
    },
    {
      chave: "proximas",
      titulo: "Próximas",
      // só os próximos 7 dias; o resto (e as sem data) fica fechado em "Mais tarde"
      tarefas: futuras.filter((t) => t.data_limite && t.data_limite <= fimSemana),
      maisTarde: futuras.filter((t) => !t.data_limite || t.data_limite > fimSemana),
      vazio: "Nada para os próximos 7 dias.",
    },
    {
      chave: "feitas",
      titulo: "Feitas",
      tarefas: feitasRes ?? [], // as mais recentes primeiro
      vazio: "Nada feito nos últimos 7 dias.",
    },
  ];

  // contadores do topo: contam tudo (as Próximas incluem as de "Mais tarde",
  // as Feitas são o total de sempre, não só as que estão no quadro)
  const totais = {
    atrasadas: colunas[0].tarefas.length,
    hoje: colunas[1].tarefas.length,
    proximas: futuras.length,
    feitas: totalFeitas ?? 0,
  };

  // link do filtro por pessoa
  const linkPessoa = (id) => (id ? `/painel/tarefas?pessoa=${id}` : "/painel/tarefas");

  return (
    <div className={`entrar ${styles.pagina}`}>
      <header className={styles.cabecalho}>
        <div>
          <h1>Tarefas</h1>
          <p className={styles.resumo}>{eAdmin ? "As tarefas de toda a equipa." : "As tuas tarefas."}</p>
        </div>
      </header>

      {/* contadores, um por coluna (como os números no topo da referência H) */}
      <section className={styles.contadores} aria-label="Resumo">
        {colunas.map((c) => (
          <div key={c.chave} className={`${styles.contador} ${styles[c.chave]}`}>
            <strong>{totais[c.chave]}</strong>
            <span>{c.titulo}</span>
          </div>
        ))}
      </section>

      {/* barra: filtro por pessoa (só o admin) à esquerda, nova tarefa à direita */}
      <div className={styles.ferramentas}>
        {eAdmin && membros.length > 1 ? (
          <nav className={styles.pessoas} aria-label="Filtrar por responsável">
            <Link href={linkPessoa("")} className={!pessoaValida ? styles.pessoaAtiva : styles.pessoa}>
              Toda a equipa
            </Link>
            {membros.map((m) => (
              <Link
                key={m.id}
                href={linkPessoa(m.id)}
                className={pessoaValida === m.id ? styles.pessoaAtiva : styles.pessoa}
              >
                {m.id === perfil.id ? "Eu" : m.nome}
              </Link>
            ))}
          </nav>
        ) : (
          <span></span>
        )}

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

      <QuadroTarefas colunas={colunas} mostrarResponsavel={eAdmin} />
    </div>
  );
}
