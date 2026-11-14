-- 09 · Adicionar membros à equipa (correção)
-- O Supabase cria o utilizador ANTES de gravar o app_metadata, por isso o trigger
-- novo_utilizador não via a empresa_id e tratava o membro como um registo novo
-- ("O nome da empresa é obrigatório."). Agora o administrador deixa primeiro um
-- convite (email + empresa) numa tabela privada; o trigger lê-o ao criar a conta.

create table privado.convites (
  email      text primary key,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  criado_em  timestamptz not null default now()
);

-- só o administrador cria convites, sempre para a SUA empresa
create function public.criar_convite(p_email text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not privado.sou_admin() then
    raise exception 'Só o administrador pode adicionar membros.';
  end if;

  insert into privado.convites (email, empresa_id)
  values (lower(trim(p_email)), privado.minha_empresa())
  on conflict (email) do update set empresa_id = excluded.empresa_id, criado_em = now();
end;
$$;

revoke all on function public.criar_convite(text) from public;
grant execute on function public.criar_convite(text) to authenticated;

-- apagar o convite se a criação da conta falhar
create function public.cancelar_convite(p_email text)
returns void
language sql security definer
set search_path = ''
as $$
  delete from privado.convites
  where email = lower(trim(p_email)) and empresa_id = privado.minha_empresa() and privado.sou_admin();
$$;

revoke all on function public.cancelar_convite(text) from public;
grant execute on function public.cancelar_convite(text) to authenticated;

-- trigger: convite (com menos de 10 minutos) -> membro comercial dessa empresa
create or replace function privado.novo_utilizador()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_nome          text := nullif(trim(new.raw_user_meta_data ->> 'nome'), '');
  v_nome_empresa  text := nullif(trim(new.raw_user_meta_data ->> 'nome_empresa'), '');
  v_empresa_id    uuid;
  v_slug          text;
begin
  v_nome := coalesce(v_nome, split_part(new.email, '@', 1));

  -- 1) membro adicionado pelo administrador
  delete from privado.convites
  where email = lower(new.email) and criado_em > now() - interval '10 minutes'
  returning empresa_id into v_empresa_id;

  if v_empresa_id is null and new.raw_app_meta_data ? 'empresa_id' then
    v_empresa_id := (new.raw_app_meta_data ->> 'empresa_id')::uuid;
  end if;

  if v_empresa_id is not null then
    insert into public.perfis (id, empresa_id, nome, email, papel)
    values (new.id, v_empresa_id, v_nome, new.email, 'comercial');
    return new;
  end if;

  -- 2) registo de uma empresa nova (quem regista fica administrador)
  if v_nome_empresa is null or char_length(v_nome_empresa) < 2 then
    raise exception 'O nome da empresa é obrigatório.';
  end if;

  v_slug := coalesce(nullif(privado.gerar_slug(v_nome_empresa), ''), 'empresa');
  while exists (select 1 from public.empresas where slug = v_slug) loop
    v_slug := privado.gerar_slug(v_nome_empresa) || '-' || substr(md5(random()::text), 1, 4);
  end loop;

  insert into public.empresas (nome, slug)
  values (v_nome_empresa, v_slug)
  returning id into v_empresa_id;

  insert into public.perfis (id, empresa_id, nome, email, papel)
  values (new.id, v_empresa_id, v_nome, new.email, 'admin');

  return new;
end;
$$;
