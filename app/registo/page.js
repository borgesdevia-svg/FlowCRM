import Link from "next/link";
import MolduraAuth from "@/components/auth/MolduraAuth";
import FormRegisto from "@/components/auth/FormRegisto";

// Rota /registo — página de servidor que mostra o formulário (componente de cliente).
export const metadata = { title: "Criar conta · FlowCRM" };

export default function PaginaRegisto() {
  return (
    <MolduraAuth
      titulo="Cria a conta da tua empresa"
      subtitulo="Depois de criares a conta, escolhes o plano e pagas com cartão."
      rodape={
        <>
          Já tens conta? <Link href="/login">Entrar</Link>
        </>
      }
    >
      <FormRegisto />
    </MolduraAuth>
  );
}
