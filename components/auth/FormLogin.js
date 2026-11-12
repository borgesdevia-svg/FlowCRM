"use client";
// Formulário de login (componente de cliente, como o de registo).

import { useActionState } from "react";
import { entrar } from "@/lib/acoes/autenticacao";
import styles from "./Formulario.module.css";

export default function FormLogin() {
  const [estado, accao, pendente] = useActionState(entrar, {});
  const valores = estado.valores ?? {};

  return (
    <form action={accao} className={styles.formulario} noValidate>
      {estado.mensagem && <p className="alerta alerta-erro" role="alert">{estado.mensagem}</p>}

      <div className="campo">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" placeholder="ana@empresa.pt"
          defaultValue={valores.email} required />
      </div>

      <div className="campo">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>

      <button type="submit" className="botao botao-largo" disabled={pendente}>
        {pendente ? "A entrar..." : "Entrar"}
      </button>
    </form>
  );
}
