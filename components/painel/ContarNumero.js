"use client";
// Número que "conta" de 0 até ao valor final quando a página abre.
// É de cliente porque a animação acontece no browser.
// Ex.: <ContarNumero valor={38} sufixo="%" />  ->  0% ... 38%

import { useEffect, useState } from "react";

const DURACAO = 900; // milissegundos

export default function ContarNumero({ valor, sufixo = "" }) {
  // começa já no valor final: assim o HTML gerado no servidor mostra o número certo,
  // e quem não tem JavaScript (ou pediu "menos movimento") vê logo o resultado
  const [atual, setAtual] = useState(valor);

  useEffect(() => {
    // respeita a opção do sistema operativo "reduzir movimento"
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || valor === 0) return;

    let pedido;
    const inicio = performance.now();

    // requestAnimationFrame: atualiza o número uma vez por imagem desenhada no ecrã
    function passo(agora) {
      const progresso = Math.min(1, (agora - inicio) / DURACAO);
      const suave = 1 - Math.pow(1 - progresso, 3); // começa rápido e trava no fim
      setAtual(Math.round(valor * suave));
      if (progresso < 1) pedido = requestAnimationFrame(passo);
    }

    pedido = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(pedido); // limpeza ao sair da página
  }, [valor]);

  return (
    <>
      {atual}
      {sufixo}
    </>
  );
}
