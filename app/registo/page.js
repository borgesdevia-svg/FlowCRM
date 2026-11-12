import Link from "next/link";
import MolduraAuth from "@/components/auth/MolduraAuth";
import FormRegisto from "@/components/auth/FormRegisto";

// Rota /registo — página de servidor que mostra o formulário (componente de cliente).
export const metadata = { title: "Criar conta · FlowCRM" };

export default function PaginaRegisto() {
  return (
    <MolduraAuth
      titulo="Cria a conta da tua empresa"
      subtitulo="Em 2 minutos tens o teu CRM pronto a usar."
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
