import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { obterSessao, obterAparencia } from "@/lib/sessao";
import EditorAparencia from "@/components/configuracoes/EditorAparencia";
import FormLogo from "@/components/personalizar/FormLogo";
import { COOKIE_MODO, comModoPessoal } from "@/lib/aparencia";
import BlocoPlano from "@/components/painel/BlocoPlano";
import styles from "../formulario/personalizar.module.css";

// Rota /painel/configuracoes — o administrador escolhe o aspeto do CRM para toda a empresa:
// logótipo (menu e formulário), claro ou escuro, gráfico do Início e nome/ordem dos itens do menu.
export const metadata = { title: "Configurações · FlowCRM" };

export default async function PaginaConfiguracoes() {
  const { eAdmin, plano, empresa } = await obterSessao();
  if (!eAdmin) redirect("/painel");

  // mostra o modo que esta pessoa está a ver (o botão sol/lua passa à frente do da empresa)
  const aparencia = comModoPessoal(await obterAparencia(), (await cookies()).get(COOKIE_MODO)?.value);

  return (
    <div className={`entrar ${styles.pagina}`}>
      <header className={styles.cabecalho}>
        <div>
          <h1>Configurações</h1>
          <p className={styles.resumo}>O aspeto do CRM para toda a equipa: logótipo, claro ou escuro, gráfico do Início e menu.</p>
        </div>
        <BlocoPlano plano={plano} />
      </header>

      {/* ---------- logótipo: aparece no menu do CRM e no formulário público ---------- */}
      <section className={styles.cartaoLogo} aria-labelledby="t-logo">
        <div className={styles.textoLogo}>
          <h2 id="t-logo">Logótipo</h2>
          <p>
            Aparece no topo do menu do CRM e no formulário público
            {plano.pro ? "" : " (no formulário, só com o CRM Pro)"}. PNG, JPG ou WebP, até 1 MB. Fica guardado logo
            que o escolhes.
          </p>
        </div>
        <FormLogo logoAtual={empresa.logo_url} nomeEmpresa={empresa.nome} />
      </section>

      <EditorAparencia inicial={aparencia} />
    </div>
  );
}
