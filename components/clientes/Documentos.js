"use client";
// Cartão "Documentos" da ficha do lead: carregar, abrir e apagar ficheiros
// (faturas, propostas, contratos...). Fase 1 de PLANO-EMAIL-DOCUMENTOS.md.
// O envio é feito em 3 passos (ver lib/acoes/documentos.js): preparar no servidor,
// enviar do browser diretamente para o Storage e confirmar no servidor
// (que converte as imagens para WebP).

import { useRef, useState } from "react";
import { criarClienteBrowser } from "@/lib/supabase/cliente";
import { prepararDocumento, confirmarDocumento, apagarDocumento } from "@/lib/acoes/documentos";
import {
  ACEITA,
  MAX_EMPRESA,
  MAX_FICHEIRO,
  categoriasDoPlano,
  formatarTamanho,
  nomeCategoria,
  tipoDoFicheiro,
} from "@/lib/documentos";
import { formatarData } from "@/lib/estados";
import Icone from "@/components/Icone";
import styles from "./Documentos.module.css";

function BotaoApagar({ id, aoErro }) {
  const [aConfirmar, setAConfirmar] = useState(false);
  const [aApagar, setAApagar] = useState(false);

  if (!aConfirmar) {
    return (
      <button type="button" className={styles.apagar} onClick={() => setAConfirmar(true)} aria-label="Apagar documento">
        <Icone nome="lixo" tamanho={15} />
      </button>
    );
  }

  async function apagar() {
    setAApagar(true);
    const r = await apagarDocumento(id);
    if (r?.erro) {
      aoErro(r.erro);
      setAApagar(false);
      setAConfirmar(false);
    }
  }

  return (
    <span className={styles.confirmacao}>
      <button type="button" className={styles.confirmar} onClick={apagar} disabled={aApagar}>
        {aApagar ? "A apagar…" : "Sim, apagar"}
      </button>
      <button type="button" className={styles.nao} onClick={() => setAConfirmar(false)} disabled={aApagar}>
        Não
      </button>
    </span>
  );
}

export default function Documentos({ clienteId, documentos, pro, perfilId, eAdmin, usado }) {
  const categorias = categoriasDoPlano(pro);
  const [categoria, setCategoria] = useState(categorias[0].chave);
  const [ficheiro, setFicheiro] = useState(null);
  const [passo, setPasso] = useState(null); // null | "a enviar" | "a guardar"
  const [erro, setErro] = useState("");
  const input = useRef(null);

  function escolher(evento) {
    setErro("");
    const f = evento.target.files?.[0] ?? null;
    if (f && !tipoDoFicheiro(f.name, f.type)) {
      setErro("Este tipo de ficheiro não é aceite. Usa PDF, imagem, Word, Excel, texto, CSV ou ZIP.");
      evento.target.value = "";
      return setFicheiro(null);
    }
    if (f && f.size > MAX_FICHEIRO) {
      setErro(`O ficheiro é demasiado grande (máximo ${formatarTamanho(MAX_FICHEIRO)}).`);
      evento.target.value = "";
      return setFicheiro(null);
    }
    setFicheiro(f);
  }

  async function carregar(evento) {
    evento.preventDefault();
    if (!ficheiro || passo) return;
    setErro("");
    setPasso("a enviar");
    try {
      const preparado = await prepararDocumento({
        clienteId,
        nome: ficheiro.name,
        tipo: ficheiro.type,
        tamanho: ficheiro.size,
        categoria,
      });
      if (preparado.erro) return setErro(preparado.erro);

      const { error } = await criarClienteBrowser()
        .storage.from("documentos")
        .uploadToSignedUrl(preparado.caminho, preparado.token, ficheiro, { contentType: preparado.tipo });
      if (error) return setErro("Não foi possível enviar o ficheiro. Vê a ligação à internet e tenta outra vez.");

      setPasso("a guardar");
      const r = await confirmarDocumento({ clienteId, caminho: preparado.caminho, nome: ficheiro.name, categoria });
      if (r.erro) return setErro(r.erro);

      setFicheiro(null);
      if (input.current) input.current.value = "";
    } catch {
      setErro("Não foi possível carregar o ficheiro. Tenta outra vez.");
    } finally {
      setPasso(null);
    }
  }

  return (
    <>
      <header className={styles.topo}>
        <h2>
          Documentos {documentos.length > 0 && <span>{documentos.length}</span>}
        </h2>
        <small className={styles.espaco}>
          {formatarTamanho(usado)} de {formatarTamanho(MAX_EMPRESA)} usados
        </small>
      </header>

      <form onSubmit={carregar} className={styles.formulario}>
        <div className="campo">
          <label htmlFor="doc-categoria">Categoria</label>
          <select id="doc-categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} disabled={Boolean(passo)}>
            {categorias.map((c) => (
              <option key={c.chave} value={c.chave}>
                {c.texto}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="doc-ficheiro">Ficheiro (até {formatarTamanho(MAX_FICHEIRO)})</label>
          <input
            ref={input}
            id="doc-ficheiro"
            type="file"
            accept={ACEITA}
            onChange={escolher}
            disabled={Boolean(passo)}
            className={styles.ficheiro}
          />
        </div>

        <button type="submit" className="botao" disabled={!ficheiro || Boolean(passo)} aria-busy={Boolean(passo)}>
          {passo === "a enviar" ? "A enviar…" : passo === "a guardar" ? "A guardar…" : "Carregar"}
        </button>
      </form>

      {erro && (
        <p className="erro-campo" role="alert">
          {erro}
        </p>
      )}

      {documentos.length === 0 ? (
        <p className={styles.vazio}>Ainda não há documentos deste lead.</p>
      ) : (
        <ul className={styles.lista}>
          {documentos.map((d) => (
            <li key={d.id}>
              <Icone nome={d.tipo_mime.startsWith("image/") ? "imagem" : "documento"} tamanho={18} />
              <div className={styles.info}>
                {/* <a> normal (não <Link>): a rota responde com um link temporário do Storage */}
                <a href={`/painel/clientes/${clienteId}/documentos/${d.id}`} target="_blank" rel="noopener noreferrer">
                  {d.nome}
                </a>
                <small>
                  {nomeCategoria(d.categoria)} · {formatarTamanho(d.tamanho)} · {formatarData(d.criado_em)}
                  {d.perfis?.nome ? ` · ${d.perfis.nome}` : ""}
                </small>
              </div>
              {(eAdmin || d.autor_id === perfilId) && <BotaoApagar id={d.id} aoErro={setErro} />}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
