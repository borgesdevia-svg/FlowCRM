"use client";
// Liga os avisos de leads novos SOZINHO (por predefinição estão ligados, decisão do aluno a 2026-11-28).
// - Se a pessoa os desligou neste browser (A minha conta › Avisos), não faz nada.
// - Se o browser já deu permissão, liga-os sem perguntar nada.
// - Se ainda não perguntou, pede a permissão no PRIMEIRO toque/clique no painel: os browsers só
//   deixam pedir a seguir a um gesto da pessoa.
// Não desenha nada no ecrã.

import { useEffect } from "react";
import { CHAVE_AVISOS_ABA, CHAVE_AVISOS_DESLIGADOS, ativarAvisos, temPush } from "@/lib/avisosBrowser";

const PERGUNTADO = "flowcrm_avisos_perguntado"; // só pede a permissão uma vez por browser

// já estão ligados neste browser?
async function jaLigados() {
  if (localStorage.getItem(CHAVE_AVISOS_ABA) === "1") return true;
  if (!temPush()) return false;
  const reg = await navigator.serviceWorker.getRegistration("/");
  return Boolean(reg && (await reg.pushManager.getSubscription()));
}

export default function LigarAvisos() {
  useEffect(() => {
    if (!("Notification" in window)) return;
    if (localStorage.getItem(CHAVE_AVISOS_DESLIGADOS) === "1") return;
    if (Notification.permission === "denied") return;

    if (Notification.permission === "granted") {
      // permissão já dada: liga em silêncio (se ainda não estiver)
      jaLigados()
        .then((ligados) => (ligados ? null : ativarAvisos()))
        .catch(() => {});
      return;
    }

    if (localStorage.getItem(PERGUNTADO) === "1") return;
    const aoPrimeiroToque = () => {
      localStorage.setItem(PERGUNTADO, "1");
      ativarAvisos().catch(() => {});
    };
    document.addEventListener("pointerdown", aoPrimeiroToque, { once: true });
    return () => document.removeEventListener("pointerdown", aoPrimeiroToque);
  }, []);

  return null;
}
