"use client";
// Formulário de cliente, usado para CRIAR e para EDITAR.
// Props:
//  - cliente: dados atuais (só na edição; na criação vem vazio)
//  - membros: lista da equipa para escolher o responsável (só o admin recebe)
//  - comPrevia: mostra ao lado uma pré-visualização do cartão (página "Novo cliente")
//  - children: conteúdo extra por baixo da pré-visualização (ex.: uma dica)

import Link from "next/link";
import { useActionState, useState } from "react";
import { guardarCliente } from "@/lib/acoes/clientes";
import { ESTADOS, obterEstado, formatarEuros } from "@/lib/estados";
import { iniciais } from "@/lib/texto";
import Icone from "@/components/Icone";
import styles from "./FormCliente.module.css";

export default function FormCliente({ cliente = {}, membros = null, comPrevia = false, children }) {
  const [estado, accao, pendente] = useActionState(guardarCliente, {});
  const erros = estado.erros ?? {};
  // depois de um erro mostramos o que a pessoa escreveu; senão, os dados do cliente
  const v = estado.valores ?? cliente;
  const aEditar = Boolean(cliente.id);

  // Pré-visualização: os campos NÃO são controlados pelo React (usam defaultValue).
  // Sempre que algo muda, lemos o formulário inteiro com FormData e guardamos uma cópia.
  const [previa, setPrevia] = useState(v);
  function atualizarPrevia(e) {
    setPrevia(Object.fromEntries(new FormData(e.currentTarget)));
  }

  const campos = (
    <>
      {estado.mensagem && <p className="alerta alerta-erro" role="alert">{estado.mensagem}</p>}

      {/* ---------- 1. Contacto ---------- */}
      <fieldset className={styles.grupo}>
        <legend className={styles.tituloGrupo}>
          <b>1</b> Contacto
        </legend>

        <div className="campo">
          <label htmlFor="nome">Nome</label>
          {/* caixa com um ícone dentro, à esquerda */}
          <div className="com-icone">
            <Icone nome="utilizador" tamanho={17} className="icone-campo" />
            <input
              id="nome"
              name="nome"
              placeholder="Nome da pessoa ou empresa"
              defaultValue={v.nome ?? ""}
              aria-invalid={!!erros.nome}
              autoFocus={!aEditar} // num cliente novo, o cursor começa logo aqui
            />
          </div>
          {erros.nome && <p className="erro-campo">{erros.nome}</p>}
        </div>

        <div className={styles.duasColunas}>
          <div className="campo">
            <label htmlFor="email">
              Email <span className={styles.opcional}>opcional</span>
            </label>
            <div className="com-icone">
              <Icone nome="email" tamanho={17} className="icone-campo" />
              <input id="email" name="email" type="email" placeholder="nome@exemplo.pt" defaultValue={v.email ?? ""} aria-invalid={!!erros.email} />
            </div>
            {erros.email && <p className="erro-campo">{erros.email}</p>}
          </div>
          <div className="campo">
            <label htmlFor="telefone">
              Telefone <span className={styles.opcional}>opcional</span>
            </label>
            <div className="com-icone">
              <Icone nome="telemovel" tamanho={17} className="icone-campo" />
              <input id="telefone" name="telefone" type="tel" placeholder="912 345 678" defaultValue={v.telefone ?? ""} aria-invalid={!!erros.telefone} />
            </div>
            {erros.telefone && <p className="erro-campo">{erros.telefone}</p>}
          </div>
        </div>
      </fieldset>

      {/* ---------- 2. Negócio ---------- */}
      <fieldset className={styles.grupo}>
        <legend className={styles.tituloGrupo}>
          <b>2</b> Negócio
        </legend>

        {/* Fase: botões de opção (radio). Só um pode estar escolhido.
            Cada opção tem a cor do estado; o CSS realça a escolhida. */}
        <div className={styles.estados} role="radiogroup" aria-labelledby="titulo-fase">
          <p id="titulo-fase" className={styles.rotulo}>Fase</p>
          <div className={styles.opcoes}>
            {ESTADOS.map((e) => (
              <label key={e.chave} className={styles.opcao} style={{ "--cor": e.cor }}>
                <input type="radio" name="estado" value={e.chave} defaultChecked={(v.estado ?? "novo") === e.chave} />
                <span>{e.texto}</span>
              </label>
            ))}
          </div>
          {erros.estado && <p className="erro-campo">{erros.estado}</p>}
        </div>

        <div className={styles.duasColunas}>
          <div className="campo">
            <label htmlFor="valor_previsto">
              Valor previsto <span className={styles.opcional}>opcional</span>
            </label>
            {/* o símbolo € fica dentro da caixa, à esquerda */}
            <div className="com-icone">
              <span className={`icone-campo ${styles.euro}`} aria-hidden="true">€</span>
              <input id="valor_previsto" name="valor_previsto" inputMode="decimal" placeholder="1500"
                defaultValue={v.valor_previsto ?? ""} aria-invalid={!!erros.valor_previsto} />
            </div>
            {erros.valor_previsto && <p className="erro-campo">{erros.valor_previsto}</p>}
          </div>

          {/* só o admin escolhe o responsável; o comercial fica sempre com os seus */}
          {membros && (
            <div className="campo">
              <label htmlFor="responsavel_id">Responsável</label>
              <select id="responsavel_id" name="responsavel_id" defaultValue={v.responsavel_id ?? ""}>
                <option value="">Por atribuir</option>
                {membros.map((m) => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </fieldset>

      <div className={styles.acoes}>
        <button type="submit" className="botao" disabled={pendente}>
          {pendente ? "A guardar..." : aEditar ? "Guardar alterações" : (
            <>
              <Icone nome="mais" tamanho={16} /> Adicionar cliente
            </>
          )}
        </button>
        <Link href="/painel/clientes" className="botao botao-secundario">
          Cancelar
        </Link>
      </div>
    </>
  );

  // na ficha (edição): só os campos, sem pré-visualização
  if (!comPrevia) {
    return (
      <form action={accao} className={styles.formulario} noValidate>
        {aEditar && <input type="hidden" name="id" value={cliente.id} />}
        {campos}
      </form>
    );
  }

  // ---------- página "Novo cliente": formulário + pré-visualização ao lado ----------
  const fase = obterEstado(previa.estado ?? "novo");
  const nome = (previa.nome ?? "").trim();
  const valor = Number(String(previa.valor_previsto ?? "").replace(",", "."));
  const responsavel = membros?.find((m) => m.id === previa.responsavel_id)?.nome;

  return (
    <form action={accao} onChange={atualizarPrevia} className={styles.comPrevia} noValidate>
      <div className={styles.cartaoForm}>
        <div className={styles.formulario}>{campos}</div>
      </div>

      <aside className={styles.lado}>
        <p className={styles.rotuloPrevia}>Pré-visualização</p>

        {/* cartão igual aos do pipeline; a cor da fase vem em --cor */}
        <div className={styles.previa} style={{ "--cor": fase.cor }}>
          <div className={styles.topoPrevia}>
            <span className={styles.avatar}>{nome ? iniciais(nome) : "?"}</span>
            <div className={styles.nomePrevia}>
              <strong className={nome ? "" : styles.vazio}>{nome || "Nome do cliente"}</strong>
              <small>{previa.email || "sem email"}</small>
            </div>
          </div>

          <dl className={styles.dadosPrevia}>
            <div>
              <dt>Valor</dt>
              <dd>{valor > 0 ? formatarEuros(valor) : "—"}</dd>
            </div>
            <div>
              <dt>Telefone</dt>
              <dd>{previa.telefone || "—"}</dd>
            </div>
            {membros && (
              <div>
                <dt>Responsável</dt>
                <dd>{responsavel ?? "Por atribuir"}</dd>
              </div>
            )}
          </dl>

          <span className={styles.fase}>{fase.texto}</span>
        </div>

        <p className={styles.notaPrevia}>
          Vai aparecer na coluna <strong style={{ color: fase.cor }}>{fase.texto}</strong> do pipeline.
        </p>

        {children}
      </aside>
    </form>
  );
}
