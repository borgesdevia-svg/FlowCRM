"use client";
// Formulário que o visitante preenche na página pública da empresa.
// Também é usado na pré-visualização da página Personalizar (previa = true):
// aí dá para clicar e escrever, mas nunca envia nada.
//
// Props:
//  - perguntas: as perguntas extra da empresa (tipos em lib/formulario.js)
//  - obrigado: { texto, botaoTexto, botaoLink } — o que aparece depois de enviar
//  - mostrarObrigado: na pré-visualização, mostra já o ecrã "depois de enviar"

import { useActionState } from "react";
import { enviarLead } from "@/lib/acoes/formulario";
import { TEXTOS_PADRAO } from "@/lib/formulario";
import styles from "./FormLead.module.css";

export default function FormLead({ slug, nomeEmpresa, perguntas = [], obrigado = {}, previa = false, mostrarObrigado = false }) {
  const [estado, accao, pendente] = useActionState(enviarLead, {});
  const erros = estado.erros ?? {};
  const valores = estado.valores ?? {};
  const respostas = estado.respostas ?? {};

  // depois de enviar com sucesso, o formulário dá lugar à mensagem da empresa
  if (estado.sucesso || mostrarObrigado) {
    return (
      <div className={styles.confirmacao} role="status">
        <span className={styles.visto} aria-hidden="true"></span>
        <h2>Pedido enviado</h2>
        <p>{obrigado.texto || TEXTOS_PADRAO.obrigado(nomeEmpresa)}</p>
        {obrigado.botaoTexto && obrigado.botaoLink && (
          <a
            href={previa ? undefined : obrigado.botaoLink}
            target="_blank"
            rel="noopener noreferrer"
            className={`botao ${styles.botaoObrigado}`}
          >
            {obrigado.botaoTexto}
          </a>
        )}
      </div>
    );
  }

  // na pré-visualização o formulário não envia
  const enviarPrevia = (e) => e.preventDefault();

  return (
    <form
      action={previa ? undefined : accao}
      onSubmit={previa ? enviarPrevia : undefined}
      className={styles.formulario}
      noValidate
    >
      <input type="hidden" name="slug" value={slug ?? ""} />

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

      <div className="campo">
        <label htmlFor="nome">Nome</label>
        <input id="nome" name="nome" autoComplete="name" defaultValue={valores.nome} aria-invalid={!!erros.nome} />
        {erros.nome && <p className="erro-campo">{erros.nome}</p>}
      </div>

      <div className="campo">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={valores.email}
          aria-invalid={!!erros.email}
        />
        {erros.email && <p className="erro-campo">{erros.email}</p>}
      </div>

      <div className="campo">
        <label htmlFor="telefone">
          Telefone <span className={styles.opcional}>(opcional)</span>
        </label>
        <input
          id="telefone"
          name="telefone"
          type="tel"
          autoComplete="tel"
          defaultValue={valores.telefone}
          aria-invalid={!!erros.telefone}
        />
        {erros.telefone && <p className="erro-campo">{erros.telefone}</p>}
      </div>

      {/* perguntas extra, escolhidas pela empresa em "Personalizar" */}
      {perguntas.map((p) => (
        <Pergunta key={p.id} pergunta={p} valor={respostas[p.id]} erro={erros[`resposta_${p.id}`]} />
      ))}

      <button type="submit" className="botao" disabled={pendente}>
        {pendente ? "A enviar..." : "Enviar pedido de contacto"}
      </button>

      <p className={styles.privacidade}>Os teus dados só são usados para te contactarmos.</p>
    </form>
  );
}

// uma pergunta extra, conforme o tipo
function Pergunta({ pergunta: p, valor, erro }) {
  const nome = `resposta_${p.id}`;
  const idAjuda = p.ajuda ? `ajuda-${p.id}` : undefined;
  const etiqueta = (
    <>
      {p.texto || "Pergunta sem texto"} {!p.obrigatoria && <span className={styles.opcional}>(opcional)</span>}
    </>
  );
  const ajuda = p.ajuda ? (
    <p id={idAjuda} className={styles.ajuda}>
      {p.ajuda}
    </p>
  ) : null;
  const mensagemErro = erro ? <p className="erro-campo">{erro}</p> : null;
  const opcoes = (p.opcoes ?? []).filter((o) => String(o).trim());

  // escolhas com botões: uma (rádio), várias (caixas) ou sim/não
  if (p.tipo === "escolha" || p.tipo === "varias" || p.tipo === "sim_nao") {
    const lista = p.tipo === "sim_nao" ? ["Sim", "Não"] : opcoes.length ? opcoes : ["Opção 1", "Opção 2"];
    const tipoInput = p.tipo === "varias" ? "checkbox" : "radio";
    const marcadas = Array.isArray(valor) ? valor : [valor];
    return (
      <div className="campo">
        <fieldset className={styles.escolha} aria-invalid={!!erro} aria-describedby={idAjuda}>
          <legend>{etiqueta}</legend>
          {ajuda}
          <div className={p.tipo === "sim_nao" ? styles.simNao : styles.opcoesEscolha}>
            {lista.map((o) => (
              <label key={o} className={styles.opcaoEscolha}>
                <input type={tipoInput} name={nome} value={o} defaultChecked={marcadas.includes(o)} />
                {o}
              </label>
            ))}
          </div>
          {p.tipo === "varias" && <p className={styles.ajuda}>Podes escolher mais do que uma.</p>}
        </fieldset>
        {mensagemErro}
      </div>
    );
  }

  let campo;
  if (p.tipo === "texto_longo") {
    campo = (
      <textarea id={nome} name={nome} rows={4} maxLength={2000} defaultValue={valor} aria-invalid={!!erro} aria-describedby={idAjuda} />
    );
  } else if (p.tipo === "lista") {
    campo = (
      <select id={nome} name={nome} defaultValue={valor ?? ""} aria-invalid={!!erro} aria-describedby={idAjuda}>
        <option value="">Escolhe uma opção</option>
        {(opcoes.length ? opcoes : ["Opção 1", "Opção 2"]).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  } else if (p.tipo === "numero") {
    campo = (
      <input
        id={nome}
        name={nome}
        inputMode="decimal"
        maxLength={20}
        defaultValue={valor}
        aria-invalid={!!erro}
        aria-describedby={idAjuda}
        className={styles.campoCurto}
      />
    );
  } else if (p.tipo === "data") {
    campo = (
      <input
        id={nome}
        name={nome}
        type="date"
        defaultValue={valor}
        aria-invalid={!!erro}
        aria-describedby={idAjuda}
        className={styles.campoCurto}
      />
    );
  } else {
    campo = <input id={nome} name={nome} maxLength={500} defaultValue={valor} aria-invalid={!!erro} aria-describedby={idAjuda} />;
  }

  return (
    <div className="campo">
      <label htmlFor={nome}>{etiqueta}</label>
      {ajuda}
      {campo}
      {mensagemErro}
    </div>
  );
}
