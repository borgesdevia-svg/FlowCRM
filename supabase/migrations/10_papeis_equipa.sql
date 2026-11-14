-- 10 · Papéis na equipa: dono, administrador e comercial
--   - "dono" = quem criou a empresa (empresas.dono_id). É administrador e ninguém
--     o pode remover nem despromover.
--   - ao adicionar um membro, o administrador escolhe se é administrador ou comercial
--   - o administrador pode mudar o papel dos outros membros (menos o do dono)

-- ---------- dono da empresa ----------
alter table public.empresas add column dono_id uuid references auth.users (id) on delete set null;

-- empresas que já existem: o dono é o administrador mais antigo
update public.empresas e
set dono_id = (
  select p.id from public.perfis p
  where p.empresa_id = e.id and p.papel = 'admin'
  order by p.criado_em
  limit 1
);

-- ---------- convites passam a levar o papel ----------
alter table privado.convites
  add column papel text not null default 'comercial' check (papel in ('admin', 'comercial'));

drop function public.criar_convite(text);

create function public.criar_convite(p_email text, p_papel text default 'comercial')
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not privado.sou_admin() then
    raise exception 'Só o administrador pode adicionar membros.';
  end if;
  if p_papel not in ('admin', 'comercial') then
    raise exception 'Papel inválido.';
  end if;

  insert into privado.convites (email, empresa_id, papel)
  values (lower(trim(p_email)), privado.minha_empresa(), p_papel)
  on conflict (email) do update
    set empresa_id = excluded.empresa_id, papel = excluded.papel, criado_em = now();
end;
$$;

revoke all on function public.criar_convite(text, text) from public;
grant execute on function public.criar_convite(text, text) to authenticated;

-- ---------- mudar o papel de um membro ----------
create function public.mudar_papel(p_id uuid, p_papel text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_empresa uuid := privado.minha_empresa();
begin
  if not privado.sou_admin() then
    raise exception 'Só o administrador pode mudar papéis.';
  end if;
  if p_papel not in ('admin', 'comercial') then
    raise exception 'Papel inválido.';
  end if;
  if p_id = (select auth.uid()) then
    raise exception 'Não podes mudar o teu próprio papel.';
  end if;
  if exists (select 1 from public.empresas where id = v_empresa and dono_id = p_id) then
    raise exception 'O papel do dono não pode ser mudado.';
  end if;

  -- só membros da MESMA empresa
  update public.perfis set papel = p_papel where id = p_id and empresa_id = v_empresa;
  if not found then
    raise exception 'Membro não encontrado.';
  end if;
end;
$$;

revoke all on function public.mudar_papel(uuid, text) from public;
grant execute on function public.mudar_papel(uuid, text) to authenticated;

-- ---------- trigger: novo utilizador ----------
create or replace function privado.novo_utilizador()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_nome          text := nullif(trim(new.raw_user_meta_data ->> 'nome'), '');
  v_nome_empresa  text := nullif(trim(new.raw_user_meta_data ->> 'nome_empresa'), '');
  v_empresa_id    uuid;
  v_papel         text;
  v_slug          text;
begin
  v_nome := coalesce(v_nome, split_part(new.email, '@', 1));

  -- 1) membro adicionado por um administrador (convite com menos de 10 minutos)
  delete from privado.convites
  where email = lower(new.email) and criado_em > now() - interval '10 minutes'
  returning empresa_id, papel into v_empresa_id, v_papel;

  if v_empresa_id is not null then
    insert into public.perfis (id, empresa_id, nome, email, papel)
    values (new.id, v_empresa_id, v_nome, new.email, coalesce(v_papel, 'comercial'));
    return new;
  end if;

  -- 2) registo de uma empresa nova: quem regista fica dono e administrador
  if v_nome_empresa is null or char_length(v_nome_empresa) < 2 then
    raise exception 'O nome da empresa é obrigatório.';
  end if;

  v_slug := coalesce(nullif(privado.gerar_slug(v_nome_empresa), ''), 'empresa');
  while exists (select 1 from public.empresas where slug = v_slug) loop
    v_slug := privado.gerar_slug(v_nome_empresa) || '-' || substr(md5(random()::text), 1, 4);
  end loop;

  insert into public.empresas (nome, slug, dono_id)
  values (v_nome_empresa, v_slug, new.id)
  returning id into v_empresa_id;

  insert into public.perfis (id, empresa_id, nome, email, papel)
  values (new.id, v_empresa_id, v_nome, new.email, 'admin');

  return new;
end;
$$;
