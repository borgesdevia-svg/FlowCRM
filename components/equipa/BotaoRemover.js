"use client";
// Botão "Remover" com confirmação, para não se apagar ninguém por engano.
// É de cliente porque window.confirm() só existe no browser.

import { removerMembro } from "@/lib/acoes/equipa";

export default function BotaoRemover({ id, nome }) {
  function confirmar(evento) {
    // se a pessoa carregar em "Cancelar", o formulário não é enviado
    if (!window.confirm(`Remover ${nome} da equipa? Os clientes dessa pessoa ficam sem responsável.`)) {
      evento.preventDefault();
    }
  }

  return (
    <form action={removerMembro} onSubmit={confirmar}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        style={{
          padding: "6px 10px",
          borderRadius: 8,
          border: "1px solid rgba(248,113,113,0.3)",
          background: "transparent",
          color: "#fca5a5",
          font: "inherit",
          fontSize: "0.8rem",
          cursor: "pointer",
        }}
      >
        Remover
      </button>
    </form>
  );
}
