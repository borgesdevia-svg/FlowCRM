import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente Supabase para usar no SERVIDOR (páginas de servidor, Server Actions, rotas API).
// A sessão do utilizador (login) vive em cookies; este cliente lê esses cookies
// do pedido para saber QUEM está a fazer o pedido, e o RLS aplica as regras a essa pessoa.
export async function criarClienteServidor() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        // ler todos os cookies do pedido
        getAll() {
          return cookieStore.getAll();
        },
        // gravar cookies (ex.: quando a sessão é renovada)
        setAll(cookiesParaGravar) {
          try {
            cookiesParaGravar.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Numa página de servidor não é possível gravar cookies (só ler).
            // Não faz mal: a renovação da sessão será tratada noutro sítio na F2 (login).
          }
        },
      },
    }
  );
}
