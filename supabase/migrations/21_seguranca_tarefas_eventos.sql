-- 21: fecha dois buracos de segurança pequenos (2026-11-20)
--
-- 1) TAREFAS: um comercial, chamando a API do Supabase diretamente (sem passar pelo site),
--    conseguia criar tarefas para colegas e editar/apagar tarefas que não eram suas.
--    Agora o comercial só cria, edita e apaga tarefas em que ELE é o responsável.
--    O admin continua a poder tudo dentro da empresa.
--
-- 2) EVENTOS AUTOMÁTICOS (interações do tipo 'sistema'): qualquer pessoa podia escrever
--    um "evento" falso no histórico ("Passou para Ativo" sem ter passado).
--    Agora ninguém os escreve diretamente: é a própria base de dados que os cria, com
--    triggers, quando a coisa acontece mesmo (mudança de fase, tarefa concluída, lead
--    entregue a alguém). O site deixa de os inserir (lib/eventos.js ficou só com o texto).

-- ---------- 1) tarefas: o comercial só mexe nas suas ----------
drop policy "criar tarefas" on public.tarefas;
drop policy "editar tarefas" on public.tarefas;
drop policy "apagar tarefas" on public.tarefas;

create policy "criar tarefas"
  on public.tarefas for insert to authenticated
  with check (
    empresa_id = (select privado.minha_empresa())
    and exists (select 1 from public.clientes c where c.id = cliente_id)
    and ((select privado.sou_admin()) or responsavel_id = (select auth.uid()))
  );

-- "using" = que linhas pode escolher; "with check" = como podem ficar depois de alteradas
-- (assim o comercial também não consegue passar uma tarefa sua para um colega)
create policy "editar tarefas"
  on public.tarefas for update to authenticated
  using (
    empresa_id = (select privado.minha_empresa())
    and exists (select 1 from public.clientes c where c.id = cliente_id)
    and ((select privado.sou_admin()) or responsavel_id = (select auth.uid()))
  )
  with check (
    empresa_id = (select privado.minha_empresa())
    and exists (select 1 from public.clientes c where c.id = cliente_id)
    and ((select privado.sou_admin()) or responsavel_id = (select auth.uid()))
  );

create policy "apagar tarefas"
  on public.tarefas for delete to authenticated
  using (
    empresa_id = (select privado.minha_empresa())
    and exists (select 1 from public.clientes c where c.id = cliente_id)
    and ((select privado.sou_admin()) or responsavel_id = (select auth.uid()))
  );

-- ---------- 2) interações: o tipo 'sistema' fica só para a base de dados ----------
drop policy "criar interacoes" on public.interacoes;
drop policy "editar interacoes" on public.interacoes;
drop policy "apagar interacoes" on public.interacoes;

create policy "criar interacoes"
  on public.interacoes for insert to authenticated
  with check (
    empresa_id = (select privado.minha_empresa())
    and autor_id = (select auth.uid())
    and tipo <> 'sistema'
    and exists (select 1 from public.clientes c where c.id = cliente_id)
  );

create policy "editar interacoes"
  on public.interacoes for update to authenticated
  using (
    empresa_id = (select privado.minha_empresa())
    and tipo <> 'sistema'
    and (autor_id = (select auth.uid()) or (select privado.sou_admin()))
  )
  with check (
    empresa_id = (select privado.minha_empresa())
    and tipo <> 'sistema'
    and (autor_id = (select auth.uid()) or (select privado.sou_admin()))
  );

create policy "apagar interacoes"
  on public.interacoes for delete to authenticated
  using (
    empresa_id = (select privado.minha_empresa())
    and tipo <> 'sistema'
    and (autor_id = (select auth.uid()) or (select privado.sou_admin()))
  );

-- função auxiliar: grava um evento no histórico de um cliente.
-- security definer = corre com permissões do dono (passa o RLS acima).
-- Fica no esquema "privado", que o browser não consegue chamar.
-- autor = quem fez a ação (auth.uid()); vazio se foi uma tarefa automática do servidor.
create function privado.registar_evento(p_empresa uuid, p_cliente uuid, p_texto text)
returns void
language sql security definer
set search_path = ''
as $$
  insert into public.interacoes (empresa_id, cliente_id, autor_id, tipo, nota)
  values (p_empresa, p_cliente, auth.uid(), 'sistema', left(p_texto, 5000));
$$;

-- os textos têm de ser iguais aos do site (lib/estados.js): o Início procura
-- "Passou para Ativo" para calcular o tempo médio até fechar
create function privado.texto_estado(p_estado text)
returns text
language sql immutable
set search_path = ''
as $$
  select case p_estado
    when 'novo' then 'Novo'
    when 'negociacao' then 'Em negociação'
    when 'ativo' then 'Ativo'
    when 'perdido' then 'Perdido'
    else p_estado
  end;
$$;

-- a) mudança de fase: "Passou para Em negociação"
create function privado.evento_mudanca_fase()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.estado is distinct from old.estado then
    perform privado.registar_evento(new.empresa_id, new.id, 'Passou para ' || privado.texto_estado(new.estado));
  end if;
  return new;
end;
$$;

create trigger evento_mudanca_fase
  after update of estado on public.clientes
  for each row execute function privado.evento_mudanca_fase();

-- b) lead sem responsável entregue a alguém: "Entregue a Ana"
create function privado.evento_entregue()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_nome text;
begin
  if old.responsavel_id is null and new.responsavel_id is not null then
    select nome into v_nome from public.perfis where id = new.responsavel_id;
    perform privado.registar_evento(new.empresa_id, new.id, 'Entregue a ' || coalesce(v_nome, 'um membro da equipa'));
  end if;
  return new;
end;
$$;

create trigger evento_entregue
  after update of responsavel_id on public.clientes
  for each row execute function privado.evento_entregue();

-- c) tarefa concluída: "Concluiu a tarefa: Enviar proposta"
--    (só quando passa de por fazer a feita: um duplo clique não regista duas vezes)
create function privado.evento_tarefa_concluida()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.concluida and not old.concluida then
    perform privado.registar_evento(new.empresa_id, new.cliente_id, 'Concluiu a tarefa: ' || new.titulo);
  end if;
  return new;
end;
$$;

create trigger evento_tarefa_concluida
  after update of concluida on public.tarefas
  for each row execute function privado.evento_tarefa_concluida();

-- as funções do esquema privado não são para ninguém chamar diretamente
revoke execute on function privado.registar_evento(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function privado.evento_mudanca_fase() from public, anon, authenticated;
revoke execute on function privado.evento_entregue() from public, anon, authenticated;
revoke execute on function privado.evento_tarefa_concluida() from public, anon, authenticated;
