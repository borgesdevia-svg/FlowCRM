"use client";
// Botão "Email" da ficha do lead e do modo fila.
// Um clique faz duas coisas:
//  1. abre o Gmail num separador novo, já na janela de escrever, com o email do lead no "Para"
//     e o texto pré-escrito da pessoa (A minha conta › Definições de e-mail), já preenchido;
//  2. copia o email do lead, para o poder colar noutro programa (Outlook, etc.) se for preciso.
// Não envia nada pelo CRM: a pessoa acaba de escrever e envia a mensagem no próprio Gmail.

import { useEffect, useRef, useState } from "react";
import Icone from "@/components/Icone";
import { linkGmail, preencherTextoEmail } from "@/lib/linkEmail";
import styles from "./BotaoEmail.module.css";

export default function BotaoEmail({ email, nome, empresa, eu, modelo, className }) {
  const [copiado, setCopiado] = useState(false);
  const temporizador = useRef(null);
  const link = () => linkGmail(email, preencherTextoEmail(modelo, { nome, empresa, eu }));

  // ao sair da página, cancela o temporizador que esconde o aviso
  useEffect(() => () => clearTimeout(temporizador.current), []);

  // o link abre-se sozinho (é um <a target="_blank">). Antes disso:
  //  - o link é refeito no momento do clique, para o "Bom dia/Boa tarde" bater com a hora;
  //  - o email do lead é copiado.
  async function aoClicar(evento) {
    evento.currentTarget.href = link();
    try {
      await navigator.clipboard.writeText(email);
      setCopiado(true);
      clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => setCopiado(false), 2500);
    } catch {
      // sem permissão para copiar (ex.: browser antigo): o Gmail abre na mesma
    }
  }

  return (
    <>
      <a
        href={link()}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={aoClicar}
        title="Abrir no Gmail (o email também fica copiado)"
        suppressHydrationWarning // a saudação pode mudar entre o servidor e o browser
      >
        <Icone nome="email" tamanho={15} />
        {email}
      </a>
      <span className={styles.copiado} role="status">
        {copiado ? "Email copiado" : ""}
      </span>
    </>
  );
}
