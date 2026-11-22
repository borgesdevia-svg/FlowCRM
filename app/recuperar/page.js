import Link from "next/link";
import MolduraAuth from "@/components/auth/MolduraAuth";
import FormRecuperar from "@/components/auth/FormRecuperar";

// Rota /recuperar — "Esqueci-me da password", sem email:
// usa a chave de recuperação que cada pessoa guardou ao entrar no painel.
export const metadata = { title: "Recuperar password · FlowCRM" };

export default function PaginaRecuperar() {
  return (
    <MolduraAuth
      titulo="Recuperar a password"
      subtitulo="Usa a chave de recuperação que guardaste no teu computador."
      rodape={
        <>
          Lembraste-te? <Link href="/login">Voltar a entrar</Link>
        </>
      }
    >
      <FormRecuperar />
    </MolduraAuth>
  );
}
