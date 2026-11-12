"use client";
// Os dois formulários da página "A minha conta".
// Cada um tem o seu useActionState, ligado à sua Server Action.

import { useActionState } from "react";
import { mudarNome, mudarPassword } from "@/lib/acoes/conta";

const estiloForm = { display: "flex", flexDirection: "column", gap: 14 };

// mensagem de erro ou de sucesso devolvida pela action
function Mensagem({ estado }) {
  if (estado.erro) return <p className="alerta alerta-erro" role="alert">{estado.erro}</p>;
  if (estado.sucesso) return <p className="alerta alerta-sucesso" role="status">{estado.sucesso}</p>;
  return null;
}

export function FormNome({ nomeAtual }) {
  const [estado, accao, pendente] = useActionState(mudarNome, {});

  return (
    <form action={accao} style={estiloForm}>
      <Mensagem estado={estado} />
      <div className="campo">
        <label htmlFor="nome">Nome</label>
        <input id="nome" name="nome" autoComplete="name" defaultValue={estado.nome ?? nomeAtual} />
      </div>
      <button type="submit" className="botao" disabled={pendente} style={{ alignSelf: "flex-start" }}>
        {pendente ? "A guardar..." : "Guardar nome"}
      </button>
    </form>
  );
}

export function FormPassword() {
  const [estado, accao, pendente] = useActionState(mudarPassword, {});

  return (
    // key: depois de mudar com sucesso, os campos ficam vazios
    <form action={accao} key={estado.sucesso} style={estiloForm}>
      <Mensagem estado={estado} />
      <div className="campo">
        <label htmlFor="atual">Password atual</label>
        <input id="atual" name="atual" type="password" autoComplete="current-password" />
      </div>
      <div className="campo">
        <label htmlFor="nova">Nova password</label>
        <input id="nova" name="nova" type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" />
      </div>
      <div className="campo">
        <label htmlFor="confirmacao">Repete a nova password</label>
        <input id="confirmacao" name="confirmacao" type="password" autoComplete="new-password" />
      </div>
      <button type="submit" className="botao" disabled={pendente} style={{ alignSelf: "flex-start" }}>
        {pendente ? "A mudar..." : "Mudar password"}
      </button>
    </form>
  );
}
