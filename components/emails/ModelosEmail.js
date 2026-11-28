"use client";
// Lista dos modelos de e-mail da pessoa (página /painel/emails): criar, editar e apagar.
// Sem modelos, mostra 3 sugestões que se adicionam com um clique (só ficam guardadas se a
// pessoa carregar em "Adicionar").

import { useActionState, useState } from "react";
import { criarModelo, editarModelo, apagarModelo } from "@/lib/acoes/emailModelos";
import { LIMITES_MODELO, MAX_MODELOS, SUGESTOES } from "@/lib/emailModelos";
import { VARIAVEIS_EMAIL } from "@/lib/linkEmail";
import styles from "./ModelosEmail.module.css";

function Mensagem({ estado }) {
  if (estado?.erro) return <p className="alerta alerta-erro" role="alert">{estado.erro}</p>;
  if (estado?.sucesso) return <p className="alerta alerta-sucesso" role="status">{estado.sucesso}</p>;
  return null;
}

// formulário de um modelo (criar ou editar)
function FormModelo({ modelo, aoFechar }) {
  const [estado, accao, pendente] = useActionState(modelo ? editarModelo : criarModelo, {});
  const v = estado.valores ?? modelo ?? {};
  const prefixo = modelo ? `m-${modelo.id}` : "m-novo";

  return (
    // key: depois de criar, o formulário volta vazio
    <form action={accao} className={styles.form} key={modelo ? modelo.id : (estado.versao ?? 0)}>
      {modelo && <input type="hidden" name="id" value={modelo.id} />}
      <Mensagem estado={estado} />
      <div className="campo">
        <label htmlFor={`${prefixo}-nome`}>Nome do modelo</label>
        <input id={`${prefixo}-nome`} name="nome" maxLength={LIMITES_MODELO.nome} placeholder="Ex.: Envio de proposta" defaultValue={v.nome ?? ""} required />
      </div>
      <div className="campo">
        <label htmlFor={`${prefixo}-assunto`}>Assunto</label>
        <input id={`${prefixo}-assunto`} name="assunto" maxLength={LIMITES_MODELO.assunto} placeholder="Ex.: Proposta da {empresa}" defaultValue={v.assunto ?? ""} />
      </div>
      <div className="campo">
        <label htmlFor={`${prefixo}-corpo`}>Texto</label>
        <textarea
          id={`${prefixo}-corpo`}
          name="corpo"
          rows={6}
          maxLength={LIMITES_MODELO.corpo}
          placeholder="O texto que vem depois da mensagem do início."
          defaultValue={v.corpo ?? ""}
          required
        />
      </div>
      <p className={styles.ajuda}>Podes usar {VARIAVEIS_EMAIL.map((x) => x.chave).join(", ")}.</p>
      <div className={styles.botoes}>
        <button type="submit" className="botao" disabled={pendente}>
          {pendente ? "A guardar..." : modelo ? "Guardar modelo" : "Criar modelo"}
        </button>
        {aoFechar && (
          <button type="button" className="botao botao-secundario" onClick={aoFechar}>
            Fechar
          </button>
        )}
      </div>
    </form>
  );
}

function Modelo({ modelo }) {
  const [aEditar, setAEditar] = useState(false);
  const [aConfirmar, setAConfirmar] = useState(false);
  const [aApagar, setAApagar] = useState(false);
  const [erro, setErro] = useState("");

  async function apagar() {
    setAApagar(true);
    const r = await apagarModelo(modelo.id);
    if (r?.erro) {
      setErro(r.erro);
      setAApagar(false);
      setAConfirmar(false);
    }
  }

  if (aEditar) {
    return (
      <li>
        <FormModelo modelo={modelo} aoFechar={() => setAEditar(false)} />
      </li>
    );
  }

  return (
    <li>
      <div className={styles.linha}>
        <div className={styles.info}>
          <strong>{modelo.nome}</strong>
          <small>{modelo.assunto || "Sem assunto"}</small>
        </div>
        {aConfirmar ? (
          <span className={styles.confirmacao}>
            <button type="button" className={styles.perigo} onClick={apagar} disabled={aApagar}>
              {aApagar ? "A apagar…" : "Sim, apagar"}
            </button>
            <button type="button" className={styles.acao} onClick={() => setAConfirmar(false)} disabled={aApagar}>
              Não
            </button>
          </span>
        ) : (
          <span className={styles.confirmacao}>
            <button type="button" className={styles.acao} onClick={() => setAEditar(true)}>
              Editar
            </button>
            <button type="button" className={styles.acao} onClick={() => setAConfirmar(true)}>
              Apagar
            </button>
          </span>
        )}
      </div>
      <p className={styles.previa}>{modelo.corpo}</p>
      {erro && <p className="erro-campo" role="alert">{erro}</p>}
    </li>
  );
}

// "Adicionar" uma sugestão: um formulário escondido com os valores da sugestão
function Sugestao({ sugestao }) {
  const [estado, accao, pendente] = useActionState(criarModelo, {});
  return (
    <li>
      <form action={accao} className={styles.linha}>
        <input type="hidden" name="nome" value={sugestao.nome} />
        <input type="hidden" name="assunto" value={sugestao.assunto} />
        <input type="hidden" name="corpo" value={sugestao.corpo} />
        <div className={styles.info}>
          <strong>{sugestao.nome}</strong>
          <small>{sugestao.assunto}</small>
        </div>
        <button type="submit" className={styles.acao} disabled={pendente}>
          {pendente ? "A adicionar…" : "Adicionar"}
        </button>
      </form>
      <p className={styles.previa}>{sugestao.corpo}</p>
      {estado?.erro && <p className="erro-campo" role="alert">{estado.erro}</p>}
    </li>
  );
}

export default function ModelosEmail({ modelos }) {
  const [aCriar, setACriar] = useState(false);

  return (
    <div className={styles.modelos}>
      {modelos.length > 0 ? (
        <ul className={styles.lista}>
          {modelos.map((m) => (
            <Modelo key={m.id} modelo={m} />
          ))}
        </ul>
      ) : (
        <>
          <p className={styles.ajuda}>Ainda não tens modelos. Começa por uma destas sugestões (depois podes mudá-las):</p>
          <ul className={styles.lista}>
            {SUGESTOES.map((s) => (
              <Sugestao key={s.nome} sugestao={s} />
            ))}
          </ul>
        </>
      )}

      {modelos.length >= MAX_MODELOS ? (
        <p className={styles.ajuda}>Chegaste aos {MAX_MODELOS} modelos. Apaga um para criares outro.</p>
      ) : aCriar ? (
        <div className={styles.novo}>
          <h3>Novo modelo</h3>
          <FormModelo aoFechar={() => setACriar(false)} />
        </div>
      ) : (
        <button type="button" className="botao botao-secundario" style={{ alignSelf: "flex-start" }} onClick={() => setACriar(true)}>
          Criar modelo
        </button>
      )}
    </div>
  );
}
