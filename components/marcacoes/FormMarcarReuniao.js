"use client";
// "Marcar reunião" na ficha do lead: escolher o dia e a hora livres (as mesmas da página
// pública, calculadas no servidor) e, se quiser, uma nota. O servidor volta a confirmar a hora.

import { useActionState, useState } from "react";
import { marcarPeloPainel } from "@/lib/acoes/marcacoes";
import { FUSO } from "@/lib/marcacoes";
import styles from "./FormMarcarReuniao.module.css";

const formatoDia = new Intl.DateTimeFormat("pt-PT", { timeZone: FUSO, weekday: "short", day: "numeric", month: "short" });

export default function FormMarcarReuniao({ clienteId, dias }) {
  const [estado, accao, pendente] = useActionState(marcarPeloPainel, {});
  const [diaEscolhido, setDia] = useState(dias[0]?.dia ?? "");
  // depois de marcar, o dia pode ficar sem horas livres: passa para o primeiro que ainda tem
  const dia = dias.some((d) => d.dia === diaEscolhido) ? diaEscolhido : (dias[0]?.dia ?? "");
  const horarios = dias.find((d) => d.dia === dia)?.horarios ?? [];

  if (!dias.length) {
    return <p className={styles.vazio}>Não há horas livres no horário da empresa nos próximos 90 dias.</p>;
  }

  return (
    <form action={accao} className={styles.form}>
      <input type="hidden" name="cliente_id" value={clienteId} />
      <div className={styles.linha}>
        <div className="campo">
          <label htmlFor="mr-dia">Dia</label>
          <select id="mr-dia" value={dia} onChange={(e) => setDia(e.target.value)}>
            {dias.map((d) => (
              <option key={d.dia} value={d.dia}>
                {formatoDia.format(new Date(`${d.dia}T12:00:00Z`)).replace(/\./g, "")}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="mr-hora">Hora</label>
          {/* key: ao mudar de dia, a hora volta à primeira livre desse dia */}
          <select id="mr-hora" name="inicio" key={dia} defaultValue={horarios[0]?.inicio}>
            {horarios.map((h) => (
              <option key={h.inicio} value={h.inicio}>
                {h.hora}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="campo">
        <label htmlFor="mr-nota">
          Nota <span className={styles.opcional}>(opcional)</span>
        </label>
        <input id="mr-nota" name="nota" maxLength={1000} placeholder="Ex.: mostrar a proposta" />
      </div>
      <div className={styles.rodape}>
        <p className={estado.erro ? styles.erro : styles.sucesso} role="status">
          {estado.erro ?? estado.sucesso ?? ""}
        </p>
        <button type="submit" className="botao botao-secundario" disabled={pendente}>
          {pendente ? "A marcar…" : "Marcar reunião"}
        </button>
      </div>
    </form>
  );
}
