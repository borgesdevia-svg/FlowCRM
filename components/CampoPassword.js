"use client";
// Caixa de password com um botão "Mostrar / Esconder".
// Por defeito o texto fica escondido (type="password"): ninguém ao lado o lê
// e o browser não o guarda nas sugestões de preenchimento.
// É de cliente porque guarda um estado (visível ou não).
//
// Props: id, name, autoComplete, placeholder, invalido (true se tiver erro)

import { useState } from "react";
import Icone from "@/components/Icone";

export default function CampoPassword({ id, name, autoComplete, placeholder, invalido = false }) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="com-icone com-mostrar">
      <Icone nome="cadeado" tamanho={17} className="icone-campo" />
      <input
        id={id}
        name={name}
        type={visivel ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={invalido}
      />
      {/* type="button": carregar aqui NÃO envia o formulário */}
      <button
        type="button"
        className="botao-mostrar"
        onClick={() => setVisivel(!visivel)}
        aria-label={visivel ? "Esconder password" : "Mostrar password"}
      >
        <Icone nome="olho" tamanho={15} />
        {visivel ? "Esconder" : "Mostrar"}
      </button>
    </div>
  );
}
