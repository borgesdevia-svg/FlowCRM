import Link from "next/link";
import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import FormLogo from "@/components/personalizar/FormLogo";
import EditorPerguntas from "@/components/personalizar/EditorPerguntas";
import Icone from "@/components/Icone";
import styles from "./personalizar.module.css";

// Rota /painel/personalizar — o administrador muda o logótipo e as perguntas do formulário público.
export const metadata = { title: "Personalizar · FlowCRM" };

export default async function PaginaPersonalizar() {
  const { supabase, perfil, empresa, eAdmin } = await obterSessao();
  if (!eAdmin) redirect("/painel");

  const { data } = await supabase.from("empresas").select("perguntas").eq("id", perfil.empresa_id).single();
  const perguntas = data?.perguntas ?? [];

  return (
    <div className={`entrar ${styles.pagina}`}>
      <header className={styles.cabecalho}>
        <h1>Personalizar</h1>
        <p className={styles.resumo}>
          O logótipo e o formulário de contacto da {empresa.nome.endsWith(".") ? empresa.nome : `${empresa.nome}.`}
        </p>
      </header>

      <section className={styles.bloco} aria-labelledby="titulo-logo">
        <div className={styles.descricao}>
          <h2 id="titulo-logo">
            <Icone nome="imagem" tamanho={18} /> Logótipo
          </h2>
          <p>Aparece no menu do CRM, para toda a equipa, e no topo do formulário público. PNG, JPG ou WebP, até 1 MB.</p>
        </div>
        <FormLogo logoAtual={empresa.logo_url} nomeEmpresa={empresa.nome} />
      </section>

      <section className={styles.blocoLargo} aria-labelledby="titulo-perguntas">
        <div className={styles.topoBloco}>
          <div className={styles.descricao}>
            <h2 id="titulo-perguntas">
              <Icone nome="pergunta" tamanho={18} /> Perguntas do formulário
            </h2>
            <p>
              Nome, email e telefone estão sempre no formulário. Junta até 10 perguntas tuas: as respostas aparecem na
              ficha do cliente.
            </p>
          </div>
          <Link href={`/f/${empresa.slug}`} target="_blank" className="botao botao-secundario">
            Abrir formulário <Icone nome="externo" tamanho={14} />
          </Link>
        </div>
        <EditorPerguntas inicial={perguntas} nomeEmpresa={empresa.nome} logo={empresa.logo_url} />
      </section>
    </div>
  );
}
