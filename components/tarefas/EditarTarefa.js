"use client";
// O título de uma tarefa, que abre um painel para a EDITAR (título, data e, para o admin,
// o responsável). Usado em todas as listas de tarefas: página Tarefas, Início,
// ficha do cliente e calendário.
//
// O painel é um <dialog> do próprio browser: showModal() abre-o por cima da página,
// escurece o fundo, prende o Tab lá dentro e a tecla Esc fecha-o (sem bibliotecas).
//
// Props:
//  - tarefa: { id, titulo, data_limite, responsavel_id }
//  - membros: a equipa (só o admin a recebe; null para o comercial)
//  - podeEditar: false = mostra só o texto (ex.: tarefa de outra pessoa, para o comercial)

import { useActionState, useEffect, useRef, useState } from "react";
import { editarTarefa } from "@/lib/acoes/tarefas";
import styles from "./EditarTarefa.module.css";

export default function EditarTarefa({ tarefa, membros = null, podeEditar = true, className = "" }) {
  const dialogo = useRef(null);
  const [estado, accao, pendente] = useActionState(editarTarefa, {});
  // muda sempre que o painel fecha: o formulário volta a abrir com os dados guardados
  // (e não com o que ficou escrito de uma vez em que se carregou em Cancelar)
  const [aberturas, setAberturas] = useState(0);

  // guardou com sucesso: fecha o painel
  useEffect(() => {
    if (estado.guardado) dialogo.current?.close();
  }, [estado.guardado]);

  if (!podeEditar) return <span className={className}>{tarefa.titulo}</span>;

  const id = (campo) => `${campo}-${tarefa.id}`;
  // a key junta os dados da tarefa: quando a página traz a versão nova, o formulário recomeça
  const chave = `${aberturas}|${tarefa.titulo}|${tarefa.data_limite}|${tarefa.responsavel_id}`;

  return (
    <>
      <button
        type="button"
        className={`${styles.abrir} ${className}`}
        onClick={() => dialogo.current?.showModal()}
        title="Editar tarefa"
      >
        {tarefa.titulo}
      </button>

      <dialog
        ref={dialogo}
        className={styles.dialogo}
        aria-labelledby={id("titulo-painel")}
        onClose={() => setAberturas((n) => n + 1)}
        // clicar no fundo escuro (fora do formulário) também fecha
        onClick={(e) => e.target === dialogo.current && dialogo.current.close()}
      >
        <form action={accao} key={chave} className={styles.formulario}>
          <h2 id={id("titulo-painel")}>Editar tarefa</h2>
          <input type="hidden" name="id" value={tarefa.id} />

          <div className="campo">
            <label htmlFor={id("titulo")}>Tarefa</label>
            <input id={id("titulo")} name="titulo" defaultValue={tarefa.titulo} maxLength={200} required />
          </div>

          <div className={styles.linha}>
            <div className="campo">
              <label htmlFor={id("data")}>Até</label>
              <input id={id("data")} name="data_limite" type="date" defaultValue={tarefa.data_limite ?? ""} />
            </div>

            {/* só o admin muda o responsável */}
            {membros && (
              <div className="campo">
                <label htmlFor={id("responsavel")}>Responsável</label>
                <select id={id("responsavel")} name="responsavel_id" defaultValue={tarefa.responsavel_id ?? ""}>
                  {!tarefa.responsavel_id && <option value="">Sem responsável</option>}
                  {membros.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {estado.erro && <p className="erro-campo">{estado.erro}</p>}

          <div className={styles.botoes}>
            <button type="button" className="botao botao-secundario" onClick={() => dialogo.current?.close()}>
              Cancelar
            </button>
            <button type="submit" className="botao" disabled={pendente}>
              {pendente ? "A guardar..." : "Guardar"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
