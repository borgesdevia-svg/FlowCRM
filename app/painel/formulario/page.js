import Link from "next/link";
import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import EditorFormulario from "@/components/personalizar/EditorFormulario";
import Icone from "@/components/Icone";
import styles from "./personalizar.module.css";

// Rota /painel/formulario — o administrador muda o formulário público da empresa:
// logótipo, cor, textos, perguntas e a mensagem depois de enviar.
// A página ocupa a largura toda: opções à esquerda, pré-visualização à direita.
export const metadata = { title: "Formulário · FlowCRM" };

export default async function PaginaPersonalizar() {
  const { supabase, perfil, empresa, eAdmin, plano } = await obterSessao();
  if (!eAdmin) redirect("/painel");

  const { data } = await supabase
    .from("empresas")
    .select("perguntas, form_cor, form_titulo, form_texto, form_design, obrigado_texto, obrigado_botao_texto, obrigado_botao_link")
    .eq("id", perfil.empresa_id)
    .single();

  // no formato do editor (textos vazios = usar os textos por defeito)
  const inicial = {
    marca: { cor: data?.form_cor ?? "verde", titulo: data?.form_titulo ?? "", texto: data?.form_texto ?? "" },
    design: data?.form_design ?? {},
    perguntas: data?.perguntas ?? [],
    depois: {
      mensagem: data?.obrigado_texto ?? "",
      botaoTexto: data?.obrigado_botao_texto ?? "",
      botaoLink: data?.obrigado_botao_link ?? "",
    },
  };

  return (
    <div className={`entrar ${styles.pagina}`}>
      <header className={styles.cabecalho}>
        <div>
          <h1>Formulário</h1>
          <p className={styles.resumo}>
            O formulário de contacto da {empresa.nome.replace(/\.$/, "")}: quem o preenche entra sozinho como lead
            novo.
          </p>
        </div>
        <Link href={`/f/${empresa.slug}`} target="_blank" className="botao botao-secundario">
          Abrir formulário <Icone nome="externo" tamanho={14} />
        </Link>
      </header>

      <EditorFormulario
        inicial={inicial}
        nomeEmpresa={empresa.nome}
        logo={empresa.logo_url}
        plano={plano}
        // design feito no Pro: o formulário público fica com ele mesmo no Essencial (migração 27)
        designGuardado={Object.keys(data?.form_design ?? {}).length > 0}
      />
    </div>
  );
}
