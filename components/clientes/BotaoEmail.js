"use client";
// Botão "Email" da ficha do lead (irmão do botão WhatsApp).
// Abre uma janela com mensagens prontas (assunto e texto, com o nome do lead e da empresa),
// a pessoa ajusta e carrega em "Abrir no email": abre o programa de email de quem clica
// com tudo escrito, e a mensagem fica no histórico do lead.

import { useRef, useState } from "react";
import Icone from "@/components/Icone";
import { registarEmail } from "@/lib/acoes/interacoes";
import { MAX_ASSUNTO_EMAIL, MAX_TEXTO_EMAIL, MODELOS_EMAIL, linkEmail, preencherEmail } from "@/lib/emailModelos";
// mesma janela do WhatsApp, mas sem o verde do WhatsApp (botão normal do CRM)
import styles from "./BotaoWhatsapp.module.css";

export default function BotaoEmail({ clienteId, nome, email, empresa, eu, className }) {
  const dialogo = useRef(null);
  const dados = { nome, empresa, eu };
  const [modelo, setModelo] = useState(MODELOS_EMAIL[0].chave);
  const [mensagem, setMensagem] = useState(() => preencherEmail(MODELOS_EMAIL[0], dados));
  const [erro, setErro] = useState("");
  const link = linkEmail(email, mensagem.assunto.trim(), mensagem.texto.trim());

  function escolher(m) {
    setModelo(m.chave);
    setMensagem(preencherEmail(m, dados));
  }

  function mudar(campo, valor) {
    setModelo("");
    setErro("");
    setMensagem((atual) => ({ ...atual, [campo]: valor }));
  }

  // o link abre-se sozinho (é um <a href="mailto:">); aqui só se guarda no histórico
  async function registar(evento) {
    if (!mensagem.texto.trim()) {
      evento.preventDefault();
      setErro("Escreve a mensagem.");
      return;
    }
    dialogo.current?.close();
    const resposta = await registarEmail(clienteId, mensagem.assunto, mensagem.texto);
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
        <Icone nome="email" tamanho={15} />
        {email}
      </button>
      {erro && <span className={styles.erroFora}>{erro}</span>}

      <dialog
        ref={dialogo}
        className={styles.dialogo}
        aria-labelledby={`email-${clienteId}`}
        onClick={(e) => e.target === dialogo.current && dialogo.current.close()}
      >
        <div className={styles.caixa}>
          <header className={styles.topo}>
            <div>
              <h2 id={`email-${clienteId}`}>Email para {nome}</h2>
              <p>Escolhe uma mensagem pronta e ajusta o que quiseres.</p>
            </div>
          </header>

          <div className={styles.modelos} role="radiogroup" aria-label="Mensagens prontas">
            {MODELOS_EMAIL.map((m) => (
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
            <label htmlFor={`email-assunto-${clienteId}`}>Assunto</label>
            <input
              id={`email-assunto-${clienteId}`}
              maxLength={MAX_ASSUNTO_EMAIL}
              value={mensagem.assunto}
              onChange={(e) => mudar("assunto", e.target.value)}
            />
          </div>
          <div className="campo">
            <label htmlFor={`email-texto-${clienteId}`}>Mensagem</label>
            <textarea
              id={`email-texto-${clienteId}`}
              rows={8}
              maxLength={MAX_TEXTO_EMAIL}
              value={mensagem.texto}
              onChange={(e) => mudar("texto", e.target.value)}
            />
          </div>
          {erro && <p className={styles.erro}>{erro}</p>}
          <p className={styles.nota}>Abre no teu programa de email (Gmail, Outlook…). A mensagem fica no histórico deste lead.</p>

          <div className={styles.botoes}>
            <button type="button" className="botao botao-secundario" onClick={() => dialogo.current?.close()}>
              Cancelar
            </button>
            <a href={link} className="botao" onClick={registar}>
              <Icone nome="email" tamanho={16} />
              Abrir no email
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}
