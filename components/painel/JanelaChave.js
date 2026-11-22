"use client";
// Janela que mostra a CHAVE DE RECUPERAÇÃO (para recuperar a password sem email).
//
// Aparece em dois sítios:
//  - modo "obrigatoria": no painel, a quem ainda não tem chave (conta nova, contas antigas,
//    ou depois de usar a chave em "Esqueci-me da password"). Não se fecha sem confirmar.
//  - modo "nova": em A minha conta, quando a pessoa pede uma chave nova. Ao confirmar, fecha.
//
// A chave é criada no servidor ao abrir a janela e só existe aqui, em texto, desta vez:
// a base de dados guarda apenas o hash. Por isso pedimos para a copiar ou descarregar.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { criarChaveNova, confirmarChaveGuardada } from "@/lib/acoes/recuperacao";
import Icone from "@/components/Icone";
import styles from "./JanelaChave.module.css";

export default function JanelaChave({ email, modo = "obrigatoria", aoFechar }) {
  const router = useRouter();
  const dialogo = useRef(null);
  const pedida = useRef(false); // em modo de desenvolvimento o React corre os efeitos 2 vezes
  const [chave, setChave] = useState(null);
  const [erro, setErro] = useState(null);
  const [guardei, setGuardei] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [aEnviar, setAEnviar] = useState(false);

  async function pedirChave() {
    setErro(null);
    setChave(null);
    setGuardei(false);
    const r = await criarChaveNova();
    if (r.erro) setErro(r.erro);
    else setChave(r.chave);
  }

  // abre a janela e pede a chave ao servidor (uma só vez)
  useEffect(() => {
    dialogo.current?.showModal();
    if (pedida.current) return;
    pedida.current = true;
    pedirChave();
  }, []);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(chave);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro("O browser não deixou copiar. Seleciona a chave e copia à mão.");
    }
  }

  // ficheiro de texto feito no próprio browser (a chave não volta a passar pela internet)
  function descarregar() {
    const texto = [
      "FlowCRM - chave de recuperação",
      "",
      `Conta: ${email}`,
      `Chave: ${chave}`,
      `Criada a: ${new Date().toLocaleString("pt-PT")}`,
      "",
      "Se te esqueceres da password, vai a Entrar > Esqueci-me da password",
      "e escreve o teu email e esta chave. Cada chave só serve uma vez.",
      "Guarda este ficheiro num sítio seguro e não o partilhes.",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([texto], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "flowcrm-chave-de-recuperacao.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function continuar() {
    setAEnviar(true);
    const r = await confirmarChaveGuardada(chave);
    setAEnviar(false);
    if (r.erro) {
      setErro(r.erro);
      return;
    }
    dialogo.current?.close();
    if (modo === "nova") aoFechar?.();
    else router.refresh(); // o layout volta sem a janela (e o tutorial pode abrir)
  }

  return (
    <dialog
      ref={dialogo}
      className={styles.dialogo}
      aria-labelledby="titulo-chave"
      // a tecla Esc não fecha: a chave tem de ser guardada primeiro
      onCancel={(e) => e.preventDefault()}
    >
      <div className={styles.conteudo}>
        <span className={styles.icone} aria-hidden="true">
          <Icone nome="cadeado" tamanho={22} />
        </span>
        <h2 id="titulo-chave">{modo === "nova" ? "A tua chave nova" : "Guarda a tua chave de recuperação"}</h2>
        <p className={styles.texto}>
          Se te esqueceres da password, esta chave é a única forma de a recuperar. Guarda-a no teu computador ou num
          gestor de passwords. Só a vês agora: nós não a conseguimos mostrar outra vez.
        </p>

        <div className={styles.caixaChave} aria-live="polite">
          {chave ? <code>{chave}</code> : !erro && <span className={styles.aGerar}>A criar a chave…</span>}
        </div>

        {chave && (
          <div className={styles.botoes}>
            <button type="button" className="botao botao-secundario" onClick={copiar}>
              {copiado ? "Copiada" : "Copiar"}
            </button>
            <button type="button" className="botao botao-secundario" onClick={descarregar}>
              Descarregar (.txt)
            </button>
          </div>
        )}

        {erro && (
          <p className={styles.erro} role="alert">
            {erro}{" "}
            <button type="button" className={styles.outra} onClick={pedirChave}>
              Gerar outra chave
            </button>
          </p>
        )}

        <label className={styles.confirmar}>
          <input type="checkbox" checked={guardei} onChange={(e) => setGuardei(e.target.checked)} disabled={!chave} />
          Já guardei a chave num sítio seguro
        </label>

        <button type="button" className="botao botao-largo" onClick={continuar} disabled={!chave || !guardei || aEnviar}>
          {aEnviar ? (
            <>
              <span className="roda" aria-hidden="true"></span> A confirmar
            </>
          ) : (
            "Continuar"
          )}
        </button>
      </div>
    </dialog>
  );
}
