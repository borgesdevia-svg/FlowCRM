-- 11 · Funções da equipa só para quem tem sessão iniciada
-- O Supabase dá EXECUTE ao papel "anon" (visitantes sem login) em todas as funções
-- novas do schema public. As funções da equipa já recusavam quem não é administrador,
-- mas assim nem chegam a poder ser chamadas sem login.
-- (criar_lead, formulario_publico e nome_empresa_publico continuam públicas:
--  são as que o formulário de contacto usa.)

revoke execute on function public.criar_convite(text, text) from anon;
revoke execute on function public.cancelar_convite(text) from anon;
revoke execute on function public.mudar_papel(uuid, text) from anon;

-- privado.convites só é lida pelo trigger (security definer): ninguém lá chega pela API.
-- A política abaixo deixa isso explícito (e cala o aviso "RLS sem políticas").
create policy "ninguém acede aos convites pela API"
  on privado.convites for all to authenticated, anon
  using (false)
  with check (false);
