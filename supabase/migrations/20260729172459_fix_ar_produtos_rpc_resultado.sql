create or replace function public.ar_atualizar_produtos_grupo(
  p_grupo text,
  p_produtos jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_grupo text := btrim(coalesce(p_grupo, ''));
  v_total integer;
  v_atualizados integer;
  v_produtos jsonb;
begin
  if not public.app_tem_permissao('painel_ar.produtos', 'update') then
    raise exception 'Seu usuário não possui permissão para editar produtos.'
      using errcode = '42501';
  end if;

  if v_grupo = '' then
    raise exception 'Grupo de produtos não informado.';
  end if;

  if p_produtos is null
    or jsonb_typeof(p_produtos) <> 'array'
    or jsonb_array_length(p_produtos) = 0 then
    raise exception 'Nenhum produto foi informado para atualização.';
  end if;

  if jsonb_array_length(p_produtos) > 200 then
    raise exception 'O grupo excede o limite de 200 produtos por atualização.';
  end if;

  create temporary table if not exists ar_produtos_edicao_payload (
    id uuid primary key,
    descricao_comercial text,
    preco_com_desconto numeric,
    preco_sem_desconto numeric,
    product_id text,
    ordem bigint
  ) on commit drop;

  truncate table ar_produtos_edicao_payload;

  begin
    insert into ar_produtos_edicao_payload (
      id,
      descricao_comercial,
      preco_com_desconto,
      preco_sem_desconto,
      product_id,
      ordem
    )
    select
      (item.valor ->> 'id')::uuid,
      btrim(item.valor ->> 'descricao_comercial'),
      nullif(item.valor ->> 'preco_com_desconto', '')::numeric,
      nullif(item.valor ->> 'preco_sem_desconto', '')::numeric,
      btrim(item.valor ->> 'product_id'),
      item.ordem
    from jsonb_array_elements(p_produtos) with ordinality as item(valor, ordem);
  exception
    when unique_violation then
      raise exception 'A atualização contém produtos repetidos.';
    when invalid_text_representation or numeric_value_out_of_range or not_null_violation then
      raise exception 'Há identificador ou valor numérico inválido na atualização.';
  end;

  select count(*)
    into v_total
  from ar_produtos_edicao_payload;

  if v_total <> jsonb_array_length(p_produtos) then
    raise exception 'Todos os produtos devem ser enviados como objetos válidos.';
  end if;

  if exists (
    select 1
    from ar_produtos_edicao_payload
    where descricao_comercial is null
      or descricao_comercial = ''
      or char_length(descricao_comercial) > 300
      or product_id is null
      or product_id = ''
      or char_length(product_id) > 100
      or preco_com_desconto < 0
      or preco_sem_desconto < 0
      or (
        preco_com_desconto is not null
        and preco_sem_desconto is not null
        and preco_com_desconto > preco_sem_desconto
      )
  ) then
    raise exception 'Revise descrição, SKU e valores dos produtos antes de salvar.';
  end if;

  if exists (
    select 1
    from ar_produtos_edicao_payload item
    left join public.produtos_ar produto on produto.id = item.id
    where produto.id is null
      or produto.status::text <> 'ativo'
      or coalesce(
        nullif(btrim(produto.tipo_certificado), ''),
        nullif(btrim(produto.ac), ''),
        'Produtos'
      ) <> v_grupo
  ) then
    raise exception 'Um ou mais produtos não pertencem ao grupo informado ou estão inativos.';
  end if;

  if exists (
    select 1
    from ar_produtos_edicao_payload
    group by lower(product_id)
    having count(*) > 1
  ) then
    raise exception 'Não é permitido repetir o SKU dentro do grupo.';
  end if;

  if exists (
    select 1
    from ar_produtos_edicao_payload item
    join public.produtos_ar existente
      on lower(btrim(existente.product_id)) = lower(item.product_id)
     and existente.id <> item.id
    where not exists (
      select 1
      from ar_produtos_edicao_payload alterado
      where alterado.id = existente.id
    )
  ) then
    raise exception 'Um dos SKUs informados já está vinculado a outro produto.';
  end if;

  update public.produtos_ar produto
  set product_id = '__tmp_ar_produto__'
      || replace(produto.id::text, '-', '')
      || '_'
      || txid_current()::text,
      updated_at = now()
  from ar_produtos_edicao_payload payload
  where produto.id = payload.id;

  get diagnostics v_atualizados = row_count;

  if v_atualizados <> v_total then
    raise exception 'Não foi possível preparar todos os produtos para atualização.';
  end if;

  update public.produtos_ar produto
  set descricao_comercial = payload.descricao_comercial,
      preco_com_desconto = payload.preco_com_desconto,
      preco_sem_desconto = payload.preco_sem_desconto,
      product_id = payload.product_id,
      updated_at = now()
  from ar_produtos_edicao_payload payload
  where produto.id = payload.id;

  get diagnostics v_atualizados = row_count;

  if v_atualizados <> v_total then
    raise exception 'Nem todos os produtos do grupo foram atualizados.';
  end if;

  select jsonb_agg(to_jsonb(produto) order by payload.ordem)
    into v_produtos
  from ar_produtos_edicao_payload payload
  join public.produtos_ar produto on produto.id = payload.id;

  return jsonb_build_object(
    'grupo', v_grupo,
    'total', v_total,
    'produtos', coalesce(v_produtos, '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.ar_atualizar_produtos_grupo(text, jsonb) from public;
revoke execute on function public.ar_atualizar_produtos_grupo(text, jsonb) from anon;
grant execute on function public.ar_atualizar_produtos_grupo(text, jsonb) to authenticated;
;
