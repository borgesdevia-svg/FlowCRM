"use client";
// Formulário para registar uma nota/interação na ficha do cliente.

import { useActionState } from "react";
import { adicionarInteracao } from "@/lib/acoes/interacoes";
import styles from "./Historico.module.css";

const TIPOS = [
  { chave: "nota", texto: "Nota" },
  { chave: "chamada", texto: "Chamada" },
  { chave: "email", texto: "Email" },
  { chave: "reuniao", texto: "Reunião" },
];

export default function FormNota({ clienteId }) {
  const [estado, accao, pendente] = useActionState(adicionarInteracao, {});

  return (
    // key: muda sempre que uma nota é guardada (estado.versao vem da Server Action),
    // e quando a key muda o React cria o formulário de novo, vazio
    <form action={accao} key={estado.versao ?? 0} className={styles.formulario}>
      <input type="hidden" name="cliente_id" value={clienteId} />

      {/* tipo de registo: botões de opção, como no estado do cliente */}
      <div className={styles.tipos} role="radiogroup" aria-label="Tipo de registo">
        {TIPOS.map((t, i) => (
          <label key={t.chave} className={styles.tipo}>
            <input type="radio" name="tipo" value={t.chave} defaultChecked={i === 0} />
            <span>{t.texto}</span>
          </label>
        ))}
      </div>

      <div className="campo">
        <label htmlFor="nota" className={styles.escondido}>
          O que aconteceu
        </label>
        <textarea
          id="nota"
          name="nota"
          rows={3}
          placeholder="Ex.: Liguei e pediu proposta para a próxima semana."
          defaultValue={estado.nota ?? ""}
        />
      </div>

      {estado.erro && <p className="erro-campo">{estado.erro}</p>}

      <button type="submit" className="botao" disabled={pendente} style={{ alignSelf: "flex-start" }}>
        {pendente ? "A guardar..." : "Guardar registo"}
      </button>
    </form>
  );
}
