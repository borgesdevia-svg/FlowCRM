import Link from "next/link";
import { notFound } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import FormProposta from "@/components/propostas/FormProposta";
import AvisoPro from "@/components/painel/AvisoPro";
import styles from "@/components/propostas/Propostas.module.css";
import ficha from "../../ficha.module.css";

// /painel/clientes/[id]/proposta — criar uma proposta para um lead (CRM Pro)
export const metadata = { title: "Nova proposta · FlowCRM" };

const REGEX_UUID = /^[0-9a-f-]{36}$/i;

export default async function PaginaNovaProposta({ params }) {
  const { id } = await params;
  if (!REGEX_UUID.test(id)) notFound();

  const { supabase, plano } = await obterSessao();
  // o RLS só devolve o lead se a pessoa o puder ver
  const { data: cliente } = await supabase.from("clientes").select("id, nome, valor_previsto").eq("id", id).maybeSingle();
  if (!cliente) notFound();

  return (
    <div className={styles.pagina}>
      <Link href={`/painel/clientes/${cliente.id}`} className={ficha.voltar}>
        {cliente.nome}
      </Link>
      <header className={styles.cabecalho}>
        <h1>Nova proposta para {cliente.nome}</h1>
        <p>O cliente recebe um link, vê o orçamento com o logótipo da empresa e aceita online.</p>
      </header>
      {plano.pro ? (
        <FormProposta clienteId={cliente.id} valorPrevisto={cliente.valor_previsto} />
      ) : (
        <AvisoPro
          plano={plano}
          titulo="As propostas são do CRM Pro"
          texto="Cria orçamentos com linhas e total, envia o link e o cliente aceita online. O lead passa sozinho a Ativo."
        />
      )}
    </div>
  );
}
