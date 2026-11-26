"use client";
// Cancelar uma marcação em dois toques: "Cancelar" e depois "Sim, cancelar".
// Assim um toque sem querer (no telemóvel) não apaga a reunião de ninguém.

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { cancelarMarcacao } from "@/lib/acoes/marcacoes";
import styles from "./BotaoCancelarMarcacao.module.css";

function Confirmar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={styles.confirmar} disabled={pending}>
      {pending ? "A cancelar…" : "Sim, cancelar"}
    </button>
  );
}

export default function BotaoCancelarMarcacao({ id }) {
  const [aConfirmar, setAConfirmar] = useState(false);

  if (!aConfirmar) {
    return (
      <button type="button" className={styles.cancelar} onClick={() => setAConfirmar(true)}>
        Cancelar
      </button>
    );
  }

  return (
    <form action={cancelarMarcacao} className={styles.confirmacao}>
      <input type="hidden" name="id" value={id} />
      <Confirmar />
      <button type="button" className={styles.cancelar} onClick={() => setAConfirmar(false)}>
        Não
      </button>
    </form>
  );
}
