// Conta de e-mail ligada de uma pessoa (só SERVIDOR: usa a chave secreta do Supabase).
// A tabela contas_email não tem acesso pelo browser (migração 39); daqui só sai o que se pode
// mostrar, NUNCA a password.

import { criarClienteAdmin } from "@/lib/supabase/admin";

export async function obterContaEmail(perfilId) {
  if (!perfilId) return null;
  const { data, error } = await criarClienteAdmin()
    .from("contas_email")
    .select("email, nome_remetente, assinatura, smtp_host, smtp_porta, imap_host, imap_porta, utilizador")
    .eq("perfil_id", perfilId)
    .maybeSingle();
  if (error) {
    console.error("E-mail: não foi possível ler a conta ligada", error);
    return null;
  }
  return data ?? null;
}
