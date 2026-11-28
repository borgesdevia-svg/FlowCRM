"use client";
// Formulário da página Automações: um interruptor por automação e, quando está
// ligada, os ajustes dela (quem entra na roda, quantos dias até um cliente estar parado).
// É de cliente porque os ajustes aparecem e desaparecem ao ligar/desligar.

import { useActionState, useState, useTransition } from "react";
import { guardarAutomacoes } from "@/lib/acoes/automacoes";
import styles from "./FormAutomacoes.module.css";

// interruptor: é uma caixa de seleção normal (vai no formulário como "on"),
// desenhada como um interruptor. role="switch" diz aos leitores de ecrã o que é.
function Interruptor({ nome, ligado, mudar, rotulo }) {
  return (
    <label className={styles.interruptor}>
      <input type="checkbox" role="switch" name={nome} checked={ligado} onChange={(e) => mudar(e.target.checked)} />
      <span className={styles.trilho} aria-hidden="true">
        <span className={styles.bola} />
      </span>
      <span className="so-leitores">{rotulo}</span>
    </label>
  );
}

export default function FormAutomacoes({ inicial, equipa }) {
  const [estado, accao, pendente] = useActionState(guardarAutomacoes, {});
  const [tarefa, setTarefa] = useState(inicial.tarefa_ligada);
  const [distribuir, setDistribuir] = useState(inicial.distribuir_ligada);
  const [parado, setParado] = useState(inicial.parado_ligado);
  const [, iniciar] = useTransition();

  // Com <form action={...}>, o React LIMPA o formulário depois de guardar: os interruptores
  // voltavam ao estado em que estavam quando a página abriu (os que estavam desligados
  // desligavam-se outra vez). Enviando nós o formulário aqui, nada é limpo.
  function enviar(evento) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    iniciar(() => accao(dados));
  }

  return (
    <form onSubmit={enviar} className={styles.form}>
      <ul className={styles.lista}>
        {/* 1) tarefa automática */}
        <li className={styles.item}>
          <div className={styles.topo}>
            <div>
              <h2 className={styles.titulo}>Tarefa para cada lead novo</h2>
              <p className={styles.texto}>
                Quando entra um lead novo, o responsável recebe a tarefa “Contactar” para hoje. Se o lead
                chegar sem responsável, os administradores recebem um aviso para o entregar a alguém.
              </p>
            </div>
            <Interruptor nome="tarefa_ligada" ligado={tarefa} mudar={setTarefa} rotulo="Tarefa para cada lead novo" />
          </div>
        </li>

        {/* 2) distribuir leads */}
        <li className={styles.item}>
          <div className={styles.topo}>
            <div>
              <h2 className={styles.titulo}>Distribuir os leads à vez</h2>
              <p className={styles.texto}>
                Ao aceitares um lead na Entrada, a opção &quot;À vez pela equipa&quot; vem escolhida: o lead vai para a
                próxima pessoa da lista, à vez, sem teres de pensar em quem fica com ele.
              </p>
            </div>
            <Interruptor
              nome="distribuir_ligada"
              ligado={distribuir}
              mudar={setDistribuir}
              rotulo="Distribuir os leads à vez"
            />
          </div>

          {/* as caixas ficam sempre no formulário (escondidas quando está desligado),
              para não se perder a escolha ao desligar e voltar a ligar */}
          <fieldset className={styles.ajustes} hidden={!distribuir}>
            <legend className={styles.legenda}>Quem recebe leads</legend>
            <div className={styles.pessoas}>
              {equipa.map((p) => (
                <label key={p.id} className={styles.pessoa}>
                  <input type="checkbox" name="roda" value={p.id} defaultChecked={inicial.roda.includes(p.id)} />
                  <span>{p.nome}</span>
                  <small>{p.admin ? "Administrador" : "Comercial"}</small>
                </label>
              ))}
            </div>
          </fieldset>
        </li>

        {/* 3) cliente parado */}
        <li className={styles.item}>
          <div className={styles.topo}>
            <div>
              <h2 className={styles.titulo}>Avisar quando um lead fica parado</h2>
              <p className={styles.texto}>
                Todos os dias às 8h, o CRM procura leads Novos ou Em negociação onde não aconteceu nada (sem notas,
                sem mudar de fase e sem tarefas por fazer). O responsável recebe a tarefa “Retomar contacto”.
              </p>
            </div>
            <Interruptor nome="parado_ligado" ligado={parado} mudar={setParado} rotulo="Avisar quando um lead fica parado" />
          </div>

          <div className={styles.ajustes} hidden={!parado}>
            <label className={styles.dias}>
              Parado ao fim de
              <input
                type="number"
                name="parado_dias"
                min={1}
                max={90}
                defaultValue={inicial.parado_dias}
                required
                className={styles.campoDias}
              />
              dias
            </label>
          </div>
        </li>
      </ul>

      <div className={styles.rodape}>
        <p className={estado.erro ? styles.erro : styles.sucesso} role="status">
          {estado.erro ?? estado.sucesso ?? ""}
        </p>
        <button type="submit" className="botao" disabled={pendente}>
          {pendente ? "A guardar…" : "Guardar alterações"}
        </button>
      </div>
    </form>
  );
}
