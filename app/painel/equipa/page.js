import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { ESTADOS, formatarEuros, formatarData } from "@/lib/estados";
import { iniciais } from "@/lib/texto";
import FormMembro from "@/components/equipa/FormMembro";
import BotaoRemover from "@/components/equipa/BotaoRemover";
import Icone from "@/components/Icone";
import styles from "./equipa.module.css";

// Rota /painel/equipa — só o admin pode ver esta página.
export const metadata = { title: "Equipa · FlowCRM" };

// o que cada papel pode fazer (aparece no cartão da direita)
const PAPEIS = [
  {
    nome: "Admin",
    itens: ["Vê todos os clientes da empresa", "Atribui clientes aos comerciais", "Gere a equipa"],
  },
  {
    nome: "Comercial",
    itens: ["Vê só os clientes de que é responsável", "Gere as suas tarefas e notas"],
  },
];

export default async function PaginaEquipa() {
  const { supabase, perfil, eAdmin } = await obterSessao();

  // proteção no servidor: um comercial que escreva o endereço à mão volta ao painel
  if (!eAdmin) redirect("/painel");

  // Três consultas independentes, feitas ao mesmo tempo.
  // O RLS garante que só vêm dados da empresa do admin.
  const [{ data: membros }, { data: clientes }, { data: tarefas }] = await Promise.all([
    supabase.from("perfis").select("id, nome, email, papel, criado_em").order("criado_em"),
    supabase.from("clientes").select("responsavel_id, estado, valor_previsto"),
    supabase.from("tarefas").select("responsavel_id").eq("concluida", false),
  ]);

  // Números de cada membro. Começamos com tudo a zero e depois
  // percorremos os clientes e as tarefas uma vez, somando a quem pertencem.
  const numeros = {};
  for (const m of membros ?? []) {
    numeros[m.id] = { clientes: 0, porEstado: {}, emAberto: 0, tarefas: 0 };
  }
  let porAtribuir = 0;
  for (const c of clientes ?? []) {
    const n = numeros[c.responsavel_id];
    if (!n) {
      porAtribuir++; // cliente sem responsável
      continue;
    }
    n.clientes++;
    n.porEstado[c.estado] = (n.porEstado[c.estado] ?? 0) + 1;
    // "em aberto" = negócios ainda por decidir (novo + em negociação)
    if (c.estado === "novo" || c.estado === "negociacao") n.emAberto += Number(c.valor_previsto) || 0;
  }
  for (const t of tarefas ?? []) {
    if (numeros[t.responsavel_id]) numeros[t.responsavel_id].tarefas++;
  }

  const lista = membros ?? [];
  const nAdmins = lista.filter((m) => m.papel === "admin").length;
  const nComerciais = lista.length - nAdmins;

  return (
    <div className={styles.pagina}>
      {/* cabeçalho igual ao das outras páginas do painel */}
      <header className={`entrar ${styles.cabecalho}`}>
        <h1>Equipa.</h1>
        <p className={styles.resumo}>
          {lista.length} {lista.length === 1 ? "membro" : "membros"}
          <span>·</span>
          {nAdmins} {nAdmins === 1 ? "admin" : "admins"}
          <span>·</span>
          {nComerciais} {nComerciais === 1 ? "comercial" : "comerciais"}
          {porAtribuir > 0 && (
            <>
              <span>·</span>
              <em className={styles.porAtribuir}>
                {porAtribuir} {porAtribuir === 1 ? "cliente por atribuir" : "clientes por atribuir"}
              </em>
            </>
          )}
        </p>
      </header>

      <div className={styles.grelha}>
        {/* ---------- cartões dos membros ---------- */}
        <section className={styles.membros} aria-label="Membros da equipa">
          {lista.map((m, i) => {
            const n = numeros[m.id];
            const eu = m.id === perfil.id;
            return (
              <article
                key={m.id}
                className={`entrar ${styles.membro}`}
                style={{ "--atraso": `${80 + Math.min(i, 8) * 50}ms` }}
              >
                <header className={styles.topoMembro}>
                  <span className={m.papel === "admin" ? `${styles.avatar} ${styles.avatarAdmin}` : styles.avatar}>
                    {iniciais(m.nome)}
                  </span>
                  <div className={styles.dados}>
                    <strong>
                      {m.nome} {eu && <em>(tu)</em>}
                    </strong>
                    <small>{m.email}</small>
                  </div>
                  <span className={m.papel === "admin" ? styles.papelAdmin : styles.papel}>
                    {m.papel === "admin" ? "Admin" : "Comercial"}
                  </span>
                </header>

                {/* três números desta pessoa */}
                <dl className={styles.numeros}>
                  <div>
                    <dt>Clientes</dt>
                    <dd>{n.clientes}</dd>
                  </div>
                  <div>
                    <dt>Em aberto</dt>
                    <dd>{formatarEuros(n.emAberto)}</dd>
                  </div>
                  <div>
                    <dt>Tarefas</dt>
                    <dd className={n.tarefas ? "" : styles.zero}>{n.tarefas}</dd>
                  </div>
                </dl>

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
                          title={`${e.texto}: ${n.porEstado[e.chave]}`}
                        ></span>
                      ) : null
                    )
                  )}
                </div>

                <footer className={styles.rodapeMembro}>
                  <small>Na equipa desde {formatarData(m.criado_em)}</small>
                  {/* não se pode remover a si próprio */}
                  {!eu && <BotaoRemover id={m.id} nome={m.nome} className={styles.remover} />}
                </footer>
              </article>
            );
          })}
        </section>

        {/* ---------- coluna da direita: adicionar + papéis ---------- */}
        <aside className={styles.lado}>
          <section className={`entrar ${styles.bloco}`} style={{ "--atraso": "120ms" }}>
            <h2>
              <Icone nome="utilizadorMais" tamanho={19} /> Adicionar comercial
            </h2>
            <p className={styles.ajuda}>
              A conta fica logo ativa. Depois, partilha o email e a password com essa pessoa.
            </p>
            <FormMembro />
          </section>

          <section className={`entrar ${styles.bloco}`} style={{ "--atraso": "180ms" }}>
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
