"use client";
// Botão "Apagar cliente" com confirmação (window.confirm só existe no browser).

import { apagarCliente } from "@/lib/acoes/clientes";

export default function BotaoApagarCliente({ id, nome }) {
  function confirmar(evento) {
    if (!window.confirm(`Apagar ${nome}? As notas e tarefas deste cliente também são apagadas.`)) {
      evento.preventDefault();
    }
  }

  return (
    <form action={apagarCliente} onSubmit={confirmar}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="botao botao-secundario"
        style={{ color: "#fca5a5", borderColor: "rgba(248,113,113,0.35)" }}
      >
        Apagar cliente
      </button>
    </form>
  );
}
