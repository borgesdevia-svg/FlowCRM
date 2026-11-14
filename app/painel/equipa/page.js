import Link from "next/link";
import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { ESTADOS, formatarEuros } from "@/lib/estados";
import FormMembro from "@/components/equipa/FormMembro";
import BotaoRemover from "@/components/equipa/BotaoRemover";
import SeletorPapel from "@/components/equipa/SeletorPapel";
import Icone from "@/components/Icone";
import styles from "./equipa.module.css";

// Rota /painel/equipa — só o admin pode ver esta página.
export const metadata = { title: "Equipa · FlowCRM" };

// o que cada papel pode fazer (aparece no cartão da direita)
const PAPEIS = [
  {
    nome: "Dono",
    itens: ["Quem criou a empresa no FlowCRM", "Pode fazer tudo o que um administrador faz", "Ninguém o pode remover"],
  },
  {
    nome: "Administrador",
    itens: ["Vê todos os clientes da empresa", "Atribui clientes aos comerciais", "Gere a equipa e personaliza o CRM"],
  },
  {
    nome: "Comercial",
    itens: ["Vê só os clientes de que é responsável", "Gere as suas tarefas e notas"],
  },
];

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
      <header className={styles.cabecalho}>
        <h1>Equipa</h1>
        <p className={styles.resumo}>
          {lista.length} {lista.length === 1 ? "membro" : "membros"}: {nAdmins}{" "}
          {nAdmins === 1 ? "administrador" : "administradores"} e {nComerciais} {nComerciais === 1 ? "comercial" : "comerciais"}.
          {porAtribuir > 0 && (
            <>
              {" "}
              <Link href="/painel/clientes" className={styles.porAtribuir}>
                {porAtribuir} {porAtribuir === 1 ? "cliente está por atribuir" : "clientes estão por atribuir"}.
              </Link>
            </>
          )}
        </p>
      </header>

      <div className={styles.grelha}>
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
                        <div className={styles.membro}>
                          <div className={styles.dados}>
                            <strong>
                              {m.nome} {eu && <em>(tu)</em>}
                            </strong>
                            <small>{m.email}</small>
                          </div>
                        </div>
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
                        {/* ninguém se remove a si próprio, e o dono nunca é removido */}
                        {!eu && m.id !== empresa.dono_id && <BotaoRemover id={m.id} nome={m.nome} className={styles.remover} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---------- coluna da direita: adicionar + papéis ---------- */}
        <aside className={styles.lado}>
          <section className={styles.bloco}>
            <h2>
              <Icone nome="utilizadorMais" tamanho={19} /> Adicionar membro
            </h2>
            <p className={styles.ajuda}>
              A conta fica logo ativa. Depois, partilha o email e a password com essa pessoa.
            </p>
            <FormMembro />
          </section>

          <section className={styles.bloco}>
            <h2>
              <Icone nome="cadeado" tamanho={18} /> Papéis
            </h2>
            <div className={styles.papeis}>
              {PAPEIS.map((p) => (
                <div key={p.nome}>
                  <h3>{p.nome}</h3>
                  <ul>
                    {p.itens.map((item) => (
                      <li key={item}>
                        <Icone nome="visto" tamanho={15} className={styles.visto} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
