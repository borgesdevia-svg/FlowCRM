"use client";
// Botão "Remover" com confirmação, para não se apagar ninguém por engano.
// É de cliente porque window.confirm() só existe no browser.

import { removerMembro } from "@/lib/acoes/equipa";
import Icone from "@/components/Icone";

export default function BotaoRemover({ id, nome, className }) {
  function confirmar(evento) {
    // se a pessoa carregar em "Cancelar", o formulário não é enviado
    if (!window.confirm(`Remover ${nome} da equipa? Os clientes dessa pessoa ficam sem responsável.`)) {
      evento.preventDefault();
    }
  }

  return (
    <form action={removerMembro} onSubmit={confirmar}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={className} title={`Remover ${nome}`}>
        <Icone nome="utilizadorSai" tamanho={15} /> Remover
      </button>
    </form>
  );
}
