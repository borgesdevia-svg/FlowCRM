"use client";
// Componente de cliente: precisa de correr no browser para mostrar
// os erros e o estado "a criar conta..." sem recarregar a página.

import { useActionState } from "react";
import { registar } from "@/lib/acoes/autenticacao";
import styles from "./Formulario.module.css";

// useActionState liga o formulário à Server Action "registar":
// - estado: o que a action devolveu (erros, mensagem, valores)
// - accao: o que pomos no <form action={...}>
// - pendente: true enquanto o servidor está a responder
export default function FormRegisto() {
  const [estado, accao, pendente] = useActionState(registar, {});
  const erros = estado.erros ?? {};
  const valores = estado.valores ?? {};

  return (
    <form action={accao} className={styles.formulario} noValidate>
      {estado.mensagem && <p className="alerta alerta-erro" role="alert">{estado.mensagem}</p>}
      {estado.sucesso && <p className="alerta alerta-sucesso" role="status">{estado.sucesso}</p>}

      <div className="campo">
        <label htmlFor="nome">O teu nome</label>
        <input id="nome" name="nome" autoComplete="name" placeholder="Ana Costa"
          defaultValue={valores.nome} aria-invalid={!!erros.nome} required />
        {erros.nome && <p className="erro-campo">{erros.nome}</p>}
      </div>

      <div className="campo">
        <label htmlFor="nome_empresa">Nome da empresa</label>
        <input id="nome_empresa" name="nome_empresa" autoComplete="organization" placeholder="Padaria Central, Lda."
          defaultValue={valores.nome_empresa} aria-invalid={!!erros.nome_empresa} required />
        {erros.nome_empresa && <p className="erro-campo">{erros.nome_empresa}</p>}
      </div>

      <div className="campo">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" placeholder="ana@empresa.pt"
          defaultValue={valores.email} aria-invalid={!!erros.email} required />
        {erros.email && <p className="erro-campo">{erros.email}</p>}
      </div>

      <div className="campo">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="new-password"
          placeholder="Mínimo 8 caracteres" minLength={8} aria-invalid={!!erros.password} required />
        {erros.password && <p className="erro-campo">{erros.password}</p>}
      </div>

      <button type="submit" className="botao botao-largo" disabled={pendente}>
        {pendente ? "A criar conta..." : "Criar conta da empresa"}
      </button>

      <p className={styles.nota}>Ficas como administrador e podes juntar a tua equipa depois.</p>
    </form>
  );
}
