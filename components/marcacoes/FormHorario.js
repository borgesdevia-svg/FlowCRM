"use client";
// Horário das marcações online (página Marcações, só administradores):
// ligar/desligar a página pública, dias da semana, horas, duração, antecedência e até quando.
// Envia-se o formulário à mão (como nas Automações) para o React não o limpar depois de guardar.

import { useActionState, useState, useTransition } from "react";
import { guardarHorario } from "@/lib/acoes/marcacoes";
import { DURACOES, MAX_TEXTO_MARCACOES, MAX_TITULO_MARCACOES, NOMES_DIAS, TEXTOS_MARCACOES } from "@/lib/marcacoes";
import styles from "./FormHorario.module.css";

// segunda primeiro, domingo no fim (como num calendário português)
const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];

export default function FormHorario({ inicial }) {
  const [estado, accao, pendente] = useActionState(guardarHorario, {});
  const [ligada, setLigada] = useState(inicial.ligada);
  const [, iniciar] = useTransition();

  function enviar(evento) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    iniciar(() => accao(dados));
  }

  return (
    <form onSubmit={enviar} className={styles.form}>
      <div className={styles.topo}>
        <div>
          <h2 className={styles.titulo}>Aceitar marcações online</h2>
          <p className={styles.texto}>
            Os clientes escolhem um dia e uma hora livres na página de marcações. Cada marcação cria o lead (se ainda
            não existir), uma tarefa para o dia e um aviso para o responsável.
          </p>
        </div>
        <label className={styles.interruptor}>
          <input type="checkbox" role="switch" name="ligada" checked={ligada} onChange={(e) => setLigada(e.target.checked)} />
          <span className={styles.trilho} aria-hidden="true">
            <span className={styles.bola} />
          </span>
          <span className="so-leitores">Aceitar marcações online</span>
        </label>
      </div>

      <fieldset className={styles.grupo}>
        <legend>Dias da semana</legend>
        <div className={styles.dias}>
          {ORDEM_DIAS.map((d) => (
            <label key={d} className={styles.dia}>
              <input type="checkbox" name="dias" value={d} defaultChecked={inicial.dias.includes(d)} />
              <span>{NOMES_DIAS[d].slice(0, 3)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.linhas}>
        <div className="campo">
          <label htmlFor="h-inicio">Das</label>
          <input id="h-inicio" type="time" name="hora_inicio" step={300} defaultValue={inicial.hora_inicio} required />
        </div>
        <div className="campo">
          <label htmlFor="h-fim">Até às</label>
          <input id="h-fim" type="time" name="hora_fim" step={300} defaultValue={inicial.hora_fim} required />
        </div>
        <div className="campo">
          <label htmlFor="h-duracao">Cada marcação dura</label>
          <select id="h-duracao" name="duracao" defaultValue={inicial.duracao}>
            {DURACOES.map((d) => (
              <option key={d} value={d}>
                {d < 60 ? `${d} minutos` : d === 60 ? "1 hora" : d === 90 ? "1 hora e meia" : "2 horas"}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="h-antecedencia">Pelo menos com (horas)</label>
          <input id="h-antecedencia" type="number" name="antecedencia_horas" min={0} max={168} defaultValue={inicial.antecedencia_horas} required />
        </div>
        <div className="campo">
          <label htmlFor="h-frente">Até quantos dias à frente</label>
          <input id="h-frente" type="number" name="dias_frente" min={1} max={90} defaultValue={inicial.dias_frente} required />
        </div>
      </div>

      {/* o que o cliente lê no topo da página de marcações (vazio = o texto padrão) */}
      <fieldset className={styles.grupo}>
        <legend>Página de marcações</legend>
        <div className={styles.textos}>
          <div className="campo">
            <label htmlFor="h-titulo">Título</label>
            <input
              id="h-titulo"
              name="titulo"
              maxLength={MAX_TITULO_MARCACOES}
              defaultValue={inicial.titulo ?? ""}
              placeholder={TEXTOS_MARCACOES.titulo}
            />
          </div>
          <div className="campo">
            <label htmlFor="h-texto">Texto</label>
            <textarea
              id="h-texto"
              name="texto"
              rows={2}
              maxLength={MAX_TEXTO_MARCACOES}
              defaultValue={inicial.texto ?? ""}
              placeholder={TEXTOS_MARCACOES.texto(inicial.duracao)}
            />
          </div>
        </div>
      </fieldset>

      <div className={styles.rodape}>
        <p className={estado.erro ? styles.erro : styles.sucesso} role="status">
          {estado.erro ?? estado.sucesso ?? ""}
        </p>
        <button type="submit" className="botao" disabled={pendente}>
          {pendente ? "A guardar…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
