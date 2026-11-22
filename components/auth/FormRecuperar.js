"use client";
// Formulário "Esqueci-me da password": email + chave de recuperação + password nova.
// Se estiver tudo certo, o servidor muda a password e entra logo no painel.

import { useActionState } from "react";
import Link from "next/link";
import { recuperarPassword } from "@/lib/acoes/recuperacao";
import CampoPassword from "@/components/CampoPassword";
import styles from "./Formulario.module.css";

export default function FormRecuperar() {
  const [estado, accao, pendente] = useActionState(recuperarPassword, {});
  const valores = estado.valores ?? {};

  // a password foi mudada mas não deu para entrar sozinho: mostra o caminho para o login
  if (estado.sucesso) {
    return (
      <div className={styles.formulario}>
        <p className="alerta alerta-sucesso" role="status">{estado.sucesso}</p>
        <Link href="/login" className="botao botao-largo">
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <form action={accao} className={styles.formulario} noValidate>
      {estado.mensagem && <p className="alerta alerta-erro" role="alert">{estado.mensagem}</p>}

      <div className="campo">
        <label htmlFor="email">Email da conta</label>
        <input id="email" name="email" type="email" autoComplete="email" placeholder="ana@empresa.pt"
          defaultValue={valores.email} required />
      </div>

      <div className="campo">
        <label htmlFor="chave">Chave de recuperação</label>
        {/* sem preenchimento automático nem correção: a chave escreve-se tal como está */}
        <input id="chave" name="chave" type="text" className={styles.campoChave} placeholder="XXXXX-XXXXX-XXXXX-…"
          autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false} required />
      </div>

      <div className="campo">
        <label htmlFor="password">Password nova</label>
        <CampoPassword id="password" name="password" autoComplete="new-password" placeholder="Pelo menos 8 caracteres" />
      </div>

      <div className="campo">
        <label htmlFor="confirmacao">Confirmar password nova</label>
        <CampoPassword id="confirmacao" name="confirmacao" autoComplete="new-password" />
      </div>

      <button type="submit" className="botao botao-largo" disabled={pendente}>
        {pendente ? (
          <>
            <span className="roda" aria-hidden="true"></span> A confirmar
          </>
        ) : (
          "Mudar a password e entrar"
        )}
      </button>

      <p className={styles.nota}>Depois de usada, a chave deixa de valer e recebes uma nova ao entrar.</p>
    </form>
  );
}
