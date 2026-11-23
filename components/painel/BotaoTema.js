"use client";
// Botão sol/lua na barra do topo: cada pessoa escolhe se vê o painel escuro ou claro.
// Fica guardado num cookie deste browser (lib/aparencia.js, COOKIE_MODO) e passa à frente
// do modo da empresa. As cores mudam logo no browser (mostrarModoJa); o servidor volta a
// desenhar o layout por trás e, quando chega, a cópia do browser é tirada.
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Icone from "@/components/Icone";
import { guardarModoPessoal, mostrarModoJa, tirarModoJa } from "@/lib/aparencia";
import styles from "./Sino.module.css";

export default function BotaoTema({ aparencia }) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  // o modo que se vê agora (muda logo ao clicar, antes de o servidor responder)
  const [modo, setModo] = useState(aparencia.modo);
  const [modoServidor, setModoServidor] = useState(aparencia.modo);

  // o layout novo chegou do servidor: já tem as cores certas, a cópia do browser sai
  if (aparencia.modo !== modoServidor) {
    setModoServidor(aparencia.modo);
    setModo(aparencia.modo);
  }
  useEffect(() => {
    tirarModoJa();
  }, [aparencia.modo]);

  const escuro = modo === "escuro";
  const texto = escuro ? "Mudar para o modo claro" : "Mudar para o modo escuro";

  function mudar() {
    const novo = escuro ? "claro" : "escuro";
    setModo(novo);
    mostrarModoJa(aparencia, novo);
    guardarModoPessoal(novo);
    iniciar(() => router.refresh());
  }

  return (
    <button type="button" className={styles.botao} onClick={mudar} title={texto} aria-label={texto}>
      <Icone nome={escuro ? "sol" : "lua"} tamanho={16} />
    </button>
  );
}
