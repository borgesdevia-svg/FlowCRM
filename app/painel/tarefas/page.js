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

// Quantas tarefas feitas mostramos (as mais recentes); as antigas não interessam no dia a dia
const MAX_FEITAS = 10;

export default async function PaginaTarefas({ searchParams }) {
  const { pessoa = "", nova = "" } = await searchParams;
  const { supabase, perfil, eAdmin } = await obterSessao();

  // tarefas, com o nome do cliente e do responsável (o RLS já filtra pela empresa)
  let consulta = supabase
    .from("tarefas")
    .select("id, cliente_id, titulo, data_limite, concluida, responsavel_id, clientes(nome), perfis(nome)")
    .order("data_limite", { ascending: true, nullsFirst: false });

  // o comercial vê só as suas; o admin vê todas, ou as da pessoa escolhida
  // (o valor de "pessoa" vem do URL: só o usamos se tiver o formato de um id)
  const pessoaValida = /^[0-9a-f-]{36}$/i.test(pessoa) ? pessoa : "";
  if (!eAdmin) consulta = consulta.eq("responsavel_id", perfil.id);
  else if (pessoaValida) consulta = consulta.eq("responsavel_id", pessoaValida);

  // em paralelo: as tarefas, os clientes (para o formulário) e a equipa (só o admin precisa)
  const [{ data: tarefas }, { data: clientes }, membrosRes] = await Promise.all([
    consulta,
    supabase.from("clientes").select("id, nome").order("nome"),
    eAdmin ? supabase.from("perfis").select("id, nome").order("nome") : Promise.resolve({ data: null }),
  ]);
  const todas = tarefas ?? [];
  const membros = eAdmin ? (membrosRes.data ?? []) : null;

  // separar as tarefas pelas colunas (as datas AAAA-MM-DD comparam-se como texto)
  const hoje = hojeEmPortugal();
  const porFazer = todas.filter((t) => !t.concluida);
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
      tarefas: porFazer.filter((t) => !t.data_limite || t.data_limite > hoje),
      vazio: "Nada marcado para os próximos dias.",
    },
    {
      chave: "feitas",
      titulo: "Feitas",
      // as mais recentes primeiro (ordem inversa da data)
      tarefas: todas.filter((t) => t.concluida).reverse().slice(0, MAX_FEITAS),
      vazio: "Ainda nenhuma feita.",
    },
  ];

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
            <strong>{c.chave === "feitas" ? todas.filter((t) => t.concluida).length : c.tarefas.length}</strong>
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
