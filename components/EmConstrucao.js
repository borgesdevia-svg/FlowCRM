import Link from "next/link";
import BarraTopo from "./BarraTopo";

// Página provisória para rotas que ainda não foram feitas.
// Recebe "props" (parâmetros): o título a mostrar.
// Exemplo de uso: <EmConstrucao titulo="Entrar" />
export default function EmConstrucao({ titulo }) {
  return (
    <>
      <BarraTopo />
      <main style={{ maxWidth: 480, margin: "80px auto", padding: 16, textAlign: "center" }}>
        <h1 style={{ marginBottom: 12 }}>{titulo}</h1>
        <p style={{ color: "var(--cor-texto-suave)", marginBottom: 24 }}>
          Esta página ainda está em construção.
        </p>
        <Link href="/" className="botao botao-secundario">
          Voltar ao início
        </Link>
      </main>
    </>
  );
}
