"use server";
// Server Action da pesquisa global (caixa de pesquisa no menu lateral).
// Corre no servidor: o browser só envia o texto e recebe os resultados.
// O RLS garante que cada pessoa só encontra os clientes que pode ver.

import { obterSessao } from "@/lib/sessao";

export async function pesquisarClientes(texto) {
  // tiramos caracteres com significado especial na pesquisa do Supabase
  const termo = String(texto ?? "").replace(/[%,()]/g, "").trim().slice(0, 80);
  if (termo.length < 2) return []; // com menos de 2 letras há resultados a mais

  const { supabase } = await obterSessao();
  const { data } = await supabase
    .from("clientes")
    .select("id, nome, email, estado")
    .or(`nome.ilike.%${termo}%,email.ilike.%${termo}%`) // ilike = contém, sem ligar a maiúsculas
    .order("nome")
    .limit(6);

  return data ?? [];
}
