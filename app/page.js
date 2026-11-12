import styles from "./page.module.css";

// Esta página é um COMPONENTE DE SERVIDOR (não tem "use client"):
// corre no servidor, e o browser só recebe o HTML final.
// Por agora serve para confirmar que a ligação ao Supabase funciona (Fase 0).
// Mais tarde vai ser a landing page do FlowCRM.

// Gera a página a cada visita (e não só uma vez no "build"),
// para o estado da ligação estar sempre atualizado.
export const dynamic = "force-dynamic";

// Pergunta ao serviço de autenticação do Supabase se está a responder.
async function verificarLigacao() {
  try {
    const resposta = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`,
      { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } }
    );
    return resposta.ok;
  } catch {
    // sem internet, URL errado, variáveis em falta...
    return false;
  }
}

export default async function Inicio() {
  const ligado = await verificarLigacao();

  return (
    <main className={styles.pagina}>
      <div className={styles.cartao}>
        <h1 className={styles.titulo}>
          Flow<span>CRM</span>
        </h1>
        <p className={styles.subtitulo}>
          Gestão de clientes e automação de emails.
        </p>

        {ligado ? (
          <p className={`${styles.estado} ${styles.ok}`}>
            Ligação ao Supabase: OK
          </p>
        ) : (
          <p className={`${styles.estado} ${styles.erro}`}>
            Sem ligação ao Supabase. Verifica o ficheiro .env.local.
          </p>
        )}
      </div>
    </main>
  );
}
