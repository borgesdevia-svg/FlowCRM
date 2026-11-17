-- 17 · O comercial não pode responder ao formulário público da própria empresa
-- A página /f/[slug] e a Server Action já o impediam, mas a função criar_lead
-- pode ser chamada diretamente pela API (com a chave pública). Agora a própria
-- base de dados recusa: é a última barreira, e não depende do site.
-- (O resto da função fica igual à versão da migração 08.)

create or replace function public.criar_lead(
  p_slug      text,
  p_nome      text,
  p_email     text,
  p_telefone  text default null,
  p_respostas jsonb default '{}'::jsonb
)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_empresa_id uuid;
  v_perguntas  jsonb;
  v_cliente_id uuid;
  v_pergunta   jsonb;
  v_resposta   text;
  v_respostas  jsonb := '[]'::jsonb;
begin
  p_nome      := trim(p_nome);
  p_email     := lower(trim(p_email));
  p_telefone  := nullif(trim(p_telefone), '');
  p_respostas := coalesce(p_respostas, '{}'::jsonb);

  if p_nome is null or char_length(p_nome) < 2 or char_length(p_nome) > 150 then
    raise exception 'Nome inválido.';
  end if;
  if p_email is null or char_length(p_email) > 254
     or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Email inválido.';
  end if;
  if p_telefone is not null and p_telefone !~ '^[0-9 +()-]{6,20}$' then
    raise exception 'Telefone inválido.';
  end if;
  if jsonb_typeof(p_respostas) <> 'object' then
    raise exception 'Respostas inválidas.';
  end if;

  select id, perguntas into v_empresa_id, v_perguntas from public.empresas where slug = p_slug;
  if v_empresa_id is null then
    raise exception 'Formulário não encontrado.';
  end if;

  -- NOVO: quem tem sessão e é comercial DESTA empresa não pode criar leads por aqui
  -- (auth.uid() é null para visitantes sem conta, que continuam a poder enviar)
  if exists (
    select 1 from public.perfis
    where id = (select auth.uid()) and empresa_id = v_empresa_id and papel = 'comercial'
  ) then
    raise exception 'Os comerciais não podem responder ao formulário da própria empresa.';
  end if;

  for v_pergunta in select * from jsonb_array_elements(v_perguntas) loop
    v_resposta := nullif(trim(p_respostas ->> (v_pergunta ->> 'id')), '');

    if v_resposta is null then
      if coalesce((v_pergunta ->> 'obrigatoria')::boolean, false) then
        raise exception 'Falta responder a uma pergunta obrigatória.';
      end if;
      continue;
    end if;

    if char_length(v_resposta) > 2000 then
      raise exception 'Resposta demasiado longa.';
    end if;
    if v_pergunta ->> 'tipo' = 'escolha'
       and not (coalesce(v_pergunta -> 'opcoes', '[]'::jsonb) ? v_resposta) then
      raise exception 'Opção inválida.';
    end if;

    v_respostas := v_respostas || jsonb_build_array(
      jsonb_build_object('pergunta', v_pergunta ->> 'texto', 'resposta', v_resposta)
    );
  end loop;

  insert into public.clientes (empresa_id, nome, email, telefone, estado, origem, respostas)
  values (v_empresa_id, p_nome, p_email, p_telefone, 'novo', 'formulario',
          nullif(v_respostas, '[]'::jsonb))
  returning id into v_cliente_id;

  insert into public.automacoes_log (empresa_id, cliente_id, tipo, estado)
  values (v_empresa_id, v_cliente_id, 'boas_vindas', 'pendente');
end;
$$;
