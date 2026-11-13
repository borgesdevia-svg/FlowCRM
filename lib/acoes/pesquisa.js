"use server";
// Server Action da pesquisa global (caixa de pesquisa no menu lateral).
// Corre no servidor: o browser só envia o texto e recebe os resultados.
// O RLS garante que cada pessoa só encontra os clientes que pode ver.

import { obterSessao } from "@/lib/sessao";

export async function pesquisarClientes(texto) {
  // tiramos caracteres com significado especial na pesquisa do Supabase
  const termo = String(texto ?? "").replace(/[%_,()\\]/g, "").trim().slice(0, 80);
  if (termo.length < 2) return []; // com menos de 2 letras há resultados a mais

  const { supabase } = await obterSessao();
  // função da base de dados (migração 06): procura no nome e no email sem ligar
  // a maiúsculas nem a acentos ("clinica" encontra "Clínica")
  const { data } = await supabase.rpc("pesquisar_clientes", { termo, limite: 6 });

  return data ?? [];
}
