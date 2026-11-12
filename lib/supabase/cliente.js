import { createBrowserClient } from "@supabase/ssr";

// Cliente Supabase para usar no BROWSER (componentes com "use client").
// Usa só a chave pública (publishable): é seguro estar no browser porque
// as regras RLS na base de dados decidem o que cada utilizador pode ver.
export function criarClienteBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}
