"use client";
// Lista de tarefas agrupada por dias ("Hoje", "Amanhã", "Sexta, 21 de novembro"...),
// ao estilo dos Lembretes do iPhone. Usada no Início, na página Tarefas e no Calendário.
//
// Cada linha: círculo · título (clicar abre o painel de editar) · cliente e responsável
// por baixo · prazo à direita, com a cor da urgência.
//  - Clicar no CÍRCULO conclui logo a tarefa (ou volta a pô-la por fazer, se já estava feita).
//    Aparece um aviso em baixo com "Desfazer" durante alguns segundos.
//  - O botão "Selecionar" troca os círculos por caixas, para escolher várias tarefas;
//    aparece então a barra de ações (Selecao.js): Marcar como feita, Adiar, Apagar...
//
// Props:
//  - membros: a equipa (só o admin; permite mudar o responsável ao editar)
//  - perfilId: quem está a ver (o comercial só edita as suas tarefas)
//  - mostrarResponsavel: mostra o nome do responsável por baixo do título
//  - agrupar: false = sem títulos de dia (o Calendário já mostra o dia escolhido)
// (o nome do ficheiro ficou "TabelaTarefas" de quando isto era uma tabela)

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { prazoRelativo } from "@/lib/datas";
import { concluirTarefas, reabrirTarefas } from "@/lib/acoes/tarefas";
import { BarraSelecao, Caixa, useSelecao } from "./Selecao";
import EditarTarefa from "./EditarTarefa";
import styles from "./TabelaTarefas.module.css";

const SEGUNDOS_DESFAZER = 6;

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
  const [aSelecionar, setASelecionar] = useState(false);
  // tarefas acabadas de mudar neste ecrã: mostram logo o círculo cheio/vazio,
  // antes de o servidor responder ({ id: true = feita / false = por fazer })
  const [mudadas, setMudadas] = useState({});
  const [aviso, setAviso] = useState(null); // { ids, titulo, feita }
  const [, iniciar] = useTransition();
  const temporizador = useRef(null);

  // o aviso "Desfazer" desaparece sozinho
  useEffect(() => {
    if (!aviso) return;
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setAviso(null), SEGUNDOS_DESFAZER * 1000);
    return () => clearTimeout(temporizador.current);
  }, [aviso]);

  if (tarefas.length === 0) return <p className={styles.vazio}>{mensagemVazia}</p>;

  const feita = (t) => mudadas[t.id] ?? t.concluida;

  function alternar(t) {
    const passaAFeita = !feita(t);
    setMudadas((m) => ({ ...m, [t.id]: passaAFeita }));
    setAviso({ ids: [t.id], titulo: t.titulo, feita: passaAFeita });
    iniciar(async () => {
      await (passaAFeita ? concluirTarefas : reabrirTarefas)([t.id]);
    });
  }

  function desfazer() {
    if (!aviso) return;
    const { ids, feita: estavaAFicarFeita } = aviso;
    setMudadas((m) => Object.fromEntries([...Object.entries(m), ...ids.map((id) => [id, !estavaAFicarFeita])]));
    setAviso(null);
    iniciar(async () => {
      await (estavaAFicarFeita ? reabrirTarefas : concluirTarefas)(ids);
    });
  }

  function sairDaSelecao() {
    selecao.limpar();
    setASelecionar(false);
  }

  const grupos = agrupar ? agruparPorDia(tarefas, hoje) : [{ dia: null, titulo: null, tarefas }];

  return (
    <>
      {/* topo da lista: Selecionar (ou, a selecionar, Selecionar todas / Concluído) */}
      <div className={styles.topo}>
        {aSelecionar ? (
          <>
            <button
              type="button"
              className={styles.botaoTexto}
              onClick={() => (selecao.todas ? selecao.limpar() : selecao.selecionarTodas())}
            >
              {selecao.todas ? "Tirar seleção" : "Selecionar todas"}
            </button>
            <button type="button" className={styles.botaoTextoForte} onClick={sairDaSelecao}>
              Concluído
            </button>
          </>
        ) : (
          <button type="button" className={styles.botaoTexto} onClick={() => setASelecionar(true)}>
            Selecionar
          </button>
        )}
      </div>

      {aSelecionar && <BarraSelecao selecao={selecao} className={styles.barra} />}

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
              const estaFeita = feita(t);
              const p = estaFeita ? { texto: "Feita", classe: styles.prazoFeito } : prazo({ ...t, concluida: false }, hoje);
              const marcada = selecao.marcada(t.id);
              return (
                <li
                  key={t.id}
                  className={`${styles.linha} ${marcada ? styles.linhaMarcada : ""} ${estaFeita ? styles.linhaFeita : ""}`}
                >
                  {aSelecionar ? (
                    <span className={styles.zonaCirculo}>
                      <Caixa
                        id={`tarefa-${t.id}`}
                        marcada={marcada}
                        onChange={() => selecao.alternar(t.id)}
                        rotulo={`Selecionar: ${t.titulo}`}
                      />
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={estaFeita ? `${styles.circulo} ${styles.circuloFeito}` : styles.circulo}
                      onClick={() => alternar(t)}
                      aria-label={estaFeita ? `Pôr por fazer: ${t.titulo}` : `Concluir: ${t.titulo}`}
                      title={estaFeita ? "Pôr por fazer" : "Concluir"}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <polyline points="6 12.5 10 16.5 18 8.5" />
                      </svg>
                    </button>
                  )}

                  <div className={styles.texto}>
                    <EditarTarefa
                      tarefa={t}
                      membros={membros}
                      podeEditar={membros !== null || t.responsavel_id === perfilId}
                      className={styles.titulo}
                    />
                    <span className={styles.detalhes}>
                      <Link href={`/painel/clientes/${t.cliente_id}`} className={styles.cliente}>
                        {t.clientes?.nome ?? "Cliente"}
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

      {/* aviso com Desfazer, preso ao fundo do ecrã */}
      {aviso && (
        <div className={styles.aviso} role="status">
          <span className={styles.textoAviso}>
            {aviso.feita ? "Concluída" : "Por fazer"}: <strong>{aviso.titulo}</strong>
          </span>
          <button type="button" className={styles.desfazer} onClick={desfazer}>
            Desfazer
          </button>
        </div>
      )}
    </>
  );
}
