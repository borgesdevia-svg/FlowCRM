"use client";
// Seleção de tarefas, partilhada pelo Início, pela página Tarefas e pela ficha do cliente.
// A caixa de cada tarefa só SELECIONA; as ações ficam numa barra que aparece
// quando há tarefas selecionadas:
//   - "Marcar como feita"  (se alguma das selecionadas estiver por fazer)
//   - "Pôr por fazer"      (se alguma das selecionadas já estiver feita)
//   - "Adiar"              (abre duas escolhas: para amanhã ou daqui a uma semana)
//   - "Apagar"             (pede confirmação no próprio botão)

import { useState, useTransition } from "react";
import { adiarTarefas, apagarTarefas, concluirTarefas, reabrirTarefas } from "@/lib/acoes/tarefas";
import styles from "./Selecao.module.css";

// Guarda as tarefas selecionadas. "tarefas" = as que estão no ecrã agora:
// as que desaparecem (concluídas/apagadas) deixam de contar sozinhas.
export function useSelecao(tarefas) {
  const [selecionadas, setSelecionadas] = useState(() => new Set());
  const escolhidas = tarefas.filter((t) => selecionadas.has(t.id));

  function alternar(id) {
    setSelecionadas((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  return {
    escolhidas,
    marcada: (id) => selecionadas.has(id),
    alternar,
    todas: escolhidas.length === tarefas.length && tarefas.length > 0,
    selecionarTodas: () => setSelecionadas(new Set(tarefas.map((t) => t.id))),
    limpar: () => setSelecionadas(new Set()),
  };
}

// Caixa de seleção com as cores do site
export function Caixa({ id, marcada, onChange, rotulo }) {
  return (
    <input
      id={id}
      type="checkbox"
      className={styles.caixa}
      checked={marcada}
      onChange={onChange}
      aria-label={rotulo}
    />
  );
}

export function BarraSelecao({ selecao, className = "" }) {
  // o que está aberto na barra: null, "apagar" (a pedir confirmação) ou "adiar" (a mostrar as escolhas)
  const [aberto, setAberto] = useState(null);
  const [acaoAtual, setAcaoAtual] = useState(null);
  const [pendente, iniciar] = useTransition();

  const { escolhidas, limpar } = selecao;
  const n = escolhidas.length;
  if (n === 0) return null;

  const porFazer = escolhidas.filter((t) => !t.concluida).length;
  const feitas = n - porFazer;
  const ids = escolhidas.map((t) => t.id);

  function cancelar() {
    setAberto(null);
    limpar();
  }

  function executar(nome, acao) {
    setAcaoAtual(nome);
    iniciar(async () => {
      await acao(ids);
      setAberto(null);
      limpar();
    });
  }

  const ocupado = (nome) => pendente && acaoAtual === nome;

  return (
    <div className={`${styles.barra} ${className}`} role="region" aria-label="Ações para as tarefas selecionadas">
      <span className={styles.contagem}>
        {n} {n === 1 ? "selecionada" : "selecionadas"}
      </span>
      <div className={styles.acoes}>
        <button type="button" className={styles.botaoTexto} onClick={cancelar} disabled={pendente}>
          Cancelar
        </button>

        {aberto === "apagar" ? (
          <button
            type="button"
            className={styles.apagarConfirmar}
            onClick={() => executar("apagar", apagarTarefas)}
            disabled={pendente}
          >
            {ocupado("apagar") ? "A apagar…" : n === 1 ? "Sim, apagar" : `Sim, apagar ${n}`}
          </button>
        ) : (
          <button type="button" className={styles.apagar} onClick={() => setAberto("apagar")} disabled={pendente}>
            Apagar
          </button>
        )}

        {/* adiar só faz sentido para as que estão por fazer */}
        {porFazer > 0 &&
          (aberto === "adiar" ? (
            <>
              <button
                type="button"
                className={`botao botao-secundario ${styles.botao}`}
                onClick={() => executar("amanha", (lista) => adiarTarefas(lista, 1))}
                disabled={pendente}
              >
                {ocupado("amanha") ? "A adiar…" : "Para amanhã"}
              </button>
              <button
                type="button"
                className={`botao botao-secundario ${styles.botao}`}
                onClick={() => executar("semana", (lista) => adiarTarefas(lista, 7))}
                disabled={pendente}
              >
                {ocupado("semana") ? "A adiar…" : "Daqui a uma semana"}
              </button>
            </>
          ) : (
            <button
              type="button"
              className={`botao botao-secundario ${styles.botao}`}
              onClick={() => setAberto("adiar")}
              disabled={pendente}
            >
              Adiar
            </button>
          ))}

        {feitas > 0 && (
          <button
            type="button"
            className={`botao botao-secundario ${styles.botao}`}
            onClick={() => executar("reabrir", reabrirTarefas)}
            disabled={pendente}
          >
            {ocupado("reabrir") ? "A atualizar…" : "Pôr por fazer"}
          </button>
        )}

        {porFazer > 0 && (
          <button
            type="button"
            className={`botao ${styles.botao}`}
            onClick={() => executar("concluir", concluirTarefas)}
            disabled={pendente}
          >
            {ocupado("concluir") ? "A concluir…" : porFazer === 1 ? "Marcar como feita" : "Marcar como feitas"}
          </button>
        )}
      </div>
    </div>
  );
}
