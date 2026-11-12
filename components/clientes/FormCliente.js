"use client";
// Formulário de cliente, usado para CRIAR e para EDITAR.
// Props:
//  - cliente: dados atuais (só na edição; na criação vem vazio)
//  - membros: lista da equipa para escolher o responsável (só o admin recebe)

import Link from "next/link";
import { useActionState } from "react";
import { guardarCliente } from "@/lib/acoes/clientes";
import { ESTADOS } from "@/lib/estados";
import styles from "./FormCliente.module.css";

export default function FormCliente({ cliente = {}, membros = null }) {
  const [estado, accao, pendente] = useActionState(guardarCliente, {});
  const erros = estado.erros ?? {};
  // depois de um erro mostramos o que a pessoa escreveu; senão, os dados do cliente
  const v = estado.valores ?? cliente;
  const aEditar = Boolean(cliente.id);

  return (
    <form action={accao} className={styles.formulario} noValidate>
      {aEditar && <input type="hidden" name="id" value={cliente.id} />}
      {estado.mensagem && <p className="alerta alerta-erro" role="alert">{estado.mensagem}</p>}

      <div className="campo">
        <label htmlFor="nome">Nome</label>
        <input id="nome" name="nome" placeholder="Nome da pessoa ou empresa" defaultValue={v.nome ?? ""} aria-invalid={!!erros.nome} />
        {erros.nome && <p className="erro-campo">{erros.nome}</p>}
      </div>

      <div className={styles.duasColunas}>
        <div className="campo">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" placeholder="opcional" defaultValue={v.email ?? ""} aria-invalid={!!erros.email} />
          {erros.email && <p className="erro-campo">{erros.email}</p>}
        </div>
        <div className="campo">
          <label htmlFor="telefone">Telefone</label>
          <input id="telefone" name="telefone" type="tel" placeholder="opcional" defaultValue={v.telefone ?? ""} aria-invalid={!!erros.telefone} />
          {erros.telefone && <p className="erro-campo">{erros.telefone}</p>}
        </div>
      </div>

      {/* Estado: botões de opção (radio). Só um pode estar escolhido.
          Cada opção tem a cor do estado; o CSS realça a escolhida. */}
      <fieldset className={styles.estados}>
        <legend>Estado</legend>
        <div className={styles.opcoes}>
          {ESTADOS.map((e) => (
            <label key={e.chave} className={styles.opcao} style={{ "--cor": e.cor }}>
              <input type="radio" name="estado" value={e.chave} defaultChecked={(v.estado ?? "novo") === e.chave} />
              <span>{e.texto}</span>
            </label>
          ))}
        </div>
        {erros.estado && <p className="erro-campo">{erros.estado}</p>}
      </fieldset>

      <div className={styles.duasColunas}>
        <div className="campo">
          <label htmlFor="valor_previsto">Valor previsto (€)</label>
          <input id="valor_previsto" name="valor_previsto" inputMode="decimal" placeholder="ex.: 1500"
            defaultValue={v.valor_previsto ?? ""} aria-invalid={!!erros.valor_previsto} />
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

      <div className={styles.acoes}>
        <button type="submit" className="botao" disabled={pendente}>
          {pendente ? "A guardar..." : aEditar ? "Guardar alterações" : "Adicionar cliente"}
        </button>
        <Link href="/painel/clientes" className="botao botao-secundario">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
