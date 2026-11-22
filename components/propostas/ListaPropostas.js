"use client";
// Propostas de um lead, na ficha (CRM Pro).
// Cada proposta mostra o estado (à espera, aceite, recusada, expirada), o total e
// botões para copiar o link, enviá-lo por WhatsApp, ver a página do cliente e apagar.

import { useState } from "react";
import Link from "next/link";
import Icone from "@/components/Icone";
import BotaoConfirmar from "@/components/BotaoConfirmar";
import { apagarProposta } from "@/lib/acoes/propostas";
import { ESTADOS_PROPOSTA, estadoProposta } from "@/lib/propostas";
import { formatarData, formatarEuros } from "@/lib/estados";
import { linkWhatsapp } from "@/lib/whatsapp";
import styles from "./Propostas.module.css";

export default function ListaPropostas({ propostas, clienteId, nomeCliente, telefone, perfilId, eAdmin, destacarNova }) {
  const [copiado, setCopiado] = useState(null);

  // o endereço completo só se sabe no browser (localhost, Vercel ou outro domínio)
  const endereco = (token) => `${window.location.origin}/p/${token}`;

  async function copiar(token) {
    try {
      await navigator.clipboard.writeText(endereco(token));
      setCopiado(token);
      setTimeout(() => setCopiado((c) => (c === token ? null : c)), 2000);
    } catch {
      window.prompt("Copia o link da proposta:", endereco(token));
    }
  }

  function enviarWhatsapp(p) {
    const primeiro = nomeCliente.trim().split(/\s+/)[0];
    const texto = `Olá ${primeiro}! Aqui está a proposta "${p.titulo}". Pode ver os detalhes e aceitar aqui: ${endereco(p.token)}`;
    window.open(linkWhatsapp(telefone, texto), "_blank", "noopener");
  }

  if (propostas.length === 0) {
    return <p className={styles.vazio}>Ainda não há propostas. Cria uma e envia o link: o cliente aceita online.</p>;
  }

  return (
    <ul className={styles.lista}>
      {propostas.map((p, i) => {
        const chave = estadoProposta(p);
        const estado = ESTADOS_PROPOSTA[chave];
        return (
          <li
            key={p.id}
            className={`${styles.proposta} ${destacarNova && i === 0 ? styles.nova : ""}`}
            style={{ "--cor": estado.cor }}
          >
            <div className={styles.linhaTopo}>
              <strong className={styles.titulo}>{p.titulo}</strong>
              <span className={styles.total}>{formatarEuros(p.total)}</span>
            </div>
            <p className={styles.estado}>
              <span className={styles.ponto} aria-hidden="true" />
              {estado.texto}
              {chave === "aceite" && p.aceite_por && <> · assinada por {p.aceite_por}</>}
              <span className={styles.data}>
                {p.respondida_em
                  ? ` · ${formatarData(p.respondida_em)}`
                  : ` · criada a ${formatarData(p.criado_em)}${p.validade ? `, válida até ${formatarData(p.validade)}` : ""}`}
              </span>
            </p>

            <div className={styles.acoes}>
              {chave === "enviada" && (
                <>
                  <button type="button" className={styles.acao} onClick={() => copiar(p.token)}>
                    <Icone nome={copiado === p.token ? "visto" : "copiar"} tamanho={14} />
                    {copiado === p.token ? "Copiado" : "Copiar link"}
                  </button>
                  {linkWhatsapp(telefone) && (
                    <button type="button" className={styles.acao} onClick={() => enviarWhatsapp(p)}>
                      <Icone nome="conversa" tamanho={14} />
                      Enviar por WhatsApp
                    </button>
                  )}
                </>
              )}
              <Link href={`/p/${p.token}`} target="_blank" className={styles.acao}>
                <Icone nome="externo" tamanho={14} />
                Ver como o cliente
              </Link>
              {(p.autor_id === perfilId || eAdmin) && (
                <BotaoConfirmar
                  accao={apagarProposta}
                  campos={{ id: p.id, cliente_id: clienteId }}
                  pergunta={`Apagar a proposta "${p.titulo}"? O link deixa de funcionar.`}
                  className={`${styles.acao} ${styles.apagar}`}
                >
                  Apagar
                </BotaoConfirmar>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
