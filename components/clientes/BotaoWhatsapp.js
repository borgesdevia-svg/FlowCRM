"use client";
// Botão "WhatsApp" da ficha do lead.
// Abre uma janela com mensagens prontas (o nome do lead e da empresa já preenchidos),
// a pessoa ajusta o texto e carrega em "Abrir no WhatsApp": abre a conversa com a mensagem
// escrita (app no telemóvel, WhatsApp Web no computador) e a mensagem fica no histórico.

import { useRef, useState } from "react";
import Icone from "@/components/Icone";
import { registarWhatsapp } from "@/lib/acoes/interacoes";
import { MAX_MENSAGEM_WHATSAPP, MODELOS_WHATSAPP, linkWhatsapp, preencherModelo } from "@/lib/whatsapp";
import styles from "./BotaoWhatsapp.module.css";

export default function BotaoWhatsapp({ clienteId, nome, telefone, empresa, eu, className }) {
  const dialogo = useRef(null);
  const dadosModelo = { nome, empresa, eu };
  const [modelo, setModelo] = useState(MODELOS_WHATSAPP[0].chave);
  const [texto, setTexto] = useState(() => preencherModelo(MODELOS_WHATSAPP[0].texto, dadosModelo));
  const [erro, setErro] = useState("");

  // sem número válido não há WhatsApp
  if (!linkWhatsapp(telefone)) return null;
  const link = linkWhatsapp(telefone, texto.trim());

  function escolher(m) {
    setModelo(m.chave);
    setTexto(preencherModelo(m.texto, dadosModelo));
  }

  // o link abre-se sozinho (é um <a target="_blank">); aqui só se guarda no histórico
  async function registar(evento) {
    if (!texto.trim()) {
      evento.preventDefault();
      setErro("Escreve a mensagem.");
      return;
    }
    dialogo.current?.close();
    const resposta = await registarWhatsapp(clienteId, texto);
    if (resposta?.erro) setErro(resposta.erro);
  }

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          setErro("");
          dialogo.current?.showModal();
        }}
      >
        <Icone nome="conversa" tamanho={15} />
        WhatsApp
      </button>
      {erro && <span className={styles.erroFora}>{erro}</span>}

      <dialog
        ref={dialogo}
        className={styles.dialogo}
        aria-labelledby={`whatsapp-${clienteId}`}
        onClick={(e) => e.target === dialogo.current && dialogo.current.close()}
      >
        <div className={styles.caixa}>
          <header className={styles.topo}>
            <span className={styles.icone} aria-hidden="true">
              <Icone nome="conversa" tamanho={20} />
            </span>
            <div>
              <h2 id={`whatsapp-${clienteId}`}>Mensagem para {nome}</h2>
              <p>Escolhe uma mensagem pronta e ajusta o que quiseres.</p>
            </div>
          </header>

          <div className={styles.modelos} role="radiogroup" aria-label="Mensagens prontas">
            {MODELOS_WHATSAPP.map((m) => (
              <button
                key={m.chave}
                type="button"
                role="radio"
                aria-checked={modelo === m.chave}
                className={styles.modelo}
                onClick={() => escolher(m)}
              >
                {m.nome}
              </button>
            ))}
          </div>

          <div className="campo">
            <label htmlFor={`whatsapp-texto-${clienteId}`}>Mensagem</label>
            <textarea
              id={`whatsapp-texto-${clienteId}`}
              rows={5}
              maxLength={MAX_MENSAGEM_WHATSAPP}
              value={texto}
              onChange={(e) => {
                setModelo("");
                setErro("");
                setTexto(e.target.value);
              }}
            />
          </div>
          {erro && <p className={styles.erro}>{erro}</p>}
          <p className={styles.nota}>A mensagem fica guardada no histórico deste lead.</p>

          <div className={styles.botoes}>
            <button type="button" className="botao botao-secundario" onClick={() => dialogo.current?.close()}>
              Cancelar
            </button>
            <a href={link} target="_blank" rel="noopener noreferrer" className={`botao ${styles.abrir}`} onClick={registar}>
              <Icone nome="conversa" tamanho={16} />
              Abrir no WhatsApp
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}
