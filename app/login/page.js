import Link from "next/link";
import MolduraAuth from "@/components/auth/MolduraAuth";
import FormLogin from "@/components/auth/FormLogin";

// Rota /login
export const metadata = { title: "Entrar · FlowCRM" };

export default function PaginaLogin() {
  return (
    <MolduraAuth
      titulo="Bem-vindo de volta"
      subtitulo="Entra para veres os teus clientes."
      rodape={
        <>
          Ainda não tens conta? <Link href="/registo">Criar conta da empresa</Link>
        </>
      }
    >
      <FormLogin />
    </MolduraAuth>
  );
}
