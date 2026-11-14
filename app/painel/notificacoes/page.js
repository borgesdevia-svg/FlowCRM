import Link from "next/link";
import { obterSessao } from "@/lib/sessao";
import { hojeEmPortugal, formatarDiaCurto } from "@/lib/datas";
import ListaNotificacoes from "@/components/painel/ListaNotificacoes";
import styles from "./notificacoes.module.css";

// Rota /painel/notificacoes — tudo o que o sino avisa, numa página inteira:
// as MINHAS tarefas por fazer que estão em atraso ou que acabam hoje.
// O sino do menu mostra só as primeiras; aqui aparecem todas. Seleciona-se
// uma ou várias e "Marcar como feitas" conclui-as de uma vez.
export const metadata = { title: "Notificações · FlowCRM" };

const MOSTRAR = 100;

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
  const [{ data }, { count: totalAtrasadas }, { count: totalHoje }] = await Promise.all([
    minhas("id, titulo, data_limite, cliente_id, clientes(nome)")
      .lte("data_limite", hoje)
      .order("data_limite", { ascending: true })
      .limit(MOSTRAR),
    minhas("id", { count: "exact", head: true }).lt("data_limite", hoje),
    minhas("id", { count: "exact", head: true }).eq("data_limite", hoje),
  ]);
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

  return (
    <div className={`entrar ${styles.pagina}`}>
      <header className={styles.cabecalho}>
        <h1>Notificações</h1>
        <p className={styles.resumo}>
          {total === 0 ? "Está tudo em dia." : `Tens ${partes.join(" e ")}.`}
        </p>
      </header>

      {todas.length === 0 ? (
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
