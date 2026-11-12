import { createClient } from "@supabase/supabase-js";

// Cliente Supabase com a chave SECRETA: ignora o RLS e pode criar/apagar utilizadores.
// ⚠️ Só pode ser usado em código de SERVIDOR (Server Actions), nunca num componente
// de cliente. A variável SUPABASE_SECRET_KEY não começa por NEXT_PUBLIC_, por isso
// o Next.js nunca a envia para o browser.
// Antes de o usar, o código tem SEMPRE de confirmar que quem pede tem permissão.
export function criarClienteAdmin() {
  const chave = process.env.SUPABASE_SECRET_KEY;
  if (!chave) {
    throw new Error("Falta a SUPABASE_SECRET_KEY no ficheiro .env.local");
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, chave, {
    // este cliente não guarda sessão nenhuma (não "faz login" como ninguém)
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
