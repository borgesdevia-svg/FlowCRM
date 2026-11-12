"use client";
// Formulário para criar uma tarefa na ficha do cliente.

import { useActionState } from "react";
import { adicionarTarefa } from "@/lib/acoes/tarefas";
import styles from "./Tarefas.module.css";

export default function FormTarefa({ clienteId }) {
  const [estado, accao, pendente] = useActionState(adicionarTarefa, {});

  return (
    <form action={accao} key={estado.versao ?? 0} className={styles.formulario}>
      <input type="hidden" name="cliente_id" value={clienteId} />

      <div className={styles.linhaForm}>
        <div className="campo" style={{ flex: 1 }}>
          <label htmlFor="titulo">Tarefa</label>
          <input id="titulo" name="titulo" placeholder="Ex.: Enviar proposta" defaultValue={estado.titulo ?? ""} />
        </div>
        <div className="campo">
          <label htmlFor="data_limite">Até</label>
          {/* type="date" mostra um calendário e envia a data como AAAA-MM-DD */}
          <input id="data_limite" name="data_limite" type="date" defaultValue={estado.dataLimite ?? ""} />
        </div>
      </div>

      {estado.erro && <p className="erro-campo">{estado.erro}</p>}

      <button type="submit" className="botao botao-secundario" disabled={pendente} style={{ alignSelf: "flex-start" }}>
        {pendente ? "A adicionar..." : "Adicionar tarefa"}
      </button>
    </form>
  );
}
