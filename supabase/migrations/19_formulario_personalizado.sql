-- =====================================================================
-- FlowCRM · 19 · Formulário personalizado
-- A empresa passa a escolher, para o formulário público:
--   - a cor (uma de 8), o título e o texto de entrada;
--   - a mensagem depois de enviar e, se quiser, um botão com link;
--   - até 15 perguntas (eram 10), com tipos novos: várias escolhas, lista,
--     sim/não, número e data, e uma linha de ajuda em cada pergunta.
-- Os textos vazios (null) usam os textos por defeito do site (lib/formulario.js).
-- =====================================================================

alter table public.empresas
  add column form_cor text not null default 'verde'
    check (form_cor in ('verde', 'azul', 'roxo', 'rosa', 'vermelho', 'laranja', 'amarelo', 'cinzento')),
  add column form_titulo text
    check (form_titulo is null or char_length(form_titulo) between 1 and 80),
  add column form_texto text
    check (form_texto is null or char_length(form_texto) between 1 and 300),
  add column obrigado_texto text
    check (obrigado_texto is null or char_length(obrigado_texto) between 1 and 300),
  add column obrigado_botao_texto text
    check (obrigado_botao_texto is null or char_length(obrigado_botao_texto) between 1 and 40),
  -- só links http(s): nada de "javascript:" escondido num botão
  add column obrigado_botao_link text
    check (obrigado_botao_link is null
           or (char_length(obrigado_botao_link) <= 300 and obrigado_botao_link ~ '^https?://[^\s]+$'));

-- até 15 perguntas
alter table public.empresas drop constraint empresas_perguntas_check;
alter table public.empresas
  add constraint empresas_perguntas_check
  check (jsonb_typeof(perguntas) = 'array' and jsonb_array_length(perguntas) <= 15);

-- o administrador pode mudar estas colunas (a migração 18 limitou as colunas editáveis)
grant update (form_cor, form_titulo, form_texto, obrigado_texto, obrigado_botao_texto, obrigado_botao_link)
  on public.empresas to authenticated;

-- ---------- o formulário público passa a receber as opções novas ----------
create or replace function public.formulario_publico(p_slug text)
returns json
language sql stable security definer
set search_path = ''
as $$
  select json_build_object(
    'nome', nome,
    'logo_url', logo_url,
    'perguntas', perguntas,
    'cor', form_cor,
    'titulo', form_titulo,
    'texto', form_texto,
    'obrigado_texto', obrigado_texto,
    'obrigado_botao_texto', obrigado_botao_texto,
    'obrigado_botao_link', obrigado_botao_link
  )
  from public.empresas where slug = p_slug;
$$;

-- ---------- criar_lead valida os tipos novos ----------
-- As respostas chegam como { "<id da pergunta>": "texto" } e, nas de várias
-- escolhas, { "<id>": ["opção 1", "opção 2"] }. Ficam guardadas no cliente como
-- texto ("opção 1, opção 2"; datas como 21/11/2026), para a ficha as mostrar.
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
  v_tipo       text;
  v_opcoes     jsonb;
  v_valor      jsonb;
  v_resposta   text;
  v_data       date;
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

  -- o comercial da própria empresa não responde ao formulário (migração 17)
  if exists (
    select 1 from public.perfis
    where id = (select auth.uid()) and empresa_id = v_empresa_id and papel = 'comercial'
  ) then
    raise exception 'Os comerciais não podem responder ao formulário da própria empresa.';
  end if;

  for v_pergunta in select * from jsonb_array_elements(v_perguntas) loop
    v_tipo   := coalesce(v_pergunta ->> 'tipo', 'texto');
    v_opcoes := coalesce(v_pergunta -> 'opcoes', '[]'::jsonb);
    v_valor  := p_respostas -> (v_pergunta ->> 'id');

    -- 1) ler a resposta como texto
    if v_tipo = 'varias' then
      if v_valor is null or jsonb_typeof(v_valor) <> 'array' or jsonb_array_length(v_valor) = 0 then
        v_resposta := null;
      else
        -- cada opção marcada tem de ser uma das opções da pergunta
        if jsonb_array_length(v_valor) > 12 or exists (
          select 1 from jsonb_array_elements(v_valor) e
          where jsonb_typeof(e) <> 'string' or not (v_opcoes @> jsonb_build_array(e))
        ) then
          raise exception 'Opção inválida.';
        end if;
        select string_agg(e #>> '{}', ', ') into v_resposta from jsonb_array_elements(v_valor) e;
      end if;
    else
      v_resposta := case when jsonb_typeof(v_valor) = 'string' then nullif(trim(v_valor #>> '{}'), '') end;
    end if;

    -- 2) obrigatória?
    if v_resposta is null then
      if coalesce((v_pergunta ->> 'obrigatoria')::boolean, false) then
        raise exception 'Falta responder a uma pergunta obrigatória.';
      end if;
      continue;
    end if;

    if char_length(v_resposta) > 2000 then
      raise exception 'Resposta demasiado longa.';
    end if;

    -- 3) validar conforme o tipo
    if v_tipo in ('escolha', 'lista') and not (v_opcoes ? v_resposta) then
      raise exception 'Opção inválida.';
    elsif v_tipo = 'sim_nao' and v_resposta not in ('Sim', 'Não') then
      raise exception 'Responde sim ou não.';
    elsif v_tipo = 'numero' and v_resposta !~ '^-?[0-9]{1,12}([.,][0-9]{1,4})?$' then
      raise exception 'Número inválido.';
    elsif v_tipo = 'data' then
      begin
        if v_resposta !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
          raise exception 'Data inválida.';
        end if;
        v_data := v_resposta::date;
      exception when others then
        raise exception 'Data inválida.';
      end;
      v_resposta := to_char(v_data, 'DD/MM/YYYY');
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
