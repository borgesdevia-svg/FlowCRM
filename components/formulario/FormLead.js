"use client";
// Formulário que o visitante preenche na página pública da empresa.

import { useActionState } from "react";
import { enviarLead } from "@/lib/acoes/formulario";
import styles from "./FormLead.module.css";

export default function FormLead({ slug, nomeEmpresa, perguntas = [] }) {
  const [estado, accao, pendente] = useActionState(enviarLead, {});
  const erros = estado.erros ?? {};
  const valores = estado.valores ?? {};
  const respostas = estado.respostas ?? {};

  // depois de enviar com sucesso, o formulário dá lugar a uma confirmação
  if (estado.sucesso) {
    return (
      <div className={styles.confirmacao} role="status">
        <span className={styles.visto} aria-hidden="true"></span>
        <h2>Pedido enviado</h2>
        <p>Recebemos o teu contacto. {nomeEmpresa} vai responder-te em breve.</p>
      </div>
    );
  }

  return (
    <form action={accao} className={styles.formulario} noValidate>
      <input type="hidden" name="slug" value={slug} />

      {/* campo armadilha para robôs: escondido de pessoas e de leitores de ecrã */}
      <div className={styles.armadilha} aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {estado.mensagem && <p className="alerta alerta-erro" role="alert">{estado.mensagem}</p>}

      <div className="campo">
        <label htmlFor="nome">Nome</label>
        <input id="nome" name="nome" autoComplete="name" defaultValue={valores.nome} aria-invalid={!!erros.nome} />
        {erros.nome && <p className="erro-campo">{erros.nome}</p>}
      </div>

      <div className="campo">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" defaultValue={valores.email} aria-invalid={!!erros.email} />
        {erros.email && <p className="erro-campo">{erros.email}</p>}
      </div>

      <div className="campo">
        <label htmlFor="telefone">
          Telefone <span className={styles.opcional}>(opcional)</span>
        </label>
        <input id="telefone" name="telefone" type="tel" autoComplete="tel" defaultValue={valores.telefone} aria-invalid={!!erros.telefone} />
        {erros.telefone && <p className="erro-campo">{erros.telefone}</p>}
      </div>

      {/* perguntas extra, escolhidas pela empresa em "Personalizar" */}
      {perguntas.map((p) => (
        <Pergunta key={p.id} pergunta={p} valor={respostas[p.id]} erro={erros[`resposta_${p.id}`]} />
      ))}

      <button type="submit" className="botao botao-largo" disabled={pendente}>
        {pendente ? "A enviar..." : "Enviar pedido de contacto"}
      </button>

      <p className={styles.privacidade}>
        Os teus dados só são usados para te contactarmos.
      </p>
    </form>
  );
}

// uma pergunta extra: resposta curta, longa ou escolha entre opções
function Pergunta({ pergunta: p, valor, erro }) {
  const nome = `resposta_${p.id}`;
  const etiqueta = (
    <>
      {p.texto} {!p.obrigatoria && <span className={styles.opcional}>(opcional)</span>}
    </>
  );

  if (p.tipo === "escolha") {
    return (
      <div className="campo">
        <fieldset className={styles.escolha} aria-invalid={!!erro}>
          <legend>{etiqueta}</legend>
          {(p.opcoes ?? []).map((o) => (
            <label key={o} className={styles.opcaoEscolha}>
              <input type="radio" name={nome} value={o} defaultChecked={valor === o} />
              {o}
            </label>
          ))}
        </fieldset>
        {erro && <p className="erro-campo">{erro}</p>}
      </div>
    );
  }

  return (
    <div className="campo">
      <label htmlFor={nome}>{etiqueta}</label>
      {p.tipo === "texto_longo" ? (
        <textarea id={nome} name={nome} rows={4} maxLength={2000} defaultValue={valor} aria-invalid={!!erro} />
      ) : (
        <input id={nome} name={nome} maxLength={500} defaultValue={valor} aria-invalid={!!erro} />
      )}
      {erro && <p className="erro-campo">{erro}</p>}
    </div>
  );
}
