import Link from "next/link";
import { obterSessao } from "@/lib/sessao";
import { hojeEmPortugal } from "@/lib/datas";
import FormTarefa from "@/components/tarefas/FormTarefa";
import ListaTarefas from "@/components/tarefas/ListaTarefas";
import styles from "./tarefas.module.css";

// Rota /painel/tarefas — todas as tarefas num só sítio.
// O admin vê as da equipa toda (e pode filtrar por pessoa); o comercial vê só as suas.
// Os filtros vivem no URL (ex.: ?filtro=atrasadas&pessoa=...), como na lista de clientes.
export const metadata = { title: "Tarefas · FlowCRM" };

// Os filtros possíveis. "teste" diz se uma tarefa pertence ao filtro
// (hoje = data de hoje no formato AAAA-MM-DD; estas datas comparam-se como texto).
const FILTROS = [
  { chave: "pendentes", texto: "Por fazer", teste: (t) => !t.concluida },
  { chave: "atrasadas", texto: "Atrasadas", teste: (t, hoje) => !t.concluida && t.data_limite && t.data_limite < hoje },
  { chave: "hoje", texto: "Hoje", teste: (t, hoje) => !t.concluida && t.data_limite === hoje },
  {
    chave: "proximas",
    texto: "Próximas",
    teste: (t, hoje) => !t.concluida && (!t.data_limite || t.data_limite > hoje),
  },
  { chave: "feitas", texto: "Feitas", teste: (t) => t.concluida },
];

export default async function PaginaTarefas({ searchParams }) {
  const { filtro = "pendentes", pessoa = "" } = await searchParams;
  const { supabase, perfil, eAdmin } = await obterSessao();

  // tarefas, com o nome do cliente e do responsável (o RLS já filtra pela empresa)
  let consulta = supabase
    .from("tarefas")
    .select("id, cliente_id, titulo, data_limite, concluida, responsavel_id, clientes(nome), perfis(nome)")
    .order("data_limite", { ascending: true, nullsFirst: false });

  // o comercial vê só as suas; o admin vê todas, ou as da pessoa escolhida
  // (o valor de "pessoa" vem do URL: só o usamos se tiver o formato de um id)
  if (!eAdmin) consulta = consulta.eq("responsavel_id", perfil.id);
  else if (/^[0-9a-f-]{36}$/i.test(pessoa)) consulta = consulta.eq("responsavel_id", pessoa);

  // em paralelo: as tarefas, os clientes (para o formulário) e a equipa (só o admin precisa)
  const [{ data: tarefas }, { data: clientes }, membrosRes] = await Promise.all([
    consulta,
    supabase.from("clientes").select("id, nome").order("nome"),
    eAdmin ? supabase.from("perfis").select("id, nome").order("nome") : Promise.resolve({ data: null }),
  ]);
  const todas = tarefas ?? [];
  const membros = eAdmin ? (membrosRes.data ?? []) : null;

  // filtro escolhido (se o URL tiver um valor estranho, usamos "Por fazer")
  const hoje = hojeEmPortugal();
  const ativo = FILTROS.find((f) => f.chave === filtro) ?? FILTROS[0];
  const visiveis = todas.filter((t) => ativo.teste(t, hoje));

  // nas "Feitas" mostramos as mais recentes primeiro (ordem inversa da data)
  if (ativo.chave === "feitas") visiveis.reverse();

  const nAtrasadas = todas.filter((t) => FILTROS[1].teste(t, hoje)).length;
  const nHoje = todas.filter((t) => FILTROS[2].teste(t, hoje)).length;

  // monta um link mantendo os outros filtros
  const link = (novoFiltro, novaPessoa) => {
    const params = new URLSearchParams();
    if (novoFiltro !== "pendentes") params.set("filtro", novoFiltro);
    if (novaPessoa) params.set("pessoa", novaPessoa);
    const texto = params.toString();
    return `/painel/tarefas${texto ? `?${texto}` : ""}`;
  };

  return (
    <div className={styles.pagina}>
      <header className={`entrar ${styles.cabecalho}`}>
        <h1>Tarefas.</h1>
        <p className={styles.resumo}>
          {nHoje} para hoje
          <span>·</span>
          <em className={nAtrasadas ? styles.alerta : ""}>
            {nAtrasadas} {nAtrasadas === 1 ? "atrasada" : "atrasadas"}
          </em>
          <span>·</span>
          {eAdmin ? "toda a equipa" : "só as tuas"}
        </p>
      </header>

      <div className={styles.colunas}>
        <section className={`entrar ${styles.bloco}`} style={{ "--atraso": "60ms" }}>
          {/* filtros por situação, num "comprimido" (igual à lista de clientes) */}
          <nav className={styles.filtros} aria-label="Filtrar tarefas">
            {FILTROS.map((f) => (
              <Link
                key={f.chave}
                href={link(f.chave, pessoa)}
                className={f.chave === ativo.chave ? styles.filtroAtivo : styles.filtro}
              >
                {f.texto} <span>{todas.filter((t) => f.teste(t, hoje)).length}</span>
              </Link>
            ))}
          </nav>

          {/* filtro por pessoa: só o admin */}
          {eAdmin && membros.length > 1 && (
            <nav className={styles.pessoas} aria-label="Filtrar por responsável">
              <Link href={link(ativo.chave, "")} className={!pessoa ? styles.pessoaAtiva : styles.pessoa}>
                Toda a equipa
              </Link>
              {membros.map((m) => (
                <Link
                  key={m.id}
                  href={link(ativo.chave, m.id)}
                  className={pessoa === m.id ? styles.pessoaAtiva : styles.pessoa}
                >
                  {m.id === perfil.id ? "Eu" : m.nome}
                </Link>
              ))}
            </nav>
          )}

          <ListaTarefas
            tarefas={visiveis}
            mostrarCliente
            mostrarResponsavel={eAdmin}
            mensagemVazia={
              ativo.chave === "atrasadas" ? "Nada em atraso. Bom trabalho!" : "Não há tarefas neste filtro."
            }
          />
        </section>

        {/* criar tarefa: escolhendo o cliente (e o responsável, se for o admin) */}
        <section className={`entrar ${styles.bloco}`} style={{ "--atraso": "120ms" }}>
          <h2>Nova tarefa</h2>
          {(clientes ?? []).length === 0 ? (
            <p className={styles.semClientes}>
              Para criar tarefas precisas de clientes. <Link href="/painel/clientes/novo">Adiciona o primeiro.</Link>
            </p>
          ) : (
            <FormTarefa clientes={clientes} membros={membros} perfilId={perfil.id} />
          )}
        </section>
      </div>
    </div>
  );
}
