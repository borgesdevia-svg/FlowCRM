import Link from "next/link";
import { obterSessao } from "@/lib/sessao";
import { obterContaEmail } from "@/lib/email/conta";
import { FormModeloEmail } from "@/components/conta/FormsConta";
import ModelosEmail from "@/components/emails/ModelosEmail";
import styles from "./emails.module.css";

// Rota /painel/emails — as definições de e-mail da própria pessoa (qualquer papel):
//  · a conta ligada (só o estado; ligar/desligar é em A minha conta › Conta de e-mail)
//  · a mensagem do início (o texto que vai no início de todos os e-mails)
//  · os modelos de e-mail (e-mails pré-definidos para usar na ficha do lead)
export const metadata = { title: "E-mails · FlowCRM" };

export default async function PaginaEmails() {
  const { supabase, perfil } = await obterSessao();
  const [conta, { data: modelos }] = await Promise.all([
    obterContaEmail(perfil.id),
    supabase
      .from("email_modelos")
      .select("id, nome, assunto, corpo")
      .eq("perfil_id", perfil.id)
      .order("nome")
      .limit(100),
  ]);

  return (
    <div className={`entrar ${styles.pagina}`}>
      <header className={styles.cabecalho}>
        <h1>E-mails</h1>
        <p className={styles.resumo}>
          {conta ? (
            <>
              Os e-mails saem pela tua conta <strong>{conta.email}</strong>.{" "}
              <Link href="/painel/conta?sec=email">Mudar a conta</Link>
            </>
          ) : (
            <>
              Ainda não ligaste a tua conta de e-mail, por isso não dá para enviar e-mails pelo CRM.{" "}
              <Link href="/painel/conta?sec=email">Ligar a minha conta</Link>
            </>
          )}
        </p>
      </header>

      <div className={styles.colunas}>
        <section className={styles.cartao} aria-labelledby="t-inicio">
          <div className={styles.topoCartao}>
            <h2 id="t-inicio">Mensagem do início</h2>
            <p>
              O que escreves sempre no início de todos os e-mails. A janela de escrever abre com este texto, para não o
              teres de escrever sempre.
            </p>
          </div>
          <FormModeloEmail modelo={perfil.email_modelo} />
        </section>

        <section className={styles.cartao} aria-labelledby="t-modelos">
          <div className={styles.topoCartao}>
            <h2 id="t-modelos">Modelos de e-mail</h2>
            <p>
              E-mails que envias muitas vezes (ex.: a proposta, um seguimento). Na ficha do lead escolhes um e o assunto e o
              texto ficam escritos.
            </p>
          </div>
          <ModelosEmail modelos={modelos ?? []} />
        </section>
      </div>
    </div>
  );
}
