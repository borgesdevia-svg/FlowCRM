import Link from "next/link";
import { notFound } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import FormLead from "@/components/formulario/FormLead";
import styles from "./formulario.module.css";

// Rota PÚBLICA /f/[slug] — o formulário de contacto de cada empresa.
// Não precisa de login. O [slug] identifica a empresa (ex.: /f/padaria-central).

// lê o nome da empresa com a função pública "nome_empresa_publico",
// que só devolve o nome (nunca outros dados da empresa)
async function obterNomeEmpresa(slug) {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc("nome_empresa_publico", { p_slug: slug });
  return data;
}

// título do separador do browser com o nome da empresa
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const nome = await obterNomeEmpresa(slug);
  return { title: nome ? `Contactar ${nome}` : "Formulário não encontrado" };
}

export default async function PaginaFormulario({ params }) {
  const { slug } = await params;
  const nomeEmpresa = await obterNomeEmpresa(slug);

  // slug que não existe -> página 404
  if (!nomeEmpresa) notFound();

  return (
    <main className={styles.pagina}>
      <div className={styles.cartao}>
        <span className={styles.inicial} aria-hidden="true">
          {nomeEmpresa[0].toUpperCase()}
        </span>
        <h1>{nomeEmpresa}</h1>
        <p className={styles.subtitulo}>
          Deixa o teu contacto e respondemos o mais depressa possível.
        </p>
        <FormLead slug={slug} nomeEmpresa={nomeEmpresa} />
      </div>

      <p className={styles.marca}>
        Formulário criado com <Link href="/">FlowCRM</Link>
      </p>
    </main>
  );
}
