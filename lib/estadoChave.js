// Estado da chave de recuperação de quem tem sessão (usado no layout do painel).
// NÃO é uma Server Action (não tem "use server"): só o código de servidor a chama,
// o browser não a consegue chamar com o id de outra pessoa.
import { criarClienteAdmin } from "@/lib/supabase/admin";

// true se a pessoa ainda não tem chave ou ainda não confirmou que a guardou.
// Se a chave secreta faltar no servidor (ou a migração 23 estiver por aplicar),
// não bloqueia o painel: devolve false.
export async function precisaDeChave(perfilId) {
  try {
    const { data, error } = await criarClienteAdmin()
      .from("chaves_recuperacao")
      .select("guardada")
      .eq("perfil_id", perfilId)
      .maybeSingle();
    if (error) return false;
    return !data?.guardada;
  } catch {
    return false;
  }
}
