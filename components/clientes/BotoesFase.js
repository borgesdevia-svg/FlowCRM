import { PROXIMOS_PASSOS } from "@/lib/estados";
import { mudarEstado } from "@/lib/acoes/clientes";
import styles from "./BotoesFase.module.css";

// Botões para mudar um cliente de fase. Usado no pipeline e na ficha do cliente.
// Cada botão é um pequeno formulário que envia o id do cliente e o novo estado
// para a Server Action "mudarEstado" (que corre no servidor).
// Props: cliente (precisa de id e estado), grande (botões maiores, para a ficha)
export default function BotoesFase({ cliente, grande = false, className = "" }) {
  return (
    <div className={`${styles.botoes} ${grande ? styles.grande : ""} ${className}`}>
      {PROXIMOS_PASSOS[cliente.estado].map((passo) => (
        <form key={passo.para} action={mudarEstado}>
          <input type="hidden" name="id" value={cliente.id} />
          <input type="hidden" name="estado" value={passo.para} />
          <button type="submit" className={passo.principal ? styles.principal : styles.botao}>
            {passo.texto}
          </button>
        </form>
      ))}
    </div>
  );
}
