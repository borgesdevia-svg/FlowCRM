import BarraTopo from "@/components/BarraTopo";
import Rodape from "@/components/Rodape";
import styles from "./privacidade.module.css";

// Página "Privacidade e termos" (rota /privacidade).
// Componente de servidor: só mostra texto, não precisa de correr no browser.
// O texto descreve o que a aplicação faz de facto com os dados.
// Não é um documento jurídico revisto por um advogado.

export const metadata = {
  title: "Privacidade e termos · FlowCRM",
};

export default function Privacidade() {
  return (
    <>
      <BarraTopo />
      <main className={styles.pagina}>
        <h1>Privacidade e termos</h1>
        <p className={styles.atualizado}>Última atualização: novembro de 2026</p>

        <h2>Que dados guardamos</h2>
        <p>
          Guardamos os dados da conta (nome, email e empresa) e os dados que cada empresa introduz no
          CRM: clientes, notas, tarefas e pedidos de contacto recebidos pelo formulário público.
        </p>

        <h2>Como os protegemos</h2>
        <ul>
          <li>As passwords nunca são guardadas em texto simples: o serviço de autenticação guarda-as cifradas.</li>
          <li>
            A base de dados tem regras de segurança que separam as empresas: um utilizador só consegue ler
            os dados da sua própria empresa.
          </li>
          <li>Não vendemos nem partilhamos os dados com terceiros para publicidade.</li>
        </ul>

        <h2>Formulário público e emails</h2>
        <p>
          Quem preenche o formulário público de uma empresa passa a ser um contacto dessa empresa no
          FlowCRM e pode receber um email automático de boas-vindas. Para deixar de ser contactado ou
          pedir que os dados sejam apagados, deve falar com a empresa a quem enviou o pedido.
        </p>

        <h2>Os teus direitos</h2>
        <p>
          Podes pedir para ver, corrigir ou apagar os teus dados. O administrador de cada empresa pode
          editar e eliminar clientes diretamente no painel.
        </p>

        <h2 id="termos">Termos de utilização</h2>
        <ul>
          <li>O FlowCRM está em desenvolvimento e é disponibilizado tal como está, sem garantias.</li>
          <li>Cada empresa é responsável pelos dados que introduz e por ter autorização para os usar.</li>
          <li>Não é permitido usar o FlowCRM para enviar spam ou guardar dados obtidos de forma ilegal.</li>
        </ul>
      </main>
      <Rodape />
    </>
  );
}
