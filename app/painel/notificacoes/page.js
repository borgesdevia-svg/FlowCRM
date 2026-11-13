import Link from "next/link";
import { obterSessao } from "@/lib/sessao";
import { hojeEmPortugal, formatarDiaCurto } from "@/lib/datas";
import { alternarTarefa } from "@/lib/acoes/tarefas";
import base from "@/components/tarefas/Tarefas.module.css";
import styles from "./notificacoes.module.css";

// Rota /painel/notificacoes — tudo o que o sino avisa, numa página inteira:
// as MINHAS tarefas por fazer que estão em atraso ou que acabam hoje.
// O sino do menu mostra só as primeiras; aqui aparecem todas, e cada uma
// pode ser concluída logo (o círculo à esquerda), sem abrir o cliente.
export const metadata = { title: "Notificações · FlowCRM" };

// dias entre duas datas AAAA-MM-DD ("2026-11-10" e "2026-11-13" -> 3)
function diasEntre(de, ate) {
  return Math.round((new Date(`${ate}T00:00:00Z`) - new Date(`${de}T00:00:00Z`)) / 86400000);
}

export default async function PaginaNotificacoes() {
  const { supabase, perfil } = await obterSessao();
  const hoje = hojeEmPortugal();

  const { data } = await supabase
    .from("tarefas")
    .select("id, titulo, data_limite, cliente_id, concluida, clientes(nome)")
    .eq("responsavel_id", perfil.id)
    .eq("concluida", false)
    .lte("data_limite", hoje)
    .order("data_limite", { ascending: true });
  const todas = data ?? [];

  const grupos = [
    { chave: "atrasadas", titulo: "Em atraso", tarefas: todas.filter((t) => t.data_limite < hoje) },
    { chave: "hoje", titulo: "Acabam hoje", tarefas: todas.filter((t) => t.data_limite === hoje) },
  ].filter((g) => g.tarefas.length > 0);

  // frase do topo
  const nAtrasadas = grupos.find((g) => g.chave === "atrasadas")?.tarefas.length ?? 0;
  const nHoje = todas.length - nAtrasadas;
  const partes = [];
  if (nAtrasadas) partes.push(`${nAtrasadas} ${nAtrasadas === 1 ? "tarefa em atraso" : "tarefas em atraso"}`);
  if (nHoje) partes.push(`${nHoje} para hoje`);

  return (
    <div className={`entrar ${styles.pagina}`}>
      <header className={styles.cabecalho}>
        <h1>Notificações</h1>
        <p className={styles.resumo}>
          {todas.length === 0 ? "Está tudo em dia." : `Tens ${partes.join(" e ")}.`}
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
        grupos.map((g) => (
          <section key={g.chave} className={styles.grupo} aria-labelledby={`grupo-${g.chave}`}>
            <h2 id={`grupo-${g.chave}`} className={styles.tituloGrupo}>
              <i className={styles[g.chave]}></i>
              {g.titulo} <span>{g.tarefas.length}</span>
            </h2>

            <ul className={styles.lista}>
              {g.tarefas.map((t) => {
                const dias = diasEntre(t.data_limite, hoje);
                return (
                  <li key={t.id} className={styles.linha}>
                    {/* concluir logo daqui: um formulário com um só botão */}
                    <form action={alternarTarefa}>
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="cliente_id" value={t.cliente_id} />
                      <input type="hidden" name="concluida" value="false" />
                      <button type="submit" className={base.visto} aria-label={`Marcar "${t.titulo}" como feita`}></button>
                    </form>

                    <div className={styles.texto}>
                      <strong>{t.titulo}</strong>
                      <Link href={`/painel/clientes/${t.cliente_id}`} className={styles.cliente}>
                        {t.clientes?.nome ?? "Cliente"}
                      </Link>
                    </div>

                    <span className={g.chave === "atrasadas" ? styles.prazoAtrasado : styles.prazoHoje}>
                      {g.chave === "hoje"
                        ? "Hoje"
                        : dias === 1
                          ? "Desde ontem"
                          : `Há ${dias} dias · ${formatarDiaCurto(t.data_limite)}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
