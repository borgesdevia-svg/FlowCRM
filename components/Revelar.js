"use client";
// "use client" = este componente corre no BROWSER (componente de cliente).
// É preciso porque só o browser sabe quando um elemento aparece no ecrã.

import { useEffect, useRef, useState } from "react";

// Envolve qualquer conteúdo e faz com que ele "apareça" (deslizando para cima)
// quando o utilizador faz scroll até ele.
// Exemplo: <Revelar atraso={100}><h2>Título</h2></Revelar>
export default function Revelar({ children, atraso = 0, className = "" }) {
  // useRef: guarda uma referência para o <div> real da página
  const ref = useRef(null);

  // useState: "estado" do componente. Quando muda, o React volta a desenhar.
  const [visivel, setVisivel] = useState(false);

  // useEffect: corre depois de o componente aparecer no ecrã
  useEffect(() => {
    const elemento = ref.current;

    // IntersectionObserver (do browser): avisa quando o elemento entra no ecrã
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisivel(true);
          observador.disconnect(); // só anima uma vez
        }
      },
      { threshold: 0.15 } // dispara quando 15% do elemento está visível
    );

    observador.observe(elemento);

    // limpeza: se o componente sair da página, deixa de observar
    return () => observador.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`revelar ${visivel ? "visivel" : ""} ${className}`}
      style={{ transitionDelay: `${atraso}ms` }}
    >
      {children}
    </div>
  );
}
