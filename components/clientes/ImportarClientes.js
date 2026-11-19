"use client";
// Importar clientes de um CSV, em 3 passos:
//  1) escolher o ficheiro (lido aqui no browser, nada é enviado ainda)
//  2) pré-visualização: quantos entram, que linhas têm erros e quais estão repetidas
//  3) "Importar": o texto do ficheiro vai para a Server Action, que valida tudo outra vez
// Props:
//  - membros: equipa, para o admin escolher o responsável (null para o comercial)
//  - perfilId: o próprio utilizador (responsável escolhido por defeito)

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { importarClientes } from "@/lib/acoes/importar";
import { prepararImportacao, MAX_LINHAS_IMPORTAR } from "@/lib/importar";
import { obterEstado, formatarEuros } from "@/lib/estados";
import { formatarTelefone } from "@/lib/texto";
import Icone from "@/components/Icone";
import styles from "@/app/painel/clientes/importar/importar.module.css";

// ficheiro de exemplo para descarregar (as mesmas colunas que o import entende)
const MODELO =
  "\uFEFFNome;Email;Telefone;Cidade;Valor previsto (€);Estado\r\n" +
  "Ana Costa;ana@exemplo.pt;912345678;Lisboa;1500;Novo\r\n" +
  "Clínica Sorriso;geral@sorriso.pt;+351 213 456 789;Porto;2400,50;Em negociação\r\n";

const MAX_KB = 1500; // o pedido ao servidor pode ter até 2 MB (next.config.mjs)
const PREVIA = 5; // linhas mostradas na tabela de pré-visualização
const MAX_ERROS = 8; // linhas com problemas mostradas por extenso

