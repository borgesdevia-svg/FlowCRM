import { cache } from "react";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";

// Devolve o utilizador com login, o seu perfil e a sua empresa.
// Usada nas páginas do painel (código de servidor).
// Se não houver sessão, manda para o login — segunda proteção, além do proxy.js.
//
// cache(): o layout do painel e a página chamam esta função no mesmo pedido;
// assim a sessão e o perfil só são pedidos uma vez (o resto reutiliza o resultado).
export const obterSessao = cache(async function obterSessao() {
  const supabase = await criarClienteServidor();

  // getClaims() confirma a assinatura do token de login (não confia só no cookie)
  // e é mais rápido do que getUser(), que vai sempre ao servidor de autenticação
  const { data: sessao } = await supabase.auth.getClaims();
  const user = sessao?.claims?.sub ? { id: sessao.claims.sub } : null;

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
});
