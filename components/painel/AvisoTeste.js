"use client";
// Faixa no topo do painel sobre o teste do CRM Pro (só para administradores):
//  - nos últimos 3 dias: "O teu teste acaba daqui a X dias"
//  - nos 7 dias depois de passar ao Essencial: "Os 14 dias acabaram"
// O servidor decide se aparece (lib/planos.js -> avisoPlano). Ao fechar, guarda um cookie
// com a "chave" do aviso: o servidor já não o mostra, mesmo noutra página (sem piscar).
// Um aviso novo (ex.: depois de "acaba" vem "acabou") tem outra chave e volta a aparecer.

import { useState } from "react";
import Link from "next/link";
import Icone from "@/components/Icone";
import { COOKIE_AVISO_TESTE } from "@/lib/planos";
import styles from "./AvisoTeste.module.css";

export default function AvisoTeste({ tipo, chave, texto }) {
  const [fechado, setFechado] = useState(false);
  if (fechado) return null;

  function fechar() {
    // 30 dias chega: depois disso o aviso já não se aplica
    document.cookie = `${COOKIE_AVISO_TESTE}=${chave}; path=/painel; max-age=${30 * 24 * 60 * 60}; samesite=lax`;
    setFechado(true);
  }

  return (
    <div className={`${styles.aviso} ${tipo === "acabou" ? styles.acabou : ""}`} role="status">
      <Icone nome={tipo === "acabou" ? "cadeado" : "relogio"} tamanho={17} />
      <p>{texto}</p>
      <Link href="/painel/plano" className={styles.link}>
        Ver os planos
      </Link>
      <button type="button" className={styles.fechar} onClick={fechar} aria-label="Fechar aviso" title="Fechar">
        <Icone nome="cruz" tamanho={16} />
      </button>
    </div>
  );
}
