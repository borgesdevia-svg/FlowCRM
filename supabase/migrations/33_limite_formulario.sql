-- 33: limite de envios do formulário público por IP (contra spam).
--
-- Até aqui, qualquer pessoa podia chamar a função criar_lead diretamente (com a chave pública)
-- e criar centenas de leads falsos. Agora:
--  1. o site (Server Action enviarLead) confirma primeiro o limite deste IP com limite_formulario;
--  2. só depois chama criar_lead, com a chave secreta (no servidor);
--  3. criar_lead deixa de poder ser chamada por visitantes (anon) e utilizadores (authenticated)
--     diretamente, por isso não há forma de saltar o limite.
--
-- Limite: 5 envios por IP em cada hora (somando todas as empresas).
-- O IP não é guardado: guarda-se só o seu hash SHA-256 (feito no servidor), e as linhas
-- com mais de um dia são apagadas sempre que alguém envia.
--
-- ATENÇÃO à ordem: aplicar DEPOIS de o código novo estar publicado na Vercel
-- (o código antigo chama criar_lead como anon e deixaria de funcionar).

create table public.envios_formulario (
  id         bigint generated always as identity primary key,
  ip_hash    text not null check (char_length(ip_hash) = 64),
  criado_em  timestamptz not null default now()
);

create index envios_formulario_ip_data on public.envios_formulario (ip_hash, criado_em);

-- RLS ligado e sem políticas: ninguém lê nem escreve pela API, só as funções abaixo
alter table public.envios_formulario enable row level security;
revoke all on public.envios_formulario from anon, authenticated;

-- Devolve true e regista o envio se este IP ainda pode enviar; false se já passou o limite.
create or replace function public.limite_formulario(p_ip_hash text)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare
  v_recentes int;
begin
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'IP inválido.';
  end if;

  -- limpeza: o que tem mais de um dia já não serve para nada
  delete from public.envios_formulario where criado_em < now() - interval '1 day';

  -- dois envios ao mesmo tempo do mesmo IP esperam um pelo outro (a contagem fica certa)
  perform pg_advisory_xact_lock(hashtext(p_ip_hash));

  select count(*) into v_recentes
  from public.envios_formulario
  where ip_hash = p_ip_hash and criado_em > now() - interval '1 hour';

  if v_recentes >= 5 then
    return false;
  end if;

  insert into public.envios_formulario (ip_hash) values (p_ip_hash);
  return true;
end;
$$;

-- só o servidor (chave secreta) chama estas funções
revoke execute on function public.limite_formulario(text) from public, anon, authenticated;
grant execute on function public.limite_formulario(text) to service_role;

revoke execute on function public.criar_lead(text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.criar_lead(text, text, text, text, jsonb) to service_role;
