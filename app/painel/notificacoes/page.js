import Link from "next/link";
import { obterSessao } from "@/lib/sessao";
import { hojeEmPortugal, formatarDiaCurto, tempoRelativo, urgenciaSemResponsavel } from "@/lib/datas";
import ListaNotificacoes from "@/components/painel/ListaNotificacoes";
import AtribuirCliente from "@/components/painel/AtribuirCliente";
import styles from "./notificacoes.module.css";

// Rota /painel/notificacoes — tudo o que o sino avisa, numa página inteira:
// as MINHAS tarefas por fazer que estão em atraso ou que acabam hoje.
// O sino do menu mostra só as primeiras; aqui aparecem todas. Seleciona-se
// uma ou várias e "Marcar como feitas" conclui-as de uma vez.
// Os administradores veem também, em primeiro lugar, os clientes que chegaram sem
// responsável, com a urgência (pelo tempo de espera) e a lista para os entregar a alguém.
export const metadata = { title: "Notificações · FlowCRM" };

const MOSTRAR = 100;

// texto e cor de cada nível de urgência dos clientes sem responsável
const URGENCIA = {
  verde: "Chegou agora",
  amarelo: "À espera há mais de 4 horas",
  vermelho: "Urgente: à espera há mais de um dia",
};

// dias entre duas datas AAAA-MM-DD ("2026-11-10" e "2026-11-13" -> 3)
function diasEntre(de, ate) {
  return Math.round((new Date(`${ate}T00:00:00Z`) - new Date(`${de}T00:00:00Z`)) / 86400000);
}

export default async function PaginaNotificacoes() {
  const { supabase, perfil, eAdmin } = await obterSessao();
  const hoje = hojeEmPortugal();

  // ESCALA: só vêm as MOSTRAR mais antigas (as mais urgentes); os totais vêm contados
  // à parte, para a frase do topo estar certa mesmo com centenas de tarefas
  const minhas = (campos, opcoes) =>
    supabase.from("tarefas").select(campos, opcoes).eq("responsavel_id", perfil.id).eq("concluida", false);
  const [{ data }, { count: totalAtrasadas }, { count: totalHoje }, { data: semResponsavel, count: totalSem }, { data: equipa }] = await Promise.all([
    minhas("id, titulo, data_limite, cliente_id, clientes(nome)")
      .lte("data_limite", hoje)
      .order("data_limite", { ascending: true })
      .limit(MOSTRAR),
    minhas("id", { count: "exact", head: true }).lt("data_limite", hoje),
    minhas("id", { count: "exact", head: true }).eq("data_limite", hoje),
    eAdmin
      ? supabase
          .from("clientes")
          .select("id, nome, criado_em", { count: "exact" })
          .is("responsavel_id", null)
          .order("criado_em", { ascending: true })
          .limit(MOSTRAR)
      : { data: [], count: 0 },
    eAdmin ? supabase.from("perfis").select("id, nome").order("nome") : { data: [] },
  ]);
  const semDono = semResponsavel ?? [];
  const nSem = totalSem ?? 0;
  const todas = data ?? [];
  const total = (totalAtrasadas ?? 0) + (totalHoje ?? 0);

  // texto do prazo: "Hoje", "Desde ontem" ou "Há 3 dias · 10 de novembro"
  const prazo = (data) => {
    const dias = diasEntre(data, hoje);
    if (dias <= 0) return "Hoje";
    if (dias === 1) return "Desde ontem";
    return `Há ${dias} dias · ${formatarDiaCurto(data)}`;
  };
  // só o que a lista precisa (vai para um componente de cliente)
  const preparar = (t) => ({
    id: t.id,
    titulo: t.titulo,
    clienteId: t.cliente_id,
    cliente: t.clientes?.nome ?? "Cliente",
    prazo: prazo(t.data_limite),
  });

  const grupos = [
    { chave: "atrasadas", titulo: "Em atraso", tarefas: todas.filter((t) => t.data_limite < hoje).map(preparar) },
    { chave: "hoje", titulo: "Acabam hoje", tarefas: todas.filter((t) => t.data_limite === hoje).map(preparar) },
  ].filter((g) => g.tarefas.length > 0);

  // frase do topo (com os totais verdadeiros)
  const nAtrasadas = totalAtrasadas ?? 0;
  const nHoje = totalHoje ?? 0;
  const partes = [];
  if (nAtrasadas) partes.push(`${nAtrasadas} ${nAtrasadas === 1 ? "tarefa em atraso" : "tarefas em atraso"}`);
  if (nHoje) partes.push(`${nHoje} para hoje`);
  if (nSem) partes.push(`${nSem} ${nSem === 1 ? "cliente sem responsável" : "clientes sem responsável"}`);

  return (
    <div className={`entrar ${styles.pagina}`}>
      <header className={styles.cabecalho}>
        <h1>Notificações</h1>
        <p className={styles.resumo}>
          {partes.length === 0
            ? "Está tudo em dia."
            : `Tens ${partes.length > 1 ? `${partes.slice(0, -1).join(", ")} e ${partes.at(-1)}` : partes[0]}.`}
        </p>
      </header>

      {semDono.length > 0 && (
        <section className={styles.grupo} aria-labelledby="grupo-sem-responsavel">
          <h2 id="grupo-sem-responsavel" className={styles.tituloGrupo}>
            <i className={styles.atrasadas}></i>
            Clientes sem responsável <span>{nSem}</span>
          </h2>
          <ul className={styles.lista}>
            {semDono.map((c) => {
              const nivel = urgenciaSemResponsavel(c.criado_em);
              return (
                <li key={c.id} className={styles.linha}>
                  <i className={styles[`urgencia_${nivel}`]} aria-hidden="true"></i>
                  <div className={styles.texto}>
                    <Link href={`/painel/clientes/${c.id}`} className={styles.nomeCliente}>
                      {c.nome}
                    </Link>
                    <small className={styles[`textoUrgencia_${nivel}`]}>
                      {URGENCIA[nivel]} · chegou {tempoRelativo(c.criado_em)}
                    </small>
                  </div>
                  <AtribuirCliente clienteId={c.id} clienteNome={c.nome} equipa={equipa ?? []} />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {todas.length === 0 && semDono.length > 0 ? null : todas.length === 0 ? (
        <section className={styles.vazio}>
          <h2>Sem tarefas atrasadas nem para hoje</h2>
          <p>Quando uma tarefa tua passar do prazo ou acabar hoje, aparece aqui e no sino do menu.</p>
          <Link href="/painel/tarefas" className="botao botao-secundario">
            Ver todas as tarefas
          </Link>
        </section>
      ) : (
        <>
          <ListaNotificacoes grupos={grupos} />
          {/* há mais do que as que aparecem: as seguintes estão na página Tarefas */}
          {total > todas.length && (
            <p className={styles.mais}>
              Aparecem as {todas.length} mais antigas de {total}. Conclui estas ou vê o resto em{" "}
              {/* abre as atrasadas (para o admin, já só as dele) */}
              <Link href={`/painel/tarefas?vista=atrasadas${eAdmin ? `&pessoa=${perfil.id}` : ""}`}>Tarefas</Link>.
            </p>
          )}
        </>
      )}
    </div>
  );
}
