"use client";
// Botão "Instalar a app" do menu do painel (PWA).
//
//  - Chrome, Edge, Android: o browser avisa que a app pode ser instalada (evento
//    "beforeinstallprompt"); guardamos esse aviso e o botão abre a janela de instalar do browser.
//  - iPhone/iPad: o Safari não tem essa janela, por isso o botão explica os passos
//    (Partilhar > Adicionar ao ecrã principal).
//  - Já instalada (aberta como app) ou browser sem suporte: o botão não aparece.

import { useEffect, useRef, useState } from "react";
import Icone from "@/components/Icone";
import styles from "./BotaoInstalar.module.css";

// o aviso do browser pode chegar antes de o React desenhar o botão: apanha-se logo aqui
let avisoGuardado = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // não mostra a barra automática do browser; usamos o nosso botão
    avisoGuardado = e;
  });
}

function jaInstalada() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function eIOS() {
  const ua = window.navigator.userAgent;
  // os iPad recentes dizem que são um Mac, mas têm ecrã tátil
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && window.navigator.maxTouchPoints > 1);
}

export default function BotaoInstalar({ className }) {
  const [modo, setModo] = useState(null); // null (escondido) | "browser" | "ios"
  const dialogo = useRef(null);

  useEffect(() => {
    if (jaInstalada()) return;

    function comAviso(e) {
      e.preventDefault();
      avisoGuardado = e;
      setModo("browser");
    }
    function instalada() {
      avisoGuardado = null;
      setModo(null);
    }

    // decidido depois de o componente aparecer, porque só o browser sabe estas coisas
    const inicial = avisoGuardado ? "browser" : eIOS() ? "ios" : null;
    const temporizador = setTimeout(() => setModo(inicial), 0);
    window.addEventListener("beforeinstallprompt", comAviso);
    window.addEventListener("appinstalled", instalada);
    return () => {
      clearTimeout(temporizador);
      window.removeEventListener("beforeinstallprompt", comAviso);
      window.removeEventListener("appinstalled", instalada);
    };
  }, []);

  async function instalar() {
    if (modo === "ios") {
      dialogo.current?.showModal();
      return;
    }
    if (!avisoGuardado) return;
    avisoGuardado.prompt();
    const { outcome } = await avisoGuardado.userChoice;
    if (outcome === "accepted") setModo(null);
    avisoGuardado = null; // cada aviso só se pode usar uma vez
  }

  if (!modo) return null;

  return (
    <>
      <button type="button" className={`${className} ${styles.botao}`} onClick={instalar}>
        <Icone nome="telemovel" tamanho={19} />
        <span>Instalar a app</span>
      </button>

      {modo === "ios" && (
        <dialog ref={dialogo} className={styles.dialogo} aria-labelledby="titulo-instalar">
          <div className={styles.conteudo}>
            <h2 id="titulo-instalar">Instalar no iPhone</h2>
            <ol className={styles.passos}>
              <li>
                No Safari, toca em <strong>Partilhar</strong> (o quadrado com a seta para cima).
              </li>
              <li>
                Escolhe <strong>Adicionar ao ecrã principal</strong>.
              </li>
              <li>
                Toca em <strong>Adicionar</strong>. O FlowCRM fica ao lado das outras apps.
              </li>
            </ol>
            <button type="button" className="botao botao-largo" onClick={() => dialogo.current?.close()}>
              Percebi
            </button>
          </div>
        </dialog>
      )}
    </>
  );
}
