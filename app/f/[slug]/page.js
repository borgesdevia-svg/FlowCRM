import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import FormLead from "@/components/formulario/FormLead";
import styles from "./formulario.module.css";

// Rota PÚBLICA /f/[slug] — o formulário de contacto de cada empresa.
// Não precisa de login. O [slug] identifica a empresa (ex.: /f/padaria-central).

// lê o nome, o logótipo e as perguntas da empresa com a função pública "formulario_publico",
// que só devolve isso (nunca outros dados da empresa). cache(): a página e o título
// do separador pedem a mesma coisa, assim só vai uma vez à base de dados.
const obterFormulario = cache(async function obterFormulario(slug) {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc("formulario_publico", { p_slug: slug });
  return data;
});

// título do separador do browser com o nome da empresa
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const formulario = await obterFormulario(slug);
  return { title: formulario ? `Contactar ${formulario.nome}` : "Formulário não encontrado" };
}

export default async function PaginaFormulario({ params }) {
  const { slug } = await params;
  const formulario = await obterFormulario(slug);

  // slug que não existe -> página 404
  if (!formulario) notFound();
  const nomeEmpresa = formulario.nome;

  return (
    <main className={styles.pagina}>
      <div className={styles.cartao}>
        {formulario.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={formulario.logo_url} alt={`Logótipo da ${nomeEmpresa}`} className={styles.logo} />
        ) : (
          <span className={styles.inicial} aria-hidden="true">
            {nomeEmpresa[0].toUpperCase()}
          </span>
        )}
        <h1>{nomeEmpresa}</h1>
        <p className={styles.subtitulo}>
          Deixa o teu contacto e respondemos o mais depressa possível.
        </p>
        <FormLead slug={slug} nomeEmpresa={nomeEmpresa} perguntas={formulario.perguntas ?? []} />
      </div>

      <p className={styles.marca}>
        Formulário criado com <Link href="/">FlowCRM</Link>
      </p>
    </main>
  );
}
