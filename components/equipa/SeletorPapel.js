"use client";
// Muda o papel de um membro (Comercial / Administrador) logo ao escolher.
// Enquanto a alteração é gravada, o seletor fica desligado.

import { useState, useTransition } from "react";
import { mudarPapel } from "@/lib/acoes/equipa";
import styles from "./Equipa.module.css";

export default function SeletorPapel({ id, nome, papel }) {
  const [aGuardar, iniciar] = useTransition();
  const [erro, setErro] = useState("");

  function mudar(evento) {
    const formData = new FormData();
    formData.set("id", id);
    formData.set("papel", evento.target.value);
    setErro("");
    iniciar(async () => {
      const resposta = await mudarPapel(formData);
      if (resposta?.erro) setErro(resposta.erro);
    });
  }

  return (
    <div className={styles.seletor}>
      <select
        value={papel}
        onChange={mudar}
        disabled={aGuardar}
        aria-label={`Papel de ${nome}`}
        className={papel === "admin" ? styles.seletorAdmin : undefined}
      >
        <option value="comercial">Comercial</option>
        <option value="admin">Administrador</option>
      </select>
      {erro && (
        <small role="alert" className={styles.erroPapel}>
          {erro}
        </small>
      )}
    </div>
  );
}
