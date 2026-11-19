import Link from "next/link";
import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { ESTADOS, formatarEuros } from "@/lib/estados";
import BotaoRemover from "@/components/equipa/BotaoRemover";
import SeletorPapel from "@/components/equipa/SeletorPapel";
import Icone from "@/components/Icone";
import { iniciais } from "@/lib/texto";
import styles from "./equipa.module.css";

// Rota /painel/equipa — só o admin pode ver esta página.
// Só a tabela da equipa: adicionar um membro é na página /painel/equipa/novo
// e os detalhes de cada um (ações, tarefas, clientes) em /painel/equipa/[id].
export const metadata = { title: "Equipa · FlowCRM" };

export default async function PaginaEquipa() {
  const { supabase, perfil, empresa, eAdmin } = await obterSessao();

  // proteção no servidor: um comercial que escreva o endereço à mão volta ao painel
  if (!eAdmin) redirect("/painel");

  // Três consultas independentes, feitas ao mesmo tempo.
  // O RLS garante que só vêm dados da empresa do admin.
  // ESCALA: os clientes e as tarefas vêm já contados pela base de dados (migração 12),
  // uma linha por pessoa e estado, em vez de virem todos (o que falhava acima de 1000).
  const [{ data: membros }, { data: resumo }, { data: tarefas }] = await Promise.all([
    supabase.from("perfis").select("id, nome, email, papel, criado_em").order("criado_em"),
    supabase.rpc("resumo_equipa"),
    supabase.rpc("tarefas_por_pessoa"),
  ]);

  // Números de cada membro. Começamos com tudo a zero e depois
  // somamos cada linha do resumo à pessoa a quem pertence.
  const numeros = {};
  for (const m of membros ?? []) {
    numeros[m.id] = { clientes: 0, porEstado: {}, emAberto: 0, tarefas: 0 };
  }
  let porAtribuir = 0;
  for (const r of resumo ?? []) {
    const quantos = Number(r.n);
    const n = numeros[r.responsavel_id];
    if (!n) {
      porAtribuir += quantos; // clientes sem responsável
      continue;
    }
    n.clientes += quantos;
    n.porEstado[r.estado] = (n.porEstado[r.estado] ?? 0) + quantos;
    // "em aberto" = negócios ainda por decidir (novo + em negociação)
    if (r.estado === "novo" || r.estado === "negociacao") n.emAberto += Number(r.soma) || 0;
  }
  for (const t of tarefas ?? []) {
    if (numeros[t.responsavel_id]) numeros[t.responsavel_id].tarefas = Number(t.n);
  }

  const lista = membros ?? [];
  const nAdmins = lista.filter((m) => m.papel === "admin").length;
  const nComerciais = lista.length - nAdmins;
  // nome de cada papel (o dono é um administrador especial)
  const nomePapel = (m) => (m.id === empresa.dono_id ? "Dono" : m.papel === "admin" ? "Administrador" : "Comercial");

  return (
    <div className={`entrar ${styles.pagina}`}>
      <header className={`${styles.cabecalho} ${styles.cabecalhoComBotao}`}>
        <div>
          <h1>Equipa</h1>
          <p className={styles.resumo}>
            {lista.length} {lista.length === 1 ? "membro" : "membros"}: {nAdmins}{" "}
            {nAdmins === 1 ? "administrador" : "administradores"} e {nComerciais}{" "}
            {nComerciais === 1 ? "comercial" : "comerciais"}.
            {porAtribuir > 0 && (
              <>
                {" "}
                <Link href="/painel/clientes" className={styles.porAtribuir}>
                  {porAtribuir} {porAtribuir === 1 ? "cliente está por atribuir" : "clientes estão por atribuir"}.
                </Link>
              </>
            )}
          </p>
        </div>
        <Link href="/painel/equipa/novo" className="botao">
          <Icone nome="utilizadorMais" tamanho={17} /> Adicionar membro
        </Link>
      </header>

      {/* ---------- tabela dos membros (mesmo estilo da lista de clientes) ---------- */}
      <section className={styles.tabelaBloco} aria-label="Membros da equipa">
        <div className={styles.rolar}>
          <table className={styles.tabela}>
            <thead>
              <tr>
                <th>Membro</th>
                <th>Papel</th>
                <th className={styles.numero}>Clientes</th>
                <th className={styles.numero}>Em aberto</th>
                <th className={styles.numero}>Tarefas</th>
                <th aria-label="Ações"></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((m) => {
                const n = numeros[m.id];
                const eu = m.id === perfil.id;
                return (
                  <tr key={m.id}>
                    <td>
                      {/* nome com link para os detalhes do membro (ações, tarefas, clientes) */}
                      <Link href={`/painel/equipa/${m.id}`} className={styles.membro}>
                        <span className={styles.avatar} aria-hidden="true">
                          {iniciais(m.nome)}
                        </span>
                        <div className={styles.dados}>
                          <strong>
                            {m.nome} {eu && <em>(tu)</em>}
                          </strong>
                          <small>{m.email}</small>
                        </div>
                      </Link>
                    </td>
                    <td>
                      {/* o papel do próprio e o do dono não se mudam aqui; os outros têm um seletor */}
                      {eu || m.id === empresa.dono_id ? (
                        <span className={m.papel === "admin" ? styles.papelAdmin : styles.papel}>{nomePapel(m)}</span>
                      ) : (
                        <SeletorPapel id={m.id} nome={m.nome} papel={m.papel} />
                      )}
                    </td>
                    <td className={styles.numero}>
                      {n.clientes}
                      {/* barra com os clientes desta pessoa por fase (largura = nº de clientes) */}
                      <div className={styles.barra} aria-hidden="true">
                        {n.clientes === 0 ? (
                          <span className={styles.barraVazia}></span>
                        ) : (
                          ESTADOS.map((e) =>
                            n.porEstado[e.chave] ? (
                              <span
                                key={e.chave}
                                style={{ flexGrow: n.porEstado[e.chave], background: e.cor }}
                              ></span>
                            ) : null
                          )
                        )}
                      </div>
                    </td>
                    <td className={styles.numero}>{formatarEuros(n.emAberto)}</td>
                    <td className={n.tarefas ? styles.numero : `${styles.numero} ${styles.zero}`}>{n.tarefas}</td>
                    <td className={styles.acoes}>
                      <span className={styles.botoesLinha}>
                        <Link href={`/painel/equipa/${m.id}`} className={styles.verDetalhes}>
                          Ver detalhes <Icone nome="direita" tamanho={15} />
                        </Link>
                        {/* ninguém se remove a si próprio, e o dono nunca é removido */}
                        {!eu && m.id !== empresa.dono_id && <BotaoRemover id={m.id} nome={m.nome} className={styles.remover} />}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
