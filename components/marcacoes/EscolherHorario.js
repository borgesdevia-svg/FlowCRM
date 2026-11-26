"use client";
// Página pública de marcações (/m/[slug]): 1) escolher o dia, 2) a hora, 3) deixar o contacto.
// Os dias e as horas livres vêm já calculados do servidor (lib/marcacoes.js); ao confirmar,
// o servidor volta a confirmar que a hora está livre (Server Action marcar).
// Se entretanto alguém ficou com essa hora, pede-se outra e a lista é atualizada (router.refresh).

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { marcar } from "@/lib/acoes/marcacoes";
import { FUSO, textoMarcacao } from "@/lib/marcacoes";
import styles from "./EscolherHorario.module.css";

// "2026-12-02" -> { semana: "qua", numero: "2", mes: "dez" } (meio-dia UTC: nunca muda de dia)
function partesDoDia(dia) {
  const data = new Date(`${dia}T12:00:00Z`);
  const formato = (opcoes) => new Intl.DateTimeFormat("pt-PT", { timeZone: FUSO, ...opcoes }).format(data).replace(".", "");
  return { semana: formato({ weekday: "short" }), numero: formato({ day: "numeric" }), mes: formato({ month: "short" }) };
}

export default function EscolherHorario({ slug, dias, nomeEmpresa }) {
  const router = useRouter();
  const [estado, accao, pendente] = useActionState(marcar, {});
  const [dia, setDia] = useState(dias[0]?.dia ?? "");
  const [inicio, setInicio] = useState("");
  const valores = estado.valores ?? {};
  const erros = estado.erros ?? {};

  // a hora escolhida foi ocupada entretanto: limpa a escolha (já, durante o render)...
  const [ultimaResposta, setUltimaResposta] = useState(estado);
  if (estado !== ultimaResposta) {
    setUltimaResposta(estado);
    if (estado.recarregar) setInicio("");
  }
  // ...e pede ao servidor as horas livres atualizadas (fora do render: é um efeito)
  useEffect(() => {
    if (estado.recarregar) router.refresh();
  }, [estado, router]);

  if (estado.sucesso) {
    return (
      <div className={styles.feito} role="status">
        <span className={styles.visto} aria-hidden="true"></span>
        <h2>Marcação confirmada</h2>
        {estado.texto && (
          <p>
            Ficou marcado para <strong>{estado.texto}</strong>. A {nomeEmpresa} conta contigo. Se precisares de mudar,
            contacta a empresa.
          </p>
        )}
      </div>
    );
  }

  if (!dias.length) {
    return (
      <p className={styles.vazio}>
        Não há horas livres nos próximos dias. Contacta a {nomeEmpresa} diretamente para combinar outra data.
      </p>
    );
  }

  const horarios = dias.find((d) => d.dia === dia)?.horarios ?? [];

  return (
    <form action={accao} className={styles.formulario} noValidate>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="inicio" value={inicio} />
      {/* campo armadilha para robôs: escondido de pessoas e de leitores de ecrã */}
      <div className={styles.armadilha} aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {estado.mensagem && (
        <p className="alerta alerta-erro" role="alert">
          {estado.mensagem}
        </p>
      )}

      <fieldset className={styles.passo}>
        <legend>Dia</legend>
        <div className={styles.dias} role="radiogroup" aria-label="Dia">
          {dias.map((d) => {
            const p = partesDoDia(d.dia);
            return (
              <button
                key={d.dia}
                type="button"
                role="radio"
                aria-checked={dia === d.dia}
                aria-label={`${p.semana} ${p.numero} ${p.mes}`}
                className={styles.dia}
                onClick={() => {
                  setDia(d.dia);
                  setInicio("");
                }}
              >
                <small>{p.semana}</small>
                <strong>{p.numero}</strong>
                <small>{p.mes}</small>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className={styles.passo}>
        <legend>Hora</legend>
        <div className={styles.horas} role="radiogroup" aria-label="Hora">
          {horarios.map((h) => (
            <button
              key={h.inicio}
              type="button"
              role="radio"
              aria-checked={inicio === h.inicio}
              className={styles.hora}
              onClick={() => setInicio(h.inicio)}
            >
              {h.hora}
            </button>
          ))}
        </div>
        {erros.inicio && <p className="erro-campo">{erros.inicio}</p>}
      </fieldset>

      {/* os dados só aparecem depois de escolher a hora: um passo de cada vez */}
      {inicio && (
        <>
          <p className={styles.resumo}>
            <span>A tua marcação</span>
            <strong>{textoMarcacao(inicio)}</strong>
          </p>

          <div className="campo">
            <label htmlFor="m-nome">Nome</label>
            <input id="m-nome" name="nome" autoComplete="name" maxLength={150} defaultValue={valores.nome} aria-invalid={!!erros.nome} />
            {erros.nome && <p className="erro-campo">{erros.nome}</p>}
          </div>
          <div className="campo">
            <label htmlFor="m-email">Email</label>
            <input id="m-email" name="email" type="email" autoComplete="email" maxLength={254} defaultValue={valores.email} aria-invalid={!!erros.email} />
            {erros.email && <p className="erro-campo">{erros.email}</p>}
          </div>
          <div className="campo">
            <label htmlFor="m-telefone">Telefone</label>
            <input id="m-telefone" name="telefone" type="tel" autoComplete="tel" maxLength={20} defaultValue={valores.telefone} aria-invalid={!!erros.telefone} />
            {erros.telefone && <p className="erro-campo">{erros.telefone}</p>}
          </div>
          <div className="campo">
            <label htmlFor="m-nota">
              Queres dizer alguma coisa? <span className={styles.opcional}>(opcional)</span>
            </label>
            <textarea id="m-nota" name="nota" rows={3} maxLength={1000} defaultValue={valores.nota} />
          </div>

          <button type="submit" className={`botao ${styles.confirmar}`} disabled={pendente}>
            {pendente ? "A marcar..." : "Confirmar marcação"}
          </button>
          <p className={styles.privacidade}>Os teus dados só são usados para esta marcação e para te contactarmos.</p>
        </>
      )}
    </form>
  );
}
