"use client";
// Formulário para criar uma tarefa. Usado em dois sítios:
//  - na ficha do cliente: recebe clienteId (o cliente já é conhecido)
//  - na página Tarefas: recebe "clientes" (os mais recentes, sugeridos na pesquisa) e,
//    se for o admin, a lista "membros" para escolher o responsável

import { useActionState } from "react";
import { adicionarTarefa } from "@/lib/acoes/tarefas";
import EscolherCliente from "./EscolherCliente";
import styles from "./Tarefas.module.css";

export default function FormTarefa({ clienteId = null, clientes = null, membros = null, perfilId = "" }) {
  const [estado, accao, pendente] = useActionState(adicionarTarefa, {});

  return (
    <form action={accao} key={estado.versao ?? 0} className={styles.formulario}>
      {clienteId && <input type="hidden" name="cliente_id" value={clienteId} />}

      <div className={styles.linhaForm}>
        <div className="campo" style={{ flex: 1, minWidth: 200 }}>
          <label htmlFor="titulo">Tarefa</label>
          <input id="titulo" name="titulo" placeholder="Ex.: Enviar proposta" defaultValue={estado.titulo ?? ""} />
        </div>
        <div className="campo">
          <label htmlFor="data_limite">Até</label>
          {/* type="date" mostra um calendário e envia a data como AAAA-MM-DD */}
          <input id="data_limite" name="data_limite" type="date" defaultValue={estado.dataLimite ?? ""} />
        </div>
      </div>

      {/* cliente e responsável: só aparecem na página Tarefas */}
      {(clientes || membros) && (
        <div className={styles.linhaForm}>
          {clientes && (
            <div className="campo" style={{ flex: 1, minWidth: 200 }}>
              <label htmlFor="cliente_id">Cliente</label>
              <EscolherCliente sugestoes={clientes} />
            </div>
          )}
          {membros && (
            <div className="campo" style={{ flex: 1, minWidth: 180 }}>
              <label htmlFor="responsavel_id">Responsável</label>
              <select id="responsavel_id" name="responsavel_id" defaultValue={perfilId}>
                {membros.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {estado.erro && <p className="erro-campo">{estado.erro}</p>}

      <button type="submit" className="botao botao-secundario" disabled={pendente} style={{ alignSelf: "flex-start" }}>
        {pendente ? "A adicionar..." : "Adicionar tarefa"}
      </button>
    </form>
  );
}
