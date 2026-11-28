-- =====================================================================
-- FlowCRM · 45 · Roleta só ao aceitar na Entrada + quando/quem entregou o lead
-- Decisão do aluno (2026-11-28):
--  - TODOS os leads do formulário passam pela Entrada. A distribuição "à vez" (Pro) deixa de
--    correr ao criar o lead: passa a ser uma opção ao ACEITAR ("À vez pela equipa").
--  - atribuido_em / atribuido_por: quando e por quem o lead foi entregue a alguém, para o
--    aviso no ecrã "Lead novo: … ficou para ti" (components/entrada/AvisoEntrada.js).
-- =====================================================================

-- 1) a distribuição já não corre ao criar o lead
drop trigger if exists antes_de_criar_cliente_distribuir on public.clientes;

-- 2) quando e por quem foi entregue
alter table public.clientes
  add column if not exists atribuido_em timestamptz,
  add column if not exists atribuido_por uuid;
-- SEM "references perfis": uma 2.ª ligação clientes→perfis deixava ambíguo o "perfis(nome)" de
-- todas as listas (Leads e Pipeline ficaram vazios). A 1.ª versão tinha-a; tirada na 45b.
alter table public.clientes drop constraint if exists clientes_atribuido_por_fkey;

-- a tabela usa permissões por coluna (migração 18): estas só se podem LER
grant select (atribuido_em, atribuido_por) on public.clientes to authenticated;

create or replace function privado.marcar_atribuicao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.responsavel_id is not null
     and (tg_op = 'INSERT' or new.responsavel_id is distinct from old.responsavel_id) then
    new.atribuido_em := now();
    new.atribuido_por := (select auth.uid());
  elsif tg_op = 'UPDATE' then
    -- ninguém mexe nestas colunas à mão
    new.atribuido_em := old.atribuido_em;
    new.atribuido_por := old.atribuido_por;
  end if;
  return new;
end;
$$;

drop trigger if exists marcar_atribuicao on public.clientes;
create trigger marcar_atribuicao
  before insert or update of responsavel_id on public.clientes
  for each row execute function privado.marcar_atribuicao();

-- leads já com responsável: contam como entregues quando foram criados (não dão aviso)
update public.clientes set atribuido_em = criado_em where responsavel_id is not null and atribuido_em is null;

-- 3) aceitar um lead da Entrada "à vez": escolhe a próxima pessoa da roleta e entrega-lhe o lead.
-- Só o admin, só leads da sua empresa ainda sem responsável, só no Pro com a distribuição ligada.
-- Devolve o id da pessoa escolhida (ou null se não deu).
create or replace function public.aceitar_lead_a_vez(p_cliente uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid := privado.minha_empresa();
  v_perfil uuid;
begin
  if not privado.sou_admin() then
    return null;
  end if;
  if not privado.tem_pro(v_empresa)
     or not coalesce((select distribuir_ligada from public.automacoes where empresa_id = v_empresa), false) then
    return null;
  end if;
  -- trava o lead: dois admins a aceitar ao mesmo tempo não o entregam duas vezes
  perform 1 from public.clientes
    where id = p_cliente and empresa_id = v_empresa and responsavel_id is null
    for update;
  if not found then
    return null;
  end if;

  select perfil_id into v_perfil
  from public.automacoes_distribuicao
  where empresa_id = v_empresa
  order by ultimo_lead_em asc nulls first, perfil_id
  limit 1
  for update;
  if v_perfil is null then
    return null;
  end if;

  update public.automacoes_distribuicao
    set ultimo_lead_em = clock_timestamp()
    where empresa_id = v_empresa and perfil_id = v_perfil;

  -- os triggers do update fazem o resto: histórico "Entregue a …", tarefa "Contactar", atribuido_em
  update public.clientes set responsavel_id = v_perfil where id = p_cliente;

  insert into public.automacoes_log (empresa_id, cliente_id, tipo, estado, perfil_id)
    values (v_empresa, p_cliente, 'distribuir', 'feito', v_perfil);

  return v_perfil;
end;
$$;

revoke execute on function public.aceitar_lead_a_vez(uuid) from public, anon;
grant execute on function public.aceitar_lead_a_vez(uuid) to authenticated;
