"use client";
// Lista de tarefas agrupada por dias ("Hoje", "Amanhã", "Sexta, 21 de novembro"...),
// ao estilo dos Lembretes do iPhone. Usada no Início, na página Tarefas e no Calendário.
//
// Cada linha: círculo · título (clicar abre o painel de editar) · cliente e responsável
// por baixo · prazo à direita, com a cor da urgência.
//  - Clicar no CÍRCULO só SELECIONA a tarefa (decisão do aluno, 2026-11-28: não pode ficar feita
//    sem querer). Com alguma selecionada aparece a barra de ações (Selecao.js) com o botão
//    "Marcar como feita", e também Adiar, Pôr por fazer e Apagar.
//  - As tarefas feitas mostram o círculo cheio, com o visto.
//
// Props:
//  - membros: a equipa (só o admin; permite mudar o responsável ao editar)
//  - perfilId: quem está a ver (o comercial só edita as suas tarefas)
//  - mostrarResponsavel: mostra o nome do responsável por baixo do título
//  - agrupar: false = sem títulos de dia (o Calendário já mostra o dia escolhido)
// (o nome do ficheiro ficou "TabelaTarefas" de quando isto era uma tabela)

import Link from "next/link";
import { prazoRelativo } from "@/lib/datas";
import { BarraSelecao, useSelecao } from "./Selecao";
import EditarTarefa from "./EditarTarefa";
import styles from "./TabelaTarefas.module.css";

// dia (AAAA-MM-DD, em Portugal) em que uma tarefa feita foi concluída
function diaEmPortugal(dataHora) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date(dataHora));
}

// diferença em dias entre duas datas AAAA-MM-DD
function diasEntre(de, ate) {
  return Math.round((new Date(`${ate}T00:00:00Z`) - new Date(`${de}T00:00:00Z`)) / 86400000);
}

// título de cada grupo: "Hoje", "Amanhã", "Ontem" ou "Sexta, 21 de novembro"
function tituloDoDia(dia, hoje) {
  if (!dia) return "Sem data";
  const d = diasEntre(hoje, dia);
  if (d === 0) return "Hoje";
  if (d === 1) return "Amanhã";
  if (d === -1) return "Ontem";
  const texto = new Intl.DateTimeFormat("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${dia}T00:00:00Z`));
  // "sexta-feira, 21 de novembro" -> "Sexta, 21 de novembro"
  const curto = texto.replace("-feira", "");
  return curto[0].toUpperCase() + curto.slice(1);
}

// junta as tarefas por dia, mantendo a ordem em que chegam do servidor
function agruparPorDia(tarefas, hoje) {
  const grupos = [];
  for (const t of tarefas) {
    const dia = t.concluida && t.concluida_em ? diaEmPortugal(t.concluida_em) : t.data_limite;
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.dia === dia) ultimo.tarefas.push(t);
    else grupos.push({ dia, titulo: tituloDoDia(dia, hoje), tarefas: [t] });
  }
  return grupos;
}

// texto e cor do prazo, à direita de cada linha
function prazo(t, hoje) {
  if (t.concluida) return { texto: "Feita", classe: styles.prazoFeito };
  if (!t.data_limite) return { texto: "Sem data", classe: styles.prazoNormal };
  const relativo = prazoRelativo(t.data_limite, hoje);
  if (t.data_limite < hoje) return { texto: relativo, classe: styles.prazoAtrasado };
  if (t.data_limite === hoje) return { texto: "Hoje", classe: styles.prazoHoje };
  return { texto: relativo[0].toUpperCase() + relativo.slice(1), classe: styles.prazoNormal };
}

export default function TabelaTarefas({ tarefas, hoje, mensagemVazia, membros = null, perfilId = "", mostrarResponsavel = false, agrupar = true }) {
  const selecao = useSelecao(tarefas);

  if (tarefas.length === 0) return <p className={styles.vazio}>{mensagemVazia}</p>;

  const temSelecionadas = selecao.escolhidas.length > 0;
  const grupos = agrupar ? agruparPorDia(tarefas, hoje) : [{ dia: null, titulo: null, tarefas }];

  return (
    <>
      {/* com tarefas selecionadas: Selecionar todas + a barra de ações (Marcar como feita, …) */}
      {temSelecionadas && (
        <div className={styles.topo}>
          <button
            type="button"
            className={styles.botaoTexto}
            onClick={() => (selecao.todas ? selecao.limpar() : selecao.selecionarTodas())}
          >
            {selecao.todas ? "Tirar seleção" : "Selecionar todas"}
          </button>
        </div>
      )}
      <BarraSelecao selecao={selecao} className={styles.barra} />

      {grupos.map((g) => (
        <section key={`${g.dia}-${g.tarefas[0].id}`} className={styles.grupo} aria-label={g.titulo ?? undefined}>
          {g.titulo && (
          <h3 className={styles.tituloGrupo}>
            <span className={g.dia && g.dia < hoje && !g.tarefas[0].concluida ? styles.diaAtrasado : undefined}>
              {g.titulo}
            </span>
            <small>{g.tarefas.length}</small>
          </h3>
          )}

          <ul className={styles.lista}>
            {g.tarefas.map((t) => {
              const estaFeita = t.concluida;
              const p = prazo(t, hoje);
              const marcada = selecao.marcada(t.id);
              return (
                <li
                  key={t.id}
                  className={`${styles.linha} ${marcada ? styles.linhaMarcada : ""} ${estaFeita ? styles.linhaFeita : ""}`}
                >
                  {/* o círculo só seleciona; "Marcar como feita" está na barra que aparece */}
                  <button
                    type="button"
                    className={[styles.circulo, estaFeita && styles.circuloFeito, marcada && styles.circuloMarcado]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => selecao.alternar(t.id)}
                    aria-pressed={marcada}
                    aria-label={`${marcada ? "Tirar da seleção" : "Selecionar"}: ${t.titulo}${estaFeita ? " (feita)" : ""}`}
                    title={marcada ? "Tirar da seleção" : "Selecionar"}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <polyline points="6 12.5 10 16.5 18 8.5" />
                    </svg>
                  </button>

                  <div className={styles.texto}>
                    <EditarTarefa
                      tarefa={t}
                      membros={membros}
                      podeEditar={membros !== null || t.responsavel_id === perfilId}
                      className={styles.titulo}
                    />
                    <span className={styles.detalhes}>
                      <Link href={`/painel/clientes/${t.cliente_id}`} className={styles.cliente}>
                        {t.clientes?.nome ?? "Lead"}
                      </Link>
                      {mostrarResponsavel && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span>{t.perfis?.nome ?? "Sem responsável"}</span>
                        </>
                      )}
                    </span>
                  </div>

                  <span className={`${styles.prazo} ${p.classe}`}>{p.texto}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

    </>
  );
}
