"use client";
// Formulário da proposta nova: título, linhas (descrição, quantidade, preço), validade e notas.
// O total aparece enquanto se escreve; o servidor volta a calculá-lo ao guardar.

import { useState, useTransition } from "react";
import Icone from "@/components/Icone";
import { criarProposta } from "@/lib/acoes/propostas";
import { LIMITES_PROPOSTA, MAX_ITENS, calcularTotal, totalLinha } from "@/lib/propostas";
import { formatarEuros } from "@/lib/estados";
import styles from "./Propostas.module.css";

let proximoId = 1;
const linhaVazia = () => ({ id: proximoId++, descricao: "", quantidade: "1", preco: "" });

// validade por defeito: daqui a 15 dias
function daquiA(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(d);
}

export default function FormProposta({ clienteId, valorPrevisto }) {
  const [titulo, setTitulo] = useState("");
  const [itens, setItens] = useState(() => [
    { ...linhaVazia(), preco: valorPrevisto ? String(valorPrevisto).replace(".", ",") : "" },
  ]);
  const [validade, setValidade] = useState(() => daquiA(15));
  const [notas, setNotas] = useState("");
  const [erro, setErro] = useState("");
  const [aGuardar, comecar] = useTransition();

  const total = calcularTotal(itens);

  function mudarLinha(id, campos) {
    setErro("");
    setItens((lista) => lista.map((l) => (l.id === id ? { ...l, ...campos } : l)));
  }

  function enviar(evento) {
    evento.preventDefault();
    setErro("");
    comecar(async () => {
      // se correr bem, o servidor leva de volta à ficha do lead
      const resposta = await criarProposta({ clienteId, titulo, itens, validade, notas });
      if (resposta?.erro) setErro(resposta.erro);
    });
  }

  return (
    <form className={styles.form} onSubmit={enviar}>
      <div className={styles.duasColunas}>
        <div className="campo">
          <label htmlFor="proposta-titulo">Título</label>
          <input
            id="proposta-titulo"
            value={titulo}
            maxLength={LIMITES_PROPOSTA.titulo}
            placeholder="Ex.: Site novo com loja online"
            onChange={(e) => setTitulo(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="campo">
          <label htmlFor="proposta-validade">Válida até</label>
          <input id="proposta-validade" type="date" value={validade} onChange={(e) => setValidade(e.target.value)} />
        </div>
      </div>

      <section className={styles.itens} aria-labelledby="proposta-itens">
        <h2 id="proposta-itens">O que está incluído</h2>
        <div className={styles.cabecaItens} aria-hidden="true">
          <span>Descrição</span>
          <span className={styles.numero}>Quantidade</span>
          <span className={styles.numero}>Preço (€)</span>
          <span className={styles.numero}>Total</span>
          <span />
        </div>
        {itens.map((l, i) => (
          <div key={l.id} className={styles.item}>
            <input
              className={styles.descricao}
              aria-label={`Descrição da linha ${i + 1}`}
              value={l.descricao}
              maxLength={LIMITES_PROPOSTA.descricao}
              placeholder="Ex.: Design e programação"
              onChange={(e) => mudarLinha(l.id, { descricao: e.target.value })}
            />
            <input
              className={styles.numero}
              aria-label={`Quantidade da linha ${i + 1}`}
              inputMode="decimal"
              value={l.quantidade}
              onChange={(e) => mudarLinha(l.id, { quantidade: e.target.value })}
            />
            <input
              className={styles.numero}
              aria-label={`Preço da linha ${i + 1}`}
              inputMode="decimal"
              value={l.preco}
              placeholder="0,00"
              onChange={(e) => mudarLinha(l.id, { preco: e.target.value })}
            />
            <span className={styles.subtotal}>{formatarEuros(totalLinha(l))}</span>
            <button
              type="button"
              className={styles.tirar}
              aria-label={`Tirar a linha ${i + 1}`}
              disabled={itens.length === 1}
              onClick={() => setItens((lista) => lista.filter((x) => x.id !== l.id))}
            >
              <Icone nome="lixo" tamanho={15} />
            </button>
          </div>
        ))}
        {itens.length < MAX_ITENS && (
          <button type="button" className={styles.maisLinha} onClick={() => setItens((lista) => [...lista, linhaVazia()])}>
            <Icone nome="mais" tamanho={14} />
            Mais uma linha
          </button>
        )}
        <div className={styles.totalGeral}>
          <span>Total</span>
          <strong>{formatarEuros(total)}</strong>
        </div>
      </section>

      <div className="campo">
        <label htmlFor="proposta-notas">Notas para o cliente (opcional)</label>
        <textarea
          id="proposta-notas"
          rows={4}
          maxLength={LIMITES_PROPOSTA.notas}
          value={notas}
          placeholder="Ex.: Prazo de entrega de 3 semanas. Pagamento de 50% na adjudicação."
          onChange={(e) => setNotas(e.target.value)}
        />
      </div>

      {erro && (
        <p className={styles.erro} role="alert">
          {erro}
        </p>
      )}

      <div className={styles.rodape}>
        <p>Depois de criar, copias o link ou envias por WhatsApp. O cliente aceita na página.</p>
        <button type="submit" className="botao" disabled={aGuardar} aria-busy={aGuardar}>
          {aGuardar ? "A criar…" : "Criar proposta"}
        </button>
      </div>
    </form>
  );
}
