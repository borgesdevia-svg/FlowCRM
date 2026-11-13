import Link from "next/link";
import { obterSessao } from "@/lib/sessao";
import FormCliente from "@/components/clientes/FormCliente";
import Icone from "@/components/Icone";
import styles from "./novo.module.css";

// Rota /painel/clientes/novo — adicionar um cliente à mão
export const metadata = { title: "Novo cliente · FlowCRM" };

export default async function PaginaNovoCliente() {
  const { supabase, perfil, empresa, eAdmin } = await obterSessao();

  // o admin escolhe o responsável: precisa da lista da equipa
  let membros = null;
  if (eAdmin) {
    const { data } = await supabase.from("perfis").select("id, nome").order("nome");
    membros = data ?? [];
  }

  return (
    <div className={`entrar ${styles.pagina}`}>
      {/* cabeçalho igual ao das outras páginas do painel */}
      <header className={styles.cabecalho}>
        <Link href="/painel/clientes" className={styles.voltar}>
          Clientes
        </Link>
        <h1>Novo cliente</h1>
        <p className={styles.resumo}>
          {eAdmin
            ? "Podes atribuí-lo já a um comercial ou deixar para depois."
            : "Vais ficar como responsável por este cliente."}
        </p>
      </header>

      <div>
        {/* por defeito o admin fica responsável pelo cliente que cria.
            comPrevia: mostra o cartão do cliente a ser preenchido enquanto se escreve */}
        <FormCliente membros={membros} cliente={eAdmin ? { responsavel_id: perfil.id } : {}} comPrevia>
          {/* dica por baixo da pré-visualização (vai como "children" do formulário) */}
          <div className={styles.dica}>
            <Icone nome="raio" tamanho={18} className={styles.iconeDica} />
            <p>
              Os contactos que chegam pelo <strong>formulário público</strong> entram aqui sozinhos, na fase Novo.
            </p>
            <Link href={`/f/${empresa.slug}`} target="_blank" className={styles.linkDica}>
              Abrir formulário <Icone nome="externo" tamanho={13} />
            </Link>
          </div>
        </FormCliente>
      </div>
    </div>
  );
}