export default function ImportarClientes({ membros, perfilId }) {
  const [resultado, accao, pendente] = useActionState(importarClientes, {});
  const [ficheiro, setFicheiro] = useState(null); // { nome, texto }
  const [erroFicheiro, setErroFicheiro] = useState("");

  // a pré-visualização só é recalculada quando muda o ficheiro
  const previa = useMemo(() => (ficheiro ? prepararImportacao(ficheiro.texto) : null), [ficheiro]);

  async function escolher(e) {
    const f = e.target.files?.[0];
    setErroFicheiro("");
    setFicheiro(null);
    if (!f) return;
    if (f.size > MAX_KB * 1024) {
      setErroFicheiro(`O ficheiro tem ${Math.round(f.size / 1024)} KB. O máximo é ${MAX_KB} KB: divide-o em partes.`);
      return;
    }
    setFicheiro({ nome: f.name, texto: await f.text() });
  }

  // ---------- 3) depois de importar: o resumo ----------
  if (resultado.feito) {
    const { importados, repetidos, invalidos } = resultado;
    return (
      <section className={styles.bloco} role="status">
        <div className={styles.resultado}>
          <span className={styles.iconeFeito}>
            <Icone nome="visto" tamanho={22} />
          </span>
          <h2>
            {importados === 0
              ? "Nenhum cliente novo para importar"
              : `${importados} ${importados === 1 ? "cliente importado" : "clientes importados"}`}
          </h2>
          {(repetidos.length > 0 || invalidos.length > 0) && (
            <p className={styles.suave}>
              {repetidos.length > 0 && `${repetidos.length} já existiam (mesmo email) e ficaram como estavam. `}
              {invalidos.length > 0 && `${invalidos.length} linhas tinham erros e não entraram.`}
            </p>
          )}
          <div className={styles.botoes}>
            <Link href="/painel/clientes" className="botao">
              Ver clientes
            </Link>
            {/* recarregar a página limpa o resultado e o ficheiro escolhido */}
            <button type="button" className="botao botao-secundario" onClick={() => location.reload()}>
              Importar outro ficheiro
            </button>
          </div>
        </div>
      </section>
    );
  }

  const prontos = previa?.clientes?.length ?? 0;

  return (
    <form action={accao} className={styles.colunas}>
      <div className={styles.principal}>
        {resultado.erro && (
          <p className="alerta alerta-erro" role="alert">
            {resultado.erro}
          </p>
        )}

        {/* ---------- 1) escolher o ficheiro ---------- */}
        <section className={styles.bloco}>
          <label className={styles.zonaFicheiro}>
            <Icone nome="folha" tamanho={26} />
            <strong>{ficheiro ? ficheiro.nome : "Escolher ficheiro CSV"}</strong>
            <span className={styles.suave}>
              {ficheiro ? "Carrega outra vez para trocar de ficheiro." : `Até ${MAX_LINHAS_IMPORTAR} clientes de cada vez.`}
            </span>
            <input type="file" accept=".csv,text/csv" onChange={escolher} className={styles.inputEscondido} />
          </label>
          {erroFicheiro && (
            <p className="alerta alerta-erro" role="alert">
              {erroFicheiro}
            </p>
          )}
          {previa?.erro && (
            <p className="alerta alerta-erro" role="alert">
              {previa.erro}
            </p>
          )}
        </section>

        {/* ---------- 2) pré-visualização ---------- */}
        {previa && !previa.erro && (
          <section className={styles.bloco} aria-label="Pré-visualização">
            <ul className={styles.contas}>
              <li className={styles.contaBoa}>
                <strong>{prontos}</strong> {prontos === 1 ? "pronto a importar" : "prontos a importar"}
              </li>
              {previa.invalidos.length > 0 && (
                <li className={styles.contaMa}>
                  <strong>{previa.invalidos.length}</strong> com erros
                </li>
              )}
              {previa.repetidos.length > 0 && (
                <li>
                  <strong>{previa.repetidos.length}</strong> repetidos no ficheiro
                </li>
              )}
            </ul>

            {prontos > 0 && (
              <div className={styles.rolar}>
                <table className={styles.tabela}>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Telefone</th>
                      <th>Estado</th>
                      <th className={styles.direita}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previa.clientes.slice(0, PREVIA).map((c) => (
                      <tr key={c.linha}>
                        <td>{c.nome}</td>
                        <td>{c.email ?? "—"}</td>
                        <td>{formatarTelefone(c.telefone)}</td>
                        <td>{obterEstado(c.estado).texto}</td>
                        <td className={styles.direita}>{c.valor_previsto !== null ? formatarEuros(c.valor_previsto) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {prontos > PREVIA && <p className={styles.suave}>… e mais {prontos - PREVIA}.</p>}
              </div>
            )}

            {previa.invalidos.length > 0 && (
              <details className={styles.erros} open={prontos === 0}>
                <summary>Linhas que não vão entrar</summary>
                <ul>
                  {previa.invalidos.slice(0, MAX_ERROS).map((e) => (
                    <li key={e.linha}>
                      Linha {e.linha}: {e.motivo}
                    </li>
                  ))}
                  {previa.invalidos.length > MAX_ERROS && <li>… e mais {previa.invalidos.length - MAX_ERROS}.</li>}
                </ul>
              </details>
            )}
          </section>
        )}
      </div>

      {/* ---------- lateral: responsável, botão e ajuda ---------- */}
      <aside className={styles.lateral}>
        {/* o texto do ficheiro vai escondido no formulário; o servidor valida tudo outra vez */}
        <input type="hidden" name="csv" value={ficheiro?.texto ?? ""} />

        {membros && (
          <div className="campo">
            <label htmlFor="responsavel_id">Responsável pelos clientes</label>
            <select id="responsavel_id" name="responsavel_id" defaultValue={perfilId}>
              <option value="">Por atribuir</option>
              {membros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        <button type="submit" className="botao botao-largo" disabled={pendente || prontos === 0} aria-busy={pendente}>
          {pendente ? "A importar…" : prontos > 0 ? `Importar ${prontos} ${prontos === 1 ? "cliente" : "clientes"}` : "Importar"}
        </button>

        <div className={styles.ajuda}>
          <h2>Como deve ser o ficheiro</h2>
          <p>
            A primeira linha tem os títulos. <strong>Nome</strong> e <strong>Telefone</strong> são obrigatórios;{" "}
            Email, Cidade, Valor previsto e Estado são opcionais.
          </p>
          <p>Sem estado, o cliente entra como Novo. Clientes com um email que já existe no CRM ficam como estão.</p>
          <p>Se a automação de tarefas estiver ligada, cada cliente com responsável recebe a tarefa “Contactar”.</p>
          <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(MODELO)}`} download="modelo-clientes.csv" className={styles.linkModelo}>
            <Icone nome="folha" tamanho={15} /> Descarregar ficheiro de exemplo
          </a>
        </div>
      </aside>
    </form>
  );
}
