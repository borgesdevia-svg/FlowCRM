-- 06: quando uma tarefa foi feita + pesquisa de clientes sem ligar a acentos

-- ---------- tarefas.concluida_em ----------
-- Guarda o momento em que a tarefa foi marcada como feita (null se está por fazer).
-- O quadro de Tarefas só mostra as feitas dos últimos 7 dias; as outras
-- continuam guardadas (e no histórico do cliente), só saem do quadro.
alter table public.tarefas add column if not exists concluida_em timestamptz;

-- as que já estavam feitas ficam com a data de hoje
update public.tarefas set concluida_em = now() where concluida and concluida_em is null;

-- preenche-se sozinha: quem marca/desmarca não tem de se lembrar dela
create or replace function public.tarefas_concluida_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.concluida and (tg_op = 'INSERT' or not old.concluida) then
    new.concluida_em := now();
  elsif not new.concluida then
    new.concluida_em := null;
  end if;
  return new;
end;
$$;

drop trigger if exists tarefas_concluida_em on public.tarefas;
create trigger tarefas_concluida_em
before insert or update of concluida on public.tarefas
for each row execute function public.tarefas_concluida_em();

create index if not exists tarefas_concluida_em_idx on public.tarefas (empresa_id, concluida_em);

-- ---------- pesquisa de clientes sem acentos ----------
-- "clinica" encontra "Clínica". Corre com as permissões de quem pesquisa
-- (security invoker), por isso o RLS continua a decidir que clientes cada um vê.
create extension if not exists unaccent with schema extensions;

create or replace function public.pesquisar_clientes(termo text, limite int default 6)
returns table (id uuid, nome text, email text, estado text)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.id, c.nome, c.email, c.estado::text
  from public.clientes c
  where extensions.unaccent(lower(c.nome)) like '%' || extensions.unaccent(lower(termo)) || '%'
     or extensions.unaccent(lower(coalesce(c.email, ''))) like '%' || extensions.unaccent(lower(termo)) || '%'
  order by c.nome
  limit least(greatest(limite, 1), 20);
$$;

revoke execute on function public.pesquisar_clientes(text, int) from public, anon;
grant execute on function public.pesquisar_clientes(text, int) to authenticated;
