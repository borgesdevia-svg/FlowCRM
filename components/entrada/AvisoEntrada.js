"use client";
// Avisos NO ECRÃ com o CRM aberto (funcionam sempre, mesmo sem os avisos push ligados):
//  - ao admin: "Lead novo: Marta" quando chega um lead à Entrada (sem responsável);
//  - a todos: "Lead novo: Marta · ficou para ti" quando OUTRA pessoa (ou a roleta) lhe entrega
//    um lead (colunas atribuido_em / atribuido_por, migração 45).
// De 30 em 30 segundos (e ao voltar à aba) pergunta à base de dados. A data do último aviso fica
// no browser (partilhada entre abas): cada lead avisa uma vez.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { criarClienteBrowser } from "@/lib/supabase/cliente";
import Icone from "@/components/Icone";
import styles from "./Entrada.module.css";

const CHAVE_ENTRADA = "flowcrm_entrada_ultimo"; // último lead da Entrada avisado
const CHAVE_MEUS = "flowcrm_meus_ultimo"; // último lead entregue a mim avisado
const INTERVALO = 30 * 1000;
const MAX_AVISOS = 3; // no máximo 3 cartões ao mesmo tempo (os mais recentes)
const FECHAR_SOZINHO = 20 * 1000;

// texto e link de cada aviso
function conteudo(l) {
  if (l.meu) return { texto: "Ficou para ti.", link: `/painel/clientes/${l.id}`, botao: "Abrir o lead" };
  const origem = l.origem === "formulario" ? "Chegou pelo formulário" : "Chegou agora";
  return { texto: `${origem}. Está na Entrada à espera de ser aceite.`, link: "/painel/entrada", botao: "Abrir a Entrada" };
}

// "começa agora": os leads que já existiam não dão aviso
function lerData(chave) {
  if (!localStorage.getItem(chave)) localStorage.setItem(chave, new Date().toISOString());
  return localStorage.getItem(chave);
}

export default function AvisoEntrada({ perfilId, eAdmin }) {
  const router = useRouter();
  const [avisos, setAvisos] = useState([]);

  const fechar = useCallback((chave) => setAvisos((a) => a.filter((x) => x.chave !== chave)), []);

  useEffect(() => {
    const supabase = criarClienteBrowser();

    // pergunta os leads novos desde a data guardada; devolve-os e avança a data
    async function novosDesde(chave, coluna, filtro) {
      const desde = lerData(chave);
      const { data } = await filtro(
        supabase.from("clientes").select(`id, nome, origem, ${coluna}`).gt(coluna, desde).order(coluna, { ascending: true }).limit(20),
      );
      if (!data?.length) return [];
      if (localStorage.getItem(chave) !== desde) return []; // outra aba já avisou
      localStorage.setItem(chave, data.at(-1)[coluna]);
      return data;
    }

    async function verificar() {
      const [entrada, meus] = await Promise.all([
        eAdmin ? novosDesde(CHAVE_ENTRADA, "criado_em", (q) => q.is("responsavel_id", null)) : [],
        // entregues a mim por outra pessoa ou pela roleta (o que eu próprio aceito para mim não avisa)
        novosDesde(CHAVE_MEUS, "atribuido_em", (q) =>
          q.eq("responsavel_id", perfilId).or(`atribuido_por.is.null,atribuido_por.neq.${perfilId}`),
        ),
      ]);
      const novos = [...entrada.map((l) => ({ ...l, chave: `e-${l.id}` })), ...meus.map((l) => ({ ...l, meu: true, chave: `m-${l.id}` }))];
      if (!novos.length) return;

      setAvisos((atuais) => [...atuais, ...novos].slice(-MAX_AVISOS));
      for (const l of novos) setTimeout(() => fechar(l.chave), FECHAR_SOZINHO);
      router.refresh(); // os números do menu e a lista da página aberta
    }

    lerData(CHAVE_ENTRADA);
    lerData(CHAVE_MEUS);
    const correr = () => verificar().catch(() => {});
    const id = setInterval(correr, INTERVALO);
    const aoVoltar = () => document.visibilityState === "visible" && correr();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [router, fechar, perfilId, eAdmin]);

  if (avisos.length === 0) return null;

  return (
    <div className={styles.avisos} role="status" aria-live="polite">
      {avisos.map((l) => {
        const { texto, link, botao } = conteudo(l);
        return (
          <div key={l.chave} className={styles.aviso}>
            <Icone nome={l.meu ? "utilizador" : "caixaEntrada"} tamanho={18} />
            <div className={styles.textoAviso}>
              <strong>Lead novo: {l.nome}</strong>
              <small>{texto}</small>
              <Link href={link} onClick={() => fechar(l.chave)}>
                {botao}
              </Link>
            </div>
            <button type="button" className={styles.fechar} onClick={() => fechar(l.chave)} aria-label="Fechar aviso">
              <Icone nome="cruz" tamanho={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
