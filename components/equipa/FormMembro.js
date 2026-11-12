"use client";
// Formulário para o admin adicionar um comercial (componente de cliente,
// para mostrar erros e o estado "a adicionar..." sem recarregar a página).

import { useActionState } from "react";
import { criarMembro } from "@/lib/acoes/equipa";
import Icone from "@/components/Icone";
import CampoPassword from "@/components/CampoPassword";

export default function FormMembro() {
  const [estado, accao, pendente] = useActionState(criarMembro, {});
  const erros = estado.erros ?? {};
  const valores = estado.valores ?? {};

  return (
    // key: quando um membro é criado com sucesso, o formulário "renasce" vazio
    <form action={accao} key={estado.sucesso} style={{ display: "flex", flexDirection: "column", gap: 14 }} noValidate>
      {estado.mensagem && <p className="alerta alerta-erro" role="alert">{estado.mensagem}</p>}
      {estado.sucesso && <p className="alerta alerta-sucesso" role="status">{estado.sucesso}</p>}

      <div className="campo">
        <label htmlFor="nome">Nome</label>
        <div className="com-icone">
          <Icone nome="utilizador" tamanho={17} className="icone-campo" />
          <input id="nome" name="nome" placeholder="Rui Martins" defaultValue={valores.nome} aria-invalid={!!erros.nome} />
        </div>
        {erros.nome && <p className="erro-campo">{erros.nome}</p>}
      </div>

      <div className="campo">
        <label htmlFor="email">Email</label>
        <div className="com-icone">
          <Icone nome="email" tamanho={17} className="icone-campo" />
          <input id="email" name="email" type="email" placeholder="rui@empresa.pt" defaultValue={valores.email} aria-invalid={!!erros.email} />
        </div>
        {erros.email && <p className="erro-campo">{erros.email}</p>}
      </div>

      <div className="campo">
        <label htmlFor="password">Password inicial</label>
        {/* escondida por defeito; o botão "Mostrar" deixa ver para a partilhar */}
        <CampoPassword
          id="password"
          name="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          invalido={!!erros.password}
        />
        {erros.password && <p className="erro-campo">{erros.password}</p>}
      </div>

      <button type="submit" className="botao botao-largo" disabled={pendente}>
        {pendente ? "A adicionar..." : (
          <>
            <Icone nome="utilizadorMais" tamanho={17} /> Adicionar à equipa
          </>
        )}
      </button>
    </form>
  );
}
