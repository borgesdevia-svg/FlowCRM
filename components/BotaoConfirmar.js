"use client";
// Botão reutilizável que pede confirmação antes de executar uma Server Action.
// Props:
//  - accao: a Server Action a chamar
//  - campos: dados escondidos a enviar, ex.: { id: "123", cliente_id: "456" }
//  - pergunta: texto da confirmação
//  - children: o texto do botão
//  - className: classe do botão

export default function BotaoConfirmar({ accao, campos, pergunta, children, className }) {
  function confirmar(evento) {
    // se a pessoa carregar em "Cancelar", o formulário não é enviado
    if (!window.confirm(pergunta)) evento.preventDefault();
  }

  return (
    <form action={accao} onSubmit={confirmar}>
      {/* Object.entries transforma { id: "1" } em [["id", "1"]] para criar os inputs */}
      {Object.entries(campos).map(([nome, valor]) => (
        <input key={nome} type="hidden" name={nome} value={valor} />
      ))}
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
