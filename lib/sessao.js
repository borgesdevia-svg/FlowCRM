import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";

// Devolve o utilizador com login, o seu perfil e a sua empresa.
// Usada nas páginas do painel (código de servidor).
// Se não houver sessão, manda para o login — segunda proteção, além do proxy.js.
export async function obterSessao() {
  const supabase = await criarClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // graças ao RLS, esta consulta só consegue devolver dados da empresa do utilizador.
  // "empresas(nome, slug)" junta os dados da empresa ligada ao perfil (empresa_id).
  const { data: perfil } = await supabase
    .from("perfis")
    .select("id, nome, email, papel, empresa_id, empresas(nome, slug)")
    .eq("id", user.id)
    .single();

  // conta sem perfil (não devia acontecer): termina a sessão por segurança
  if (!perfil) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  return { supabase, perfil, empresa: perfil.empresas, eAdmin: perfil.papel === "admin" };
}
