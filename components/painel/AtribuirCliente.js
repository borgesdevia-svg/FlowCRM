"use client";
// Lista "Entregar a…" dos avisos de cliente sem responsável (no sino e em Notificações).
// Ao escolher uma pessoa, o cliente fica logo atribuído (Server Action atribuirResponsavel)
// e o aviso desaparece. Se a automação estiver ligada, a pessoa recebe a tarefa "Contactar".

import { useState, useTransition } from "react";
import { atribuirResponsavel } from "@/lib/acoes/automacoes";
import styles from "./AtribuirCliente.module.css";

export default function AtribuirCliente({ clienteId, clienteNome, equipa }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState("");

  function escolher(evento) {
    const perfilId = evento.target.value;
    if (!perfilId) return;
    setErro("");
    iniciar(async () => {
      const resposta = await atribuirResponsavel(clienteId, perfilId);
      if (resposta?.erro) setErro(resposta.erro);
    });
  }

  return (
    <span className={styles.atribuir}>
      <select
        className={styles.lista}
        defaultValue=""
        onChange={escolher}
        disabled={pendente}
        aria-label={`Entregar ${clienteNome} a`}
      >
        <option value="" disabled>
          {pendente ? "A entregar…" : "Entregar a…"}
        </option>
        {equipa.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome}
          </option>
        ))}
      </select>
      {erro && (
        <small className={styles.erro} role="alert">
          {erro}
        </small>
      )}
    </span>
  );
}
