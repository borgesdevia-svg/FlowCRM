"use client";
// Interruptor "Avisos de leads novos" em A minha conta (migração 34).
// Ligar: regista o service worker (/sw.js), pede a permissão do browser, cria a subscrição
// e guarda-a no servidor. Desligar: apaga a subscrição deste browser.
// Cada browser é independente: ligar no telemóvel não liga no PC.

import { useEffect, useState } from "react";
import { ligarAvisos, desligarAvisos } from "@/lib/acoes/avisos";
import styles from "./InterruptorAvisos.module.css";

// .trim() e sem aspas: uma chave colada na Vercel com um espaço ou aspas a mais estragava tudo
const CHAVE_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim().replace(/^["']|["']$/g, "");

// a chave pública vem em base64url; o browser quer os bytes
function chaveEmBytes(base64) {
  const preenchimento = "=".repeat((4 - (base64.length % 4)) % 4);
  const normal = (base64 + preenchimento).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(normal), (c) => c.charCodeAt(0));
}

// regista o service worker e espera que fique ATIVO: na primeira vez ainda está a instalar,
// e o Chrome recusa criar a subscrição sem um service worker ativo
async function registo() {
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  return navigator.serviceWorker.ready;
}

export default function InterruptorAvisos() {
  // "a-ver" | "sem-suporte" | "bloqueado" | "ligado" | "desligado"
  const [estado, setEstado] = useState("a-ver");
  const [pendente, setPendente] = useState(false);
  const [erro, setErro] = useState("");

  // ao abrir: este browser suporta avisos? já estão ligados?
  useEffect(() => {
    let ativo = true;
    (async () => {
      let novo = "desligado";
      if (!CHAVE_PUBLICA || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        novo = "sem-suporte";
      } else if (Notification.permission === "denied") {
        novo = "bloqueado";
      } else {
        const reg = await registo();
        const sub = await reg.pushManager.getSubscription();
        novo = sub ? "ligado" : "desligado";
      }
      if (ativo) setEstado(novo);
    })().catch(() => ativo && setEstado("sem-suporte"));
    return () => {
      ativo = false;
    };
  }, []);

  async function mudar(ligar) {
    setPendente(true);
    setErro("");
    try {
      const reg = await registo();
      if (ligar) {
        const permissao = await Notification.requestPermission();
        if (permissao !== "granted") {
          setEstado(permissao === "denied" ? "bloqueado" : "desligado");
          return;
        }
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveEmBytes(CHAVE_PUBLICA) }));
        const resposta = await ligarAvisos(sub.toJSON());
        if (resposta.erro) {
          await sub.unsubscribe();
          setErro(resposta.erro);
          return;
        }
        setEstado("ligado");
      } else {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await desligarAvisos(sub.endpoint);
          await sub.unsubscribe();
        }
        setEstado("desligado");
      }
    } catch (e) {
      // o nome do erro ajuda a perceber o que falhou (ex.: AbortError = serviço de avisos do browser)
      console.error("avisos:", e);
      setErro(`Não foi possível mudar os avisos neste browser (${e?.name ?? "erro"}: ${e?.message ?? ""}).`);
    } finally {
      setPendente(false);
    }
  }

  if (estado === "sem-suporte") {
    return (
      <p className={styles.nota}>
        Este browser não recebe avisos. No iPhone, instala primeiro o FlowCRM no ecrã principal (Partilhar ›
        Adicionar ao ecrã principal) e abre-o a partir daí.
      </p>
    );
  }

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
            checked={estado === "ligado"}
            disabled={pendente || estado === "a-ver" || estado === "bloqueado"}
            onChange={(e) => mudar(e.target.checked)}
          />
          <span className={styles.trilho} aria-hidden="true">
            <span className={styles.bola}></span>
          </span>
        </span>
      </label>
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
