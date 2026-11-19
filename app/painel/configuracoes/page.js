import { redirect } from "next/navigation";
import { obterSessao, obterAparencia } from "@/lib/sessao";
import EditorAparencia from "@/components/configuracoes/EditorAparencia";
import styles from "../formulario/personalizar.module.css";

// Rota /painel/configuracoes — o administrador escolhe o aspeto do CRM para toda a empresa:
// modelo de design (claro ou escuro), gráfico do Início e nome/ordem dos itens do menu.
export const metadata = { title: "Configurações · FlowCRM" };

export default async function PaginaConfiguracoes() {
  const { eAdmin } = await obterSessao();
  if (!eAdmin) redirect("/painel");

  const aparencia = await obterAparencia();

  return (
    <div className={`entrar ${styles.pagina}`}>
      <header className={styles.cabecalho}>
        <div>
          <h1>Configurações</h1>
          <p className={styles.resumo}>O aspeto do CRM para toda a equipa: design, claro ou escuro, gráfico do Início e menu.</p>
        </div>
      </header>

      <EditorAparencia inicial={aparencia} />
    </div>
  );
}
