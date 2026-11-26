"use client";
// Link do formulário público com a escolha "Para onde vai o link" (migração 35).
// Escolher "Instagram" junta ?de=instagram ao link: os leads que chegarem por esse link ficam
// marcados como vindos do Instagram, e a Visão geral mostra o que resulta em cada sítio.

import { useState } from "react";
import Link from "next/link";
import { CANAIS } from "@/lib/canais";
import BotaoCopiar from "@/components/painel/BotaoCopiar";
import styles from "./LinkFormulario.module.css";

// os sítios onde mais se partilha o link (a lista completa está em lib/canais.js)
const OPCOES = CANAIS.filter((c) => ["instagram", "facebook", "whatsapp", "site", "tiktok", "linkedin", "email"].includes(c.chave));

export default function LinkFormulario({ slug, classeBotao = "" }) {
  const [canal, setCanal] = useState("");
  const caminho = `/f/${slug}${canal ? `?de=${canal}` : ""}`;

  return (
    <div className={styles.bloco}>
      <label className={styles.para}>
        <span>Para partilhar em</span>
        <select value={canal} onChange={(e) => setCanal(e.target.value)}>
          <option value="">Qualquer sítio</option>
          {OPCOES.map((c) => (
            <option key={c.chave} value={c.chave}>
              {c.nome}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.linha}>
        {/* target="_blank" abre num separador novo, para o painel continuar aberto */}
        <Link href={caminho} target="_blank" className={styles.link}>
          {caminho}
        </Link>
        <BotaoCopiar caminho={caminho} className={classeBotao} />
      </div>
    </div>
  );
}
