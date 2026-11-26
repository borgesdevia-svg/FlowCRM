"use client";
// Avisos de leads novos com o FlowCRM ABERTO (modo "aba" do interruptor em A minha conta).
// Serve para os browsers que não deixam receber avisos com o CRM fechado (Brave com a opção
// desligada, Vivaldi, …): de minuto a minuto pergunta à base de dados se chegaram leads novos
// pelo formulário e, se sim, mostra um aviso do sistema. Não precisa do serviço de avisos do browser.
// O RLS decide o que se vê: o admin é avisado dos leads da empresa, o comercial só dos seus.
// Não desenha nada no ecrã.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { criarClienteBrowser } from "@/lib/supabase/cliente";

export const CHAVE_AVISOS_ABA = "flowcrm_avisos_aba"; // "1" = ligado neste browser
const CHAVE_ULTIMO = "flowcrm_avisos_ultimo"; // data do último lead já avisado (partilhada entre abas)
const INTERVALO = 60 * 1000; // 1 minuto (com a aba em segundo plano o browser não deixa menos)

async function mostrarAviso(titulo, texto, url) {
  // no Android só os avisos do service worker funcionam; no PC qualquer um serve
  const reg = await navigator.serviceWorker?.getRegistration?.();
  if (reg) {
    await reg.showNotification(titulo, { body: texto, icon: "/icones/icone-192.png", data: { url }, tag: url });
  } else {
    const aviso = new Notification(titulo, { body: texto, icon: "/icones/icone-192.png", tag: url });
    aviso.onclick = () => {
      window.focus();
      window.location.href = url;
    };
  }
}

export default function VigiaLeads() {
  const router = useRouter();

  useEffect(() => {
    if (!("Notification" in window)) return;
    const supabase = criarClienteBrowser();
    // começa "agora": os leads que já existiam não dão aviso
    if (!localStorage.getItem(CHAVE_ULTIMO)) localStorage.setItem(CHAVE_ULTIMO, new Date().toISOString());

    async function verificar() {
      if (localStorage.getItem(CHAVE_AVISOS_ABA) !== "1" || Notification.permission !== "granted") {
        // desligado: avança a data, para não avisar de tudo o que chegou entretanto quando voltar a ligar
        localStorage.setItem(CHAVE_ULTIMO, new Date().toISOString());
        return;
      }
      const desde = localStorage.getItem(CHAVE_ULTIMO);
      const { data: novos } = await supabase
        .from("clientes")
        .select("id, nome, criado_em")
        .eq("origem", "formulario")
        .gt("criado_em", desde)
        .order("criado_em", { ascending: true })
        .limit(5);
      if (!novos?.length) return;

      // outra aba pode ter avisado entretanto: só avisa se a data guardada não mudou
      if (localStorage.getItem(CHAVE_ULTIMO) !== desde) return;
      localStorage.setItem(CHAVE_ULTIMO, novos.at(-1).criado_em);

      for (const lead of novos) {
        await mostrarAviso(`Lead novo: ${lead.nome}`, "Chegou pelo formulário.", `/painel/clientes/${lead.id}`);
      }
      router.refresh(); // atualiza os números e a lista da página aberta
    }

    const id = setInterval(() => verificar().catch(() => {}), INTERVALO);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
