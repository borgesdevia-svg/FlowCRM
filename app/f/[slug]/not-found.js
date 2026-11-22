import styles from "@/app/estados-pagina.module.css";

// Formulário que não existe (link errado ou empresa apagada).
// Quem chega aqui é um cliente da empresa, não um utilizador do CRM: sem "Ir para o painel".
export default function FormularioNaoEncontrado() {
  return (
    <main className={styles.pagina}>
      <h1>Este formulário não existe</h1>
      <p className={styles.texto}>
        O link pode estar errado ou o formulário já não estar disponível. Confirma o link com a empresa que to enviou.
      </p>
    </main>
  );
}
