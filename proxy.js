import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// PROXY: corre no servidor ANTES de cada página indicada no "matcher" (no fim do ficheiro).
// Faz duas coisas:
//  1. Renova a sessão do Supabase (os cookies de login expiram e têm de ser renovados).
//  2. Redireciona: sem login não se entra no /painel; com login, /login e /registo
//     levam direto ao painel.
export async function proxy(request) {
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        // quando o Supabase renova a sessão, grava os cookies novos
        // no pedido (para as páginas) e na resposta (para o browser)
        setAll(cookiesParaGravar) {
          cookiesParaGravar.forEach(({ name, value }) => request.cookies.set(name, value));
          resposta = NextResponse.next({ request });
          cookiesParaGravar.forEach(({ name, value, options }) =>
            resposta.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getClaims() confirma a assinatura do token de login (não confia só no cookie)
  // e renova a sessão se for preciso. É mais rápido do que getUser().
  const { data: sessao } = await supabase.auth.getClaims();
  const user = sessao?.claims?.sub ?? null;

  const caminho = request.nextUrl.pathname;
  const paginaPrivada = caminho.startsWith("/painel");
  const paginaDeEntrada = caminho === "/login" || caminho === "/registo";

  if (!user && paginaPrivada) {
    return redirecionar(request, resposta, "/login");
  }
  if (user && paginaDeEntrada) {
    return redirecionar(request, resposta, "/painel");
  }

  return resposta;
}

// Redireciona mantendo os cookies de sessão que possam ter sido renovados
function redirecionar(request, resposta, destino) {
  const redirecionamento = NextResponse.redirect(new URL(destino, request.url));
  resposta.cookies.getAll().forEach((cookie) => redirecionamento.cookies.set(cookie));
  return redirecionamento;
}

// Só corre nestas rotas (as páginas públicas não precisam)
export const config = {
  matcher: ["/painel/:path*", "/login", "/registo"],
};
