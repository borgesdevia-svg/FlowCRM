"use client";
// Sino de notificações do menu lateral.
// As tarefas chegam já prontas do servidor (o layout faz a consulta);
// este componente só trata de abrir e fechar a lista, por isso é de cliente.
//
// Mostra as MINHAS tarefas por fazer que estão em atraso ou que acabam hoje.
// Aos administradores mostra também os clientes que chegaram SEM responsável, com uma
// bolinha que muda de cor com o tempo de espera (verde, amarelo, vermelho) e a lista
// "Entregar a…" para os atribuir ali mesmo.
// O número só desce quando a tarefa é concluída (não há "marcar como lida").
// Só chegam as primeiras 5; "total" diz quantas há, e a lista inteira está
// na página /painel/notificacoes.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatarDiaCurto, tempoRelativo, urgenciaSemResponsavel } from "@/lib/datas";
import AtribuirCliente from "@/components/painel/AtribuirCliente";
import Icone from "@/components/Icone";
import styles from "./Sino.module.css";

export default function Sino({ tarefas, semResponsavel = [], nSemResponsavel = 0, equipa = [], total, hoje }) {
  const [aberto, setAberto] = useState(false);
  const refContentor = useRef(null);

  // fechar ao clicar fora ou com a tecla Esc
  useEffect(() => {
    if (!aberto) return;
    function clique(e) {
      if (!refContentor.current?.contains(e.target)) setAberto(false);
    }
    function tecla(e) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", clique);
    window.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", clique);
      window.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  return (
    <div ref={refContentor} className={styles.sino} data-tutorial="sino">
      <button
        type="button"
        className={aberto ? `${styles.botao} ${styles.botaoAberto}` : styles.botao}
        onClick={() => setAberto(!aberto)}
        aria-expanded={aberto}
        aria-label={total ? `Notificações: ${total} para tratar` : "Notificações"}
        title="Notificações"
      >
        <Icone nome="sino" tamanho={18} />
        {/* bolinha com o número (só aparece se houver alguma coisa) */}
        {total > 0 && <span className={styles.numero}>{total > 9 ? "9+" : total}</span>}
      </button>

      {aberto && (
        <div className={styles.painel}>
          <p className={styles.titulo}>
            Notificações <span>{total}</span>
          </p>

          {total === 0 ? (
            <p className={styles.nada}>Está tudo em dia. Sem tarefas atrasadas nem para hoje.</p>
          ) : (
            <>
            {semResponsavel.length > 0 && (
              <>
                <p className={styles.subtitulo}>Clientes sem responsável · {nSemResponsavel}</p>
                <ul className={styles.lista}>
                  {semResponsavel.map((c) => (
                    <li key={c.id} className={styles.itemSemResponsavel}>
                      <i className={styles[`urgencia_${urgenciaSemResponsavel(c.criado_em)}`]}></i>
                      <span className={styles.texto}>
                        <Link href={`/painel/clientes/${c.id}`} onClick={() => setAberto(false)}>
                          <strong>{c.nome}</strong>
                        </Link>
                        <small>chegou {tempoRelativo(c.criado_em)}</small>
                      </span>
                      <AtribuirCliente clienteId={c.id} clienteNome={c.nome} equipa={equipa} />
                    </li>
                  ))}
                </ul>
                {tarefas.length > 0 && <p className={styles.subtitulo}>As tuas tarefas</p>}
              </>
            )}
            <ul className={styles.lista}>
              {tarefas.map((t) => {
                const atrasada = t.data_limite < hoje; // datas AAAA-MM-DD comparam-se como texto
                return (
                  <li key={t.id}>
                    {/* leva à ficha do cliente, onde a tarefa pode ser concluída */}
                    <Link
                      href={`/painel/clientes/${t.cliente_id}`}
                      className={styles.item}
                      onClick={() => setAberto(false)}
                    >
                      <i className={atrasada ? styles.pontoAtrasada : styles.pontoHoje}></i>
                      <span className={styles.texto}>
                        <strong>{t.titulo}</strong>
                        <small>
                          {t.clientes?.nome ?? "Cliente"} ·{" "}
                          <em className={atrasada ? styles.atrasada : styles.hoje}>
                            {atrasada ? `atrasada desde ${formatarDiaCurto(t.data_limite)}` : "acaba hoje"}
                          </em>
                        </small>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            </>
          )}

          <Link href="/painel/notificacoes" className={styles.verTodas} onClick={() => setAberto(false)}>
            {total > tarefas.length + semResponsavel.length ? `Ver todas (${total})` : "Abrir notificações"}
          </Link>
        </div>
      )}
    </div>
  );
}
