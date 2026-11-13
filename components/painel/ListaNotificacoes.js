"use client";
// Lista da página Notificações, com seleção:
// cada linha tem uma caixa para selecionar; com uma ou mais selecionadas aparece
// o botão "Marcar como feitas", que conclui todas de uma vez (Server Action
// concluirTarefas). É de cliente porque guarda quais estão selecionadas.
// Recebe os grupos já preparados pela página: [{ chave, titulo, tarefas: [{ id, titulo, clienteId, cliente, prazo }] }]

import { useState, useTransition } from "react";
import Link from "next/link";
import { concluirTarefas } from "@/lib/acoes/tarefas";
import styles from "@/app/painel/notificacoes/notificacoes.module.css";

export default function ListaNotificacoes({ grupos }) {
  const [selecionadas, setSelecionadas] = useState(() => new Set());
  const [aConcluir, iniciar] = useTransition();

  const todosIds = grupos.flatMap((g) => g.tarefas.map((t) => t.id));
  // só contam as que ainda existem na lista (depois de concluir, desaparecem)
  const escolhidas = todosIds.filter((id) => selecionadas.has(id));
  const tudo = escolhidas.length === todosIds.length && todosIds.length > 0;

  function alternar(id) {
    setSelecionadas((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  // selecionar/limpar um grupo inteiro, ou a lista toda
  function alternarVarios(ids, ligar) {
    setSelecionadas((atual) => {
      const novo = new Set(atual);
      for (const id of ids) {
        if (ligar) novo.add(id);
        else novo.delete(id);
      }
      return novo;
    });
  }

  function concluir() {
    iniciar(async () => {
      await concluirTarefas(escolhidas);
      setSelecionadas(new Set());
    });
  }

  return (
    <>
      {/* barra de ações: fica presa no topo enquanto se desce a lista */}
      <div className={styles.barra}>
        <label className={styles.selecionarTudo}>
          <input
            type="checkbox"
            className={styles.caixa}
            checked={tudo}
            onChange={() => alternarVarios(todosIds, !tudo)}
          />
          {escolhidas.length > 0
            ? `${escolhidas.length} ${escolhidas.length === 1 ? "selecionada" : "selecionadas"}`
            : "Selecionar todas"}
        </label>

        {escolhidas.length > 0 && (
          <div className={styles.acoes}>
            <button
              type="button"
              className={styles.limpar}
              onClick={() => setSelecionadas(new Set())}
              disabled={aConcluir}
            >
              Limpar seleção
            </button>
            <button type="button" className="botao" onClick={concluir} disabled={aConcluir}>
              {aConcluir ? "A concluir…" : "Marcar como feitas"}
            </button>
          </div>
        )}
      </div>

      {grupos.map((g) => {
        const ids = g.tarefas.map((t) => t.id);
        const grupoTodo = ids.every((id) => selecionadas.has(id));
        return (
          <section key={g.chave} className={styles.grupo} aria-labelledby={`grupo-${g.chave}`}>
            <div className={styles.topoGrupo}>
              <h2 id={`grupo-${g.chave}`} className={styles.tituloGrupo}>
                <i className={styles[g.chave]}></i>
                {g.titulo} <span>{g.tarefas.length}</span>
              </h2>
              <button type="button" className={styles.limpar} onClick={() => alternarVarios(ids, !grupoTodo)}>
                {grupoTodo ? "Tirar seleção" : "Selecionar estas"}
              </button>
            </div>

            <ul className={styles.lista}>
              {g.tarefas.map((t) => {
                const marcada = selecionadas.has(t.id);
                return (
                  <li key={t.id} className={marcada ? `${styles.linha} ${styles.linhaMarcada}` : styles.linha}>
                    <input
                      id={`notificacao-${t.id}`}
                      type="checkbox"
                      className={styles.caixa}
                      checked={marcada}
                      onChange={() => alternar(t.id)}
                    />

                    <div className={styles.texto}>
                      {/* o título é a etiqueta da caixa: clicar nele também seleciona */}
                      <label htmlFor={`notificacao-${t.id}`} className={styles.tituloTarefa}>
                        {t.titulo}
                      </label>
                      <Link href={`/painel/clientes/${t.clienteId}`} className={styles.cliente}>
                        {t.cliente}
                      </Link>
                    </div>

                    <span className={g.chave === "atrasadas" ? styles.prazoAtrasado : styles.prazoHoje}>{t.prazo}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </>
  );
}
