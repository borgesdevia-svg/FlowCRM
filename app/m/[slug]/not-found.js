import styles from "@/app/estados-pagina.module.css";

// Página de marcações que não existe ou está desligada (link errado, empresa apagada,
// ou a empresa desligou as marcações online). Quem chega aqui é um cliente, não um utilizador do CRM.
export default function MarcacoesNaoEncontradas() {
  return (
    <main className={styles.pagina}>
      <h1>Marcações indisponíveis</h1>
      <p className={styles.texto}>
        O link pode estar errado ou a empresa não está a aceitar marcações online de momento. Contacta-a diretamente.
      </p>
    </main>
  );
}
