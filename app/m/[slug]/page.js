import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eSlug } from "@/lib/validacao";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { TEXTOS_MARCACOES, diasComHorarios, normalizarConfig } from "@/lib/marcacoes";
import CartaoFormulario, { CenaFormulario } from "@/components/formulario/CartaoFormulario";
import EscolherHorario from "@/components/marcacoes/EscolherHorario";
import { normalizarDesign } from "@/lib/formularioDesign";
import styles from "@/app/f/[slug]/formulario.module.css";

// Rota PÚBLICA /m/[slug] — marcações online de cada empresa (migração 36).
// O cliente escolhe um dia e uma hora livres e deixa o contacto. Não precisa de login.
// Usa o mesmo aspeto do formulário público (logótipo, cor e design escolhidos pela empresa).
// É sempre feita no momento (lê os cookies da sessão), por isso os horários livres estão sempre atualizados.

// nome, logótipo e design da empresa (a mesma função pública do formulário) + horário e horas ocupadas.
// O horário e as marcações leem-se com a chave secreta (o visitante não tem sessão);
// para o browser só vão as horas livres, nunca quem marcou.
const obterMarcacoes = cache(async function obterMarcacoes(slug) {
  if (!eSlug(slug)) return null;
  const supabase = await criarClienteServidor();
  const { data: formulario } = await supabase.rpc("formulario_publico", { p_slug: slug });
  if (!formulario) return null;

  const admin = criarClienteAdmin();
  const { data: empresa } = await admin.from("empresas").select("id").eq("slug", slug).maybeSingle();
  if (!empresa) return null;
  const { data: bruto } = await admin.from("marcacoes_config").select("*").eq("empresa_id", empresa.id).maybeSingle();
  const config = normalizarConfig(bruto);
  if (!bruto || !config.ligada) return null;

  const agora = Date.now();
  const { data: ocupados } = await admin
    .from("marcacoes")
    .select("inicio, fim")
    .eq("empresa_id", empresa.id)
    .eq("estado", "marcada")
    .gte("fim", new Date(agora).toISOString())
    .lte("inicio", new Date(agora + (config.dias_frente + 2) * 86400000).toISOString())
    .limit(5000);

  return { formulario, config, dias: diasComHorarios({ config, ocupados: ocupados ?? [], agora }) };
});

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const dados = await obterMarcacoes(slug);
  return { title: dados ? `Marcar com ${dados.formulario.nome}` : "Marcações indisponíveis" };
}

export default async function PaginaMarcacoes({ params }) {
  const { slug } = await params;
  const dados = await obterMarcacoes(slug);
  if (!dados) notFound();
  const { formulario, config, dias } = dados;
  const design = normalizarDesign(formulario.design);

  return (
    <CenaFormulario as="main" design={design} className={styles.pagina}>
      <CartaoFormulario
        design={design}
        nome={formulario.nome}
        logo={formulario.logo_url}
        titulo={config.titulo ?? TEXTOS_MARCACOES.titulo}
        texto={config.texto ?? TEXTOS_MARCACOES.texto(config.duracao)}
      >
        <EscolherHorario slug={slug} dias={dias} nomeEmpresa={formulario.nome} />
      </CartaoFormulario>

      <p className={styles.marca}>
        Marcações com <Link href="/">FlowCRM</Link>
      </p>
    </CenaFormulario>
  );
}
