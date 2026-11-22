-- 26: a regra "criar propostas" (migração 25) chamava privado.tem_pro(), que os utilizadores
-- não podem executar (só as funções internas). Esta função pergunta só pela PRÓPRIA empresa
-- e corre com as permissões do dono, por isso pode ser usada nas regras RLS.

create function privado.minha_empresa_tem_pro()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select privado.tem_pro(privado.minha_empresa());
$$;
revoke all on function privado.minha_empresa_tem_pro() from public, anon;
grant execute on function privado.minha_empresa_tem_pro() to authenticated;

drop policy "criar propostas" on public.propostas;
create policy "criar propostas"
  on public.propostas for insert to authenticated
  with check (
    empresa_id = (select privado.minha_empresa())
    and autor_id = (select auth.uid())
    and estado = 'enviada'
    and respondida_em is null
    and aceite_por is null
    and (select privado.minha_empresa_tem_pro())
    and exists (select 1 from public.clientes c where c.id = cliente_id)
  );
