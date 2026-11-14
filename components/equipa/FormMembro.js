"use client";
// Formulário para o administrador adicionar um membro (componente de cliente,
// para mostrar erros e o estado "a adicionar..." sem recarregar a página).

import { useActionState } from "react";
import { criarMembro } from "@/lib/acoes/equipa";
import Icone from "@/components/Icone";
import CampoPassword from "@/components/CampoPassword";
import styles from "./Equipa.module.css";

const PAPEIS = [
  { valor: "comercial", texto: "Comercial", ajuda: "Vê só os clientes de que é responsável." },
  { valor: "admin", texto: "Administrador", ajuda: "Vê tudo e gere a equipa, como tu." },
];

export default function FormMembro() {
  const [estado, accao, pendente] = useActionState(criarMembro, {});
  const erros = estado.erros ?? {};
  const valores = estado.valores ?? {};

  return (
    // key: quando um membro é criado com sucesso, o formulário "renasce" vazio
    <form action={accao} key={estado.sucesso} style={{ display: "flex", flexDirection: "column", gap: 14 }} noValidate>
      {estado.mensagem && <p className="alerta alerta-erro" role="alert">{estado.mensagem}</p>}
      {estado.sucesso && <p className="alerta alerta-sucesso" role="status">{estado.sucesso}</p>}

      <div className="campo">
        <label htmlFor="nome">Nome</label>
        <div className="com-icone">
          <Icone nome="utilizador" tamanho={17} className="icone-campo" />
          <input id="nome" name="nome" placeholder="Rui Martins" defaultValue={valores.nome} aria-invalid={!!erros.nome} />
        </div>
        {erros.nome && <p className="erro-campo">{erros.nome}</p>}
      </div>

      <div className="campo">
        <label htmlFor="email">Email</label>
        <div className="com-icone">
          <Icone nome="email" tamanho={17} className="icone-campo" />
          <input id="email" name="email" type="email" placeholder="rui@empresa.pt" defaultValue={valores.email} aria-invalid={!!erros.email} />
        </div>
        {erros.email && <p className="erro-campo">{erros.email}</p>}
      </div>

      {/* papel: controlo segmentado com duas opções */}
      <fieldset className={styles.papel}>
        <legend>Papel</legend>
        <div className={styles.segmentos}>
          {PAPEIS.map((p) => (
            <label key={p.valor} className={styles.segmento}>
              <input type="radio" name="papel" value={p.valor} defaultChecked={(valores.papel ?? "comercial") === p.valor} />
              <span>{p.texto}</span>
            </label>
          ))}
        </div>
        <p className={styles.ajudaPapel}>
          {PAPEIS.map((p) => (
            <span key={p.valor} data-papel={p.valor}>
              {p.ajuda}
            </span>
          ))}
        </p>
      </fieldset>

      <div className="campo">
        <label htmlFor="password">Password inicial</label>
        {/* escondida por defeito; o botão "Mostrar" deixa ver para a partilhar */}
        <CampoPassword
          id="password"
          name="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          invalido={!!erros.password}
        />
        {erros.password && <p className="erro-campo">{erros.password}</p>}
      </div>

      <div className="campo">
        <label htmlFor="confirmacao">Confirmar password</label>
        <CampoPassword
          id="confirmacao"
          name="confirmacao"
          autoComplete="new-password"
          placeholder="Escreve a mesma password"
          invalido={!!erros.confirmacao}
        />
        {erros.confirmacao && <p className="erro-campo">{erros.confirmacao}</p>}
      </div>

      <button type="submit" className="botao botao-largo" disabled={pendente}>
        {pendente ? "A adicionar..." : (
          <>
            <Icone nome="utilizadorMais" tamanho={17} /> Adicionar à equipa
          </>
        )}
      </button>
    </form>
  );
}
