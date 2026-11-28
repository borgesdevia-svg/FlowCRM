"use client";
// Interruptor "Avisos de leads novos" em A minha conta (migração 34).
// Por predefinição estão LIGADOS (components/painel/LigarAvisos.js); aqui a pessoa pode desligá-los.
//
// Dois modos, escolhidos sozinhos conforme o browser:
//  - "ligado": avisos mesmo com o FlowCRM fechado (web push). Regista o service worker (/sw.js),
//    cria a subscrição e guarda-a no servidor.
//  - "aba": o browser não deixa receber avisos com o CRM fechado (Brave com a opção desligada,
//    Vivaldi, …). Os avisos aparecem enquanto houver uma aba do FlowCRM aberta
//    (components/painel/VigiaLeads.js), sem precisar do serviço de avisos do browser.
// Cada browser é independente: ligar no telemóvel não liga no PC.

import { useEffect, useState } from "react";
import { desligarAvisos } from "@/lib/acoes/avisos";
import { CHAVE_AVISOS_ABA, CHAVE_AVISOS_DESLIGADOS, ativarAvisos, registo, temPush } from "@/lib/avisosBrowser";
import styles from "./InterruptorAvisos.module.css";

async function eBrave() {
  try {
    return typeof navigator.brave?.isBrave === "function" && (await navigator.brave.isBrave());
  } catch {
    return false;
  }
}

export default function InterruptorAvisos() {
  // "a-ver" | "sem-suporte" | "bloqueado" | "ligado" | "aba" | "desligado"
  const [estado, setEstado] = useState("a-ver");
  const [brave, setBrave] = useState(false);
  const [pendente, setPendente] = useState(false);
  const [erro, setErro] = useState("");

  // ao abrir: este browser suporta avisos? já estão ligados? é o Brave?
  useEffect(() => {
    let ativo = true;
    (async () => {
      const souBrave = await eBrave();
      let novo = "desligado";
      if (!("Notification" in window)) {
        novo = "sem-suporte";
      } else if (Notification.permission === "denied") {
        novo = "bloqueado";
      } else {
        const sub = temPush() ? await (await registo()).pushManager.getSubscription() : null;
        if (sub) novo = "ligado";
        else if (localStorage.getItem(CHAVE_AVISOS_ABA) === "1" && Notification.permission === "granted") novo = "aba";
      }
      if (ativo) {
        setBrave(souBrave);
        setEstado(novo);
      }
    })().catch(() => ativo && setEstado("desligado"));
    return () => {
      ativo = false;
    };
  }, []);

  async function ligar() {
    const r = await ativarAvisos(); // lib/avisosBrowser.js
    if (r?.erro) setErro(r.erro);
    else setEstado(r);
  }

  async function desligar() {
    localStorage.removeItem(CHAVE_AVISOS_ABA);
    // fica desligado de propósito: o painel não os volta a ligar sozinho (components/painel/LigarAvisos.js)
    localStorage.setItem(CHAVE_AVISOS_DESLIGADOS, "1");
    if (temPush()) {
      const sub = await (await registo()).pushManager.getSubscription();
      if (sub) {
        await desligarAvisos(sub.endpoint);
        await sub.unsubscribe();
      }
    }
    setEstado("desligado");
  }

  async function mudar(ligarAgora) {
    setPendente(true);
    setErro("");
    try {
      await (ligarAgora ? ligar() : desligar());
    } catch (e) {
      console.error("avisos:", e);
      setErro(`Não foi possível mudar os avisos neste browser (${e?.name ?? "erro"}).`);
    } finally {
      setPendente(false);
    }
  }

  if (estado === "sem-suporte") {
    return (
      <p className={styles.nota}>
        Este browser não mostra avisos. No iPhone, instala primeiro o FlowCRM no ecrã principal (Partilhar › Adicionar
        ao ecrã principal) e abre-o a partir daí.
      </p>
    );
  }

  const ligado = estado === "ligado" || estado === "aba";

  return (
    <div className={styles.bloco}>
      <label className={styles.linha}>
        <span className={styles.texto}>
          <strong>Avisos de leads novos</strong>
          <span>Neste dispositivo, quando um lead teu (ou da empresa, se fores admin) chega pelo formulário.</span>
        </span>
        <span className={styles.interruptor}>
          <input
            type="checkbox"
            role="switch"
            checked={ligado}
            disabled={pendente || estado === "a-ver" || estado === "bloqueado"}
            onChange={(e) => mudar(e.target.checked)}
          />
          <span className={styles.trilho} aria-hidden="true">
            <span className={styles.bola}></span>
          </span>
        </span>
      </label>

      {estado === "ligado" && <p className={styles.nota}>Ligado. Recebes os avisos mesmo com o FlowCRM fechado.</p>}

      {estado === "aba" && (
        <p className={styles.nota}>
          Ligado, mas só enquanto tiveres o FlowCRM aberto numa aba (pode estar em segundo plano). Este browser não deixa
          receber avisos com ele fechado.
        </p>
      )}

      {/* no Brave, explica logo como ter os avisos completos (por defeito vêm desligados) */}
      {brave && estado !== "ligado" && estado !== "bloqueado" && (
        <div className={styles.dica}>
          <p>No Brave, para receberes avisos com o FlowCRM fechado (só é preciso uma vez):</p>
          <ol className={styles.passos}>
            <li>
              Escreve <code>brave://settings/privacy</code> na barra de endereço.
            </li>
            <li>Liga &quot;Use Google services for push messaging&quot;.</li>
            <li>Fecha e volta a abrir o Brave{estado === "aba" ? ", desliga e liga outra vez este interruptor" : ""}.</li>
          </ol>
        </div>
      )}

      {estado === "bloqueado" && (
        <p className={styles.nota}>
          Bloqueaste os avisos do FlowCRM neste browser. Para os ligar, permite as notificações nas definições do site
          (o cadeado ao lado do endereço) e volta a esta página.
        </p>
      )}

      {erro && (
        <p className="alerta alerta-erro" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
