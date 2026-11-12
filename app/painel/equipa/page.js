import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import FormMembro from "@/components/equipa/FormMembro";
import BotaoRemover from "@/components/equipa/BotaoRemover";
import styles from "./equipa.module.css";

// Rota /painel/equipa — só o admin pode ver esta página.
export const metadata = { title: "Equipa · FlowCRM" };

export default async function PaginaEquipa() {
  const { supabase, perfil, eAdmin } = await obterSessao();

  // proteção no servidor: um comercial que escreva o endereço à mão volta ao painel
  if (!eAdmin) redirect("/painel");

  // o RLS garante que só vêm os perfis da empresa do admin
  const { data: membros } = await supabase
    .from("perfis")
    .select("id, nome, email, papel, criado_em")
    .order("criado_em");

  return (
    <div className={styles.pagina}>
      <header className="entrar">
        <h1>Equipa</h1>
        <p className={styles.subtitulo}>
          Adiciona os comerciais da tua empresa. Cada comercial só vê os clientes de que é responsável.
        </p>
      </header>

      <div className={styles.grelha}>
        {/* lista de membros */}
        <section className={`entrar ${styles.bloco}`} style={{ "--atraso": "100ms" }}>
          <h2>Membros ({membros?.length ?? 0})</h2>
          <ul className={styles.lista}>
            {(membros ?? []).map((m) => (
              <li key={m.id}>
                <span className={styles.avatar}>{m.nome[0].toUpperCase()}</span>
                <div className={styles.dados}>
                  <strong>
                    {m.nome} {m.id === perfil.id && <em>(tu)</em>}
                  </strong>
                  <small>{m.email}</small>
                </div>
                <span className={m.papel === "admin" ? styles.papelAdmin : styles.papel}>
                  {m.papel === "admin" ? "Admin" : "Comercial"}
                </span>
                {/* não se pode remover a si próprio */}
                {m.id !== perfil.id && <BotaoRemover id={m.id} nome={m.nome} />}
              </li>
            ))}
          </ul>
        </section>

        {/* formulário para adicionar */}
        <section className={`entrar ${styles.bloco}`} style={{ "--atraso": "150ms" }}>
          <h2>Adicionar comercial</h2>
          <FormMembro />
        </section>
      </div>
    </div>
  );
}
