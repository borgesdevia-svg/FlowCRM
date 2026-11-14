"use client";
// Formulário de login (componente de cliente, como o de registo).

import { useActionState } from "react";
import { entrar } from "@/lib/acoes/autenticacao";
import CampoPassword from "@/components/CampoPassword";
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
        {/* password escondida com o botão "Mostrar" */}
        <CampoPassword id="password" name="password" autoComplete="current-password" />
      </div>

      <button type="submit" className="botao botao-largo" disabled={pendente}>
        {/* enquanto o servidor confirma a password e prepara o painel, a roda gira
            (o botão continua com o mesmo tamanho, para nada saltar) */}
        {pendente ? (
          <>
            <span className="roda" aria-hidden="true"></span> A entrar
          </>
        ) : (
          "Entrar"
        )}
      </button>
    </form>
  );
}
