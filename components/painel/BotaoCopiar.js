"use client";
// Botão que copia o link completo do formulário público.
// É de cliente porque a área de transferência (navigator.clipboard)
// e o endereço do site (window.location) só existem no browser.

import { useState } from "react";

export default function BotaoCopiar({ caminho, className }) {
  // estado: true durante 2 segundos depois de copiar
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    // ex.: "http://localhost:3000" + "/f/padaria-central"
    const linkCompleto = window.location.origin + caminho;
    try {
      await navigator.clipboard.writeText(linkCompleto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // alguns browsers bloqueiam a cópia: mostramos o link para copiar à mão
      window.prompt("Copia este link:", linkCompleto);
    }
  }

  return (
    <button type="button" onClick={copiar} className={className} aria-live="polite">
      {copiado ? "Copiado" : "Copiar link"}
    </button>
  );
}
