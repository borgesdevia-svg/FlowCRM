"use client";
// Botão de submeter da página Plano ("Escolher Pro", "Gerir pagamento"...).
// Enquanto a Stripe prepara a página de pagamento (1-2 segundos), mostra "A abrir…"
// e fica desligado, para não se carregar duas vezes.
import { useFormStatus } from "react-dom";

export default function BotaoPlano({ children, className = "botao", aEspera = "A abrir…" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? aEspera : children}
    </button>
  );
}
