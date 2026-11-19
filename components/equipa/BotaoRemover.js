"use client";
// Botão "Remover" da tabela da equipa. Abre um aviso na própria página (um <dialog>,
// em vez do window.confirm do browser) e o botão "Remover" só fica ativo ao fim de
// ESPERA segundos, para dar tempo de ler e não se apagar ninguém por engano.

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { removerMembro } from "@/lib/acoes/equipa";
import Icone from "@/components/Icone";
import styles from "./BotaoRemover.module.css";

const ESPERA = 5; // segundos até se poder carregar em "Remover"

// botão de confirmar: conta os segundos e mostra "A remover…" enquanto o servidor trabalha
function BotaoConfirmar({ falta }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={styles.perigo} disabled={falta > 0 || pending} aria-busy={pending}>
      {pending ? "A remover…" : falta > 0 ? `Remover (${falta})` : "Remover da equipa"}
    </button>
  );
}

export default function BotaoRemover({ id, nome, className }) {
  const dialogo = useRef(null);
  const [aberto, setAberto] = useState(false);
  const [falta, setFalta] = useState(ESPERA);

  // contagem decrescente enquanto o aviso está aberto (recomeça sempre que se volta a abrir)
  useEffect(() => {
    if (!aberto) return;
    const relogio = setInterval(() => setFalta((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(relogio);
  }, [aberto]);

  function abrir() {
    setFalta(ESPERA);
    dialogo.current?.showModal();
    setAberto(true);
  }

  function fechar() {
    dialogo.current?.close();
  }

  return (
    <>
      {/* só o ícone (a tabela é estreita); o texto fica para leitores de ecrã e na dica */}
      <button type="button" className={className} onClick={abrir} title={`Remover ${nome}`} aria-label={`Remover ${nome}`}>
        <Icone nome="utilizadorSai" tamanho={16} />
      </button>

      <dialog
        ref={dialogo}
        className={styles.dialogo}
        aria-labelledby={`remover-titulo-${id}`}
        onClose={() => setAberto(false)}
        // clicar no fundo escuro (fora da caixa) fecha o aviso
        onClick={(e) => e.target === dialogo.current && fechar()}
      >
        <form action={removerMembro} className={styles.caixa}>
          <input type="hidden" name="id" value={id} />

          <span className={styles.icone} aria-hidden="true">
            <Icone nome="utilizadorSai" tamanho={22} />
          </span>
          <h2 id={`remover-titulo-${id}`}>Remover {nome} da equipa?</h2>
          <ul className={styles.consequencias}>
            <li>A conta é apagada e {nome.split(" ")[0]} deixa de conseguir entrar no FlowCRM.</li>
            <li>Os leads e as tarefas dessa pessoa ficam sem responsável (podes atribuí-los a outra pessoa).</li>
            <li>Isto não se pode desfazer.</li>
          </ul>

          <div className={styles.botoes}>
            <button type="button" className="botao botao-secundario" onClick={fechar} autoFocus>
              Cancelar
            </button>
            {aberto && <BotaoConfirmar falta={falta} />}
          </div>
        </form>
      </dialog>
    </>
  );
}
