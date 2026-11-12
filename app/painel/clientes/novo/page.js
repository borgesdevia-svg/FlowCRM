import Link from "next/link";
import { obterSessao } from "@/lib/sessao";
import FormCliente from "@/components/clientes/FormCliente";
import styles from "../ficha.module.css";

// Rota /painel/clientes/novo — adicionar um cliente à mão
export const metadata = { title: "Adicionar cliente · FlowCRM" };

export default async function PaginaNovoCliente() {
  const { supabase, perfil, eAdmin } = await obterSessao();

  // o admin escolhe o responsável: precisa da lista da equipa
  let membros = null;
  if (eAdmin) {
    const { data } = await supabase.from("perfis").select("id, nome").order("nome");
    membros = data ?? [];
  }

  return (
    <div className={styles.pagina}>
      <Link href="/painel/clientes" className={styles.voltar}>
        Clientes
      </Link>
      <h1>Adicionar cliente</h1>
      <p className={styles.subtitulo}>
        {eAdmin ? "Podes atribuí-lo já a um comercial ou deixar para depois." : "Vais ficar como responsável por este cliente."}
      </p>
      {/* por defeito o admin fica responsável pelo cliente que cria */}
      <FormCliente membros={membros} cliente={eAdmin ? { responsavel_id: perfil.id } : {}} />
    </div>
  );
}
