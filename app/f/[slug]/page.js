import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eSlug } from "@/lib/validacao";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { papelNaEmpresaDoFormulario } from "@/lib/sessao";
import FormLead from "@/components/formulario/FormLead";
import { limparCanal } from "@/lib/canais";
import CartaoFormulario, { CenaFormulario } from "@/components/formulario/CartaoFormulario";
import { normalizarDesign } from "@/lib/formularioDesign";
import styles from "./formulario.module.css";

// Rota PÚBLICA /f/[slug] — o formulário de contacto de cada empresa.
// Não precisa de login. O [slug] identifica a empresa (ex.: /f/padaria-central).

// lê o nome, o logótipo, a cor, os textos e as perguntas da empresa com a função pública "formulario_publico",
// que só devolve isso (nunca outros dados da empresa). cache(): a página e o título
// do separador pedem a mesma coisa, assim só vai uma vez à base de dados.
const obterFormulario = cache(async function obterFormulario(slug) {
  if (!eSlug(slug)) return null; // endereço estragado: 404 sem ir à base de dados
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

export default async function PaginaFormulario({ params, searchParams }) {
  const { slug } = await params;
  // de onde veio a pessoa: /f/<slug>?de=instagram (migração 35); limpo outra vez no servidor ao enviar
  const { de } = await searchParams;
  const canal = limparCanal(Array.isArray(de) ? de[0] : de);
  const formulario = await obterFormulario(slug);

  // slug que não existe -> página 404
  if (!formulario) notFound();
  const nomeEmpresa = formulario.nome;
  // design escolhido pela empresa (a base de dados só o devolve no CRM Pro; sem ele, o de sempre)
  const design = normalizarDesign(formulario.design);

  // quem já está na equipa não é cliente: o comercial não pode responder ao formulário
  // (o administrador pode, para o experimentar; o envio também é recusado no servidor)
  const supabase = await criarClienteServidor();
  const papel = await papelNaEmpresaDoFormulario(supabase, slug);

  return (
    // o fundo (cinzento, cor da marca, escuro...) com o formulário no meio
    <CenaFormulario as="main" design={design} className={styles.pagina}>
      <CartaoFormulario
        design={design}
        nome={nomeEmpresa}
        logo={formulario.logo_url}
        titulo={formulario.titulo}
        texto={formulario.texto}
      >
        {papel === "comercial" ? (
          <div className={styles.equipa}>
            <p>
              Já fazes parte da equipa da {nomeEmpresa}, por isso não respondes a este formulário: ele é para os
              leads. Partilha o link com eles e os contactos que chegarem aparecem no painel.
            </p>
            <Link href="/painel" className="botao">
              Voltar ao painel
            </Link>
          </div>
        ) : (
          <>
            {papel === "admin" && (
              <p className={styles.avisoAdmin}>
                Estás a ver como administrador. Se enviares, entra um lead novo na tua lista.
              </p>
            )}
            <FormLead
              slug={slug}
              canal={canal}
              nomeEmpresa={nomeEmpresa}
              perguntas={formulario.perguntas ?? []}
              textoBotao={design.botao}
              obrigado={{
                texto: formulario.obrigado_texto,
                botaoTexto: formulario.obrigado_botao_texto,
                botaoLink: formulario.obrigado_botao_link,
              }}
            />
          </>
        )}
      </CartaoFormulario>

      <p className={styles.marca}>
        Formulário criado com <Link href="/">FlowCRM</Link>
      </p>
    </CenaFormulario>
  );
}
