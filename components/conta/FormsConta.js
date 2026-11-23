"use client";
// Os formulários da página "A minha conta" (perfil e password).
// Cada um tem o seu useActionState, ligado à sua Server Action.

import { useActionState } from "react";
import { mudarPerfil, mudarPassword } from "@/lib/acoes/conta";
import CampoPassword from "@/components/CampoPassword";

const estiloForm = { display: "flex", flexDirection: "column", gap: 14 };
const estiloBotao = { alignSelf: "flex-start" };
const estiloLinha = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 };

// mensagem de erro ou de sucesso devolvida pela action
function Mensagem({ estado }) {
  if (estado.erro) return <p className="alerta alerta-erro" role="alert">{estado.erro}</p>;
  if (estado.sucesso) return <p className="alerta alerta-sucesso" role="status">{estado.sucesso}</p>;
  return null;
}

export function FormPerfil({ perfil }) {
  const [estado, accao, pendente] = useActionState(mudarPerfil, {});
  const v = estado.valores ?? perfil;

  return (
    <form action={accao} style={estiloForm}>
      <Mensagem estado={estado} />
      <div className="campo">
        <label htmlFor="nome">Nome</label>
        <input id="nome" name="nome" autoComplete="name" defaultValue={v.nome ?? ""} required />
      </div>
      <div style={estiloLinha}>
        <div className="campo">
          <label htmlFor="cargo">Cargo (opcional)</label>
          <input id="cargo" name="cargo" maxLength={60} placeholder="Ex.: Comercial sénior" defaultValue={v.cargo ?? ""} />
        </div>
        <div className="campo">
          <label htmlFor="telefone">Telefone (opcional)</label>
          <input
            id="telefone"
            name="telefone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={30}
            placeholder="+351 912 345 678"
            defaultValue={v.telefone ?? ""}
          />
        </div>
      </div>
      <button type="submit" className="botao" disabled={pendente} style={estiloBotao}>
        {pendente ? "A guardar..." : "Guardar perfil"}
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
        <CampoPassword id="nova" name="nova" autoComplete="new-password" />
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
