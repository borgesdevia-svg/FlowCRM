-- 28: quando um lead muda de responsável (de A para B), as tarefas por fazer que eram do A
-- nesse lead passam para o B. Antes ficavam com o A: um comercial ficava com tarefas de um
-- lead que já não vê, e o novo responsável não sabia o que havia para fazer.
-- Tarefas que um admin deu a outra pessoa (nem A nem B) não mudam. As feitas também não.

create or replace function privado.tarefas_seguem_lead()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if old.responsavel_id is not null and new.responsavel_id is not null
     and old.responsavel_id <> new.responsavel_id then
    update public.tarefas
       set responsavel_id = new.responsavel_id
     where cliente_id = new.id
       and empresa_id = new.empresa_id
       and responsavel_id = old.responsavel_id
       and not concluida;
  end if;
  return new;
end;
$$;

revoke execute on function privado.tarefas_seguem_lead() from public, anon, authenticated;

create trigger tarefas_seguem_lead
  after update of responsavel_id on public.clientes
  for each row execute function privado.tarefas_seguem_lead();
