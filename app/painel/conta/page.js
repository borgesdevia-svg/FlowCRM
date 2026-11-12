import { obterSessao } from "@/lib/sessao";
import { FormNome, FormPassword } from "@/components/conta/FormsConta";
import styles from "./conta.module.css";

// Rota /painel/conta — dados da própria pessoa (qualquer papel pode entrar).
export const metadata = { title: "A minha conta · FlowCRM" };

export default async function PaginaConta() {
  const { perfil, empresa, eAdmin } = await obterSessao();

  return (
    <div className={styles.pagina}>
      <header>
        <h1>A minha conta</h1>
        <p className={styles.subtitulo}>
          {eAdmin ? "Administrador" : "Comercial"} em {empresa.nome}. Entras com {perfil.email}.
        </p>
      </header>

      <section className={styles.bloco}>
        <div className={styles.descricao}>
          <h2>Nome</h2>
          <p>É o nome que a tua equipa vê nos clientes e nas notas.</p>
        </div>
        <FormNome nomeAtual={perfil.nome} />
      </section>

      <section className={styles.bloco}>
        <div className={styles.descricao}>
          <h2>Password</h2>
          <p>Para tua segurança, pedimos a password atual antes de a mudar.</p>
        </div>
        <FormPassword />
      </section>
    </div>
  );
}
