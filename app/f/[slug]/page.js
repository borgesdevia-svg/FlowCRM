import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { papelNaEmpresaDoFormulario } from "@/lib/sessao";
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

  // quem já está na equipa não é cliente: o comercial não pode responder ao formulário
  // (o administrador pode, para o experimentar; o envio também é recusado no servidor)
  const supabase = await criarClienteServidor();
  const papel = await papelNaEmpresaDoFormulario(supabase, slug);

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
        {papel === "comercial" ? (
          <div className={styles.equipa}>
            <p>
              Já fazes parte da equipa da {nomeEmpresa}, por isso não respondes a este formulário: ele é para os
              clientes. Partilha o link com eles e os contactos que chegarem aparecem no painel.
            </p>
            <Link href="/painel" className="botao">
              Voltar ao painel
            </Link>
          </div>
        ) : (
          <>
            {papel === "admin" && (
              <p className={styles.avisoAdmin}>
                Estás a ver como administrador. Se enviares, entra um cliente novo na tua lista.
              </p>
            )}
            <FormLead slug={slug} nomeEmpresa={nomeEmpresa} perguntas={formulario.perguntas ?? []} />
          </>
        )}
      </div>

      <p className={styles.marca}>
        Formulário criado com <Link href="/">FlowCRM</Link>
      </p>
    </main>
  );
}
