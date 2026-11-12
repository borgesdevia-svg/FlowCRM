"use client";
// Os dois formulários da página "A minha conta".
// Cada um tem o seu useActionState, ligado à sua Server Action.

import { useActionState } from "react";
import { mudarNome, mudarPassword } from "@/lib/acoes/conta";
import Icone from "@/components/Icone";
import CampoPassword from "@/components/CampoPassword";

const estiloForm = { display: "flex", flexDirection: "column", gap: 14 };
const estiloBotao = { alignSelf: "flex-start" };

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
        <div className="com-icone">
          <Icone nome="utilizador" tamanho={17} className="icone-campo" />
          <input id="nome" name="nome" autoComplete="name" defaultValue={estado.nome ?? nomeAtual} />
        </div>
      </div>
      <button type="submit" className="botao" disabled={pendente} style={estiloBotao}>
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
      {/* CampoPassword: caixa escondida com botão "Mostrar" */}
      <div className="campo">
        <label htmlFor="atual">Password atual</label>
        <CampoPassword id="atual" name="atual" autoComplete="current-password" />
      </div>
      <div className="campo">
        <label htmlFor="nova">Nova password</label>
        <CampoPassword id="nova" name="nova" autoComplete="new-password" placeholder="Mínimo 8 caracteres" />
      </div>
      <div className="campo">
        <label htmlFor="confirmacao">Repete a nova password</label>
        <CampoPassword id="confirmacao" name="confirmacao" autoComplete="new-password" />
      </div>
      <button type="submit" className="botao" disabled={pendente} style={estiloBotao}>
        {pendente ? "A mudar..." : "Mudar password"}
      </button>
    </form>
  );
}
