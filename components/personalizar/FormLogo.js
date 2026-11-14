"use client";
// Enviar ou remover o logótipo da empresa.
// Ao escolher o ficheiro mostra logo a imagem (antes de guardar), para se ver como fica.

import { useActionState, useState, useTransition } from "react";
import { guardarLogo, removerLogo } from "@/lib/acoes/empresa";
import styles from "./Personalizar.module.css";

const MAX = 1024 * 1024;

export default function FormLogo({ logoAtual, nomeEmpresa }) {
  const [estado, accao, pendente] = useActionState(guardarLogo, {});
  // a pré-visualização fica ligada ao "estado" do momento em que se escolheu a imagem:
  // depois de enviar, o estado muda e a pré-visualização deixa de contar
  const [escolha, setEscolha] = useState(null); // { url, estado }
  const [erroLocal, setErroLocal] = useState("");
  const [aRemover, iniciarRemover] = useTransition();

  function escolher(evento) {
    const ficheiro = evento.target.files?.[0];
    setErroLocal("");
    if (escolha) URL.revokeObjectURL(escolha.url); // liberta a imagem temporária anterior
    if (!ficheiro) return setEscolha(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(ficheiro.type)) {
      evento.target.value = "";
      setEscolha(null);
      return setErroLocal("A imagem tem de ser PNG, JPG ou WebP.");
    }
    if (ficheiro.size > MAX) {
      evento.target.value = "";
      setEscolha(null);
      return setErroLocal("A imagem é demasiado grande (máximo 1 MB).");
    }
    setEscolha({ url: URL.createObjectURL(ficheiro), estado });
  }

  const previa = escolha && escolha.estado === estado ? escolha.url : null;
  // depois de guardar, a imagem nova já vem do servidor (logoAtual)
  const mostrar = previa ?? logoAtual;
  const erro = erroLocal || estado.erro;

  return (
    <form action={accao} className={styles.formLogo}>
      <div className={styles.linhaLogo}>
        <div className={styles.moldura}>
          {mostrar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mostrar} alt={`Logótipo da ${nomeEmpresa}`} />
          ) : (
            <span aria-hidden="true">{nomeEmpresa[0].toUpperCase()}</span>
          )}
        </div>

        <div className={styles.escolherLogo}>
          <label className="botao botao-secundario" htmlFor="logo">
            {logoAtual || previa ? "Escolher outra imagem" : "Escolher imagem"}
          </label>
          <input
            id="logo"
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="so-leitores"
            onChange={escolher}
          />
          {!mostrar && <small>Sem logótipo, aparece a primeira letra do nome.</small>}
          {previa && <small>Ainda não está guardado.</small>}
        </div>
      </div>

      {erro && <p className="alerta alerta-erro" role="alert">{erro}</p>}
      {estado.sucesso && !previa && <p className="alerta alerta-sucesso" role="status">{estado.sucesso}</p>}

      <div className={styles.acoesLogo}>
        <button type="submit" className="botao" disabled={!previa || pendente}>
          {pendente ? "A enviar…" : "Guardar logótipo"}
        </button>
        {logoAtual && (
          <button
            type="button"
            className={styles.botaoRemover}
            disabled={aRemover || pendente}
            onClick={() => iniciarRemover(() => removerLogo())}
          >
            {aRemover ? "A remover…" : "Remover"}
          </button>
        )}
      </div>
    </form>
  );
}
