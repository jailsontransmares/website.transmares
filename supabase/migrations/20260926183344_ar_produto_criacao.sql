drop policy if exists produtos_ar_insert_permission on public.produtos_ar;
create policy produtos_ar_insert_permission
  on public.produtos_ar
  for insert
  to authenticated
  with check (
    public.app_tem_permissao('painel_ar.produtos', 'update')
    and status = 'ativo'::public.status_registro
    and nullif(btrim(product_id), '') is not null
    and nullif(btrim(descricao_comercial), '') is not null
  );

create or replace function public.ar_criar_produto(
  p_grupo text,
  p_descricao_comercial text,
  p_product_id text,
  p_preco_com_desconto numeric,
  p_preco_sem_desconto numeric,
  p_ac text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_grupo text := nullif(btrim(p_grupo), '');
  v_descricao text := nullif(btrim(p_descricao_comercial), '');
  v_product_id text := nullif(btrim(p_product_id), '');
  v_ac text := nullif(btrim(p_ac), '');
  v_produto public.produtos_ar%rowtype;
begin
  if not public.app_tem_permissao('painel_ar.produtos', 'update') then
    raise exception 'Seu usuário não possui permissão para adicionar produtos.'
      using errcode = '42501';
  end if;

  if v_grupo is null then
    raise exception 'O grupo do produto é obrigatório.';
  end if;

  if v_descricao is null or length(v_descricao) > 300 then
    raise exception 'Informe uma descrição com até 300 caracteres.';
  end if;

  if v_product_id is null or length(v_product_id) > 100 then
    raise exception 'Informe um SKU com até 100 caracteres.';
  end if;

  if p_preco_com_desconto < 0 or p_preco_sem_desconto < 0 then
    raise exception 'Os preços não podem ser negativos.';
  end if;

  if p_preco_com_desconto is not null
    and p_preco_sem_desconto is not null
    and p_preco_com_desconto > p_preco_sem_desconto then
    raise exception 'O valor com desconto não pode superar o valor padrão.';
  end if;

  if exists (
    select 1
    from public.produtos_ar produto
    where coalesce(nullif(btrim(produto.tipo_certificado), ''), nullif(btrim(produto.ac), ''), 'Produtos') = v_grupo
      and nullif(btrim(produto.ac), '') is not null
  ) and not exists (
    select 1
    from public.produtos_ar produto
    where coalesce(nullif(btrim(produto.tipo_certificado), ''), nullif(btrim(produto.ac), ''), 'Produtos') = v_grupo
      and nullif(btrim(produto.ac), '') = v_ac
  ) then
    raise exception 'Selecione uma AC já definida para este grupo.';
  end if;

  if exists (
    select 1
    from public.produtos_ar produto
    where lower(btrim(produto.product_id)) = lower(v_product_id)
  ) then
    raise exception 'Este SKU já está cadastrado.';
  end if;

  insert into public.produtos_ar (
    product_id,
    descricao_comercial,
    tipo_certificado,
    ac,
    preco_com_desconto,
    preco_sem_desconto,
    status,
    updated_at
  ) values (
    v_product_id,
    v_descricao,
    v_grupo,
    v_ac,
    p_preco_com_desconto,
    p_preco_sem_desconto,
    'ativo'::public.status_registro,
    now()
  )
  returning * into v_produto;

  return jsonb_build_object('produto', to_jsonb(v_produto));
exception
  when unique_violation then
    raise exception 'Este SKU já está cadastrado.' using errcode = '23505';
end;
$$;

revoke execute on function public.ar_criar_produto(text, text, text, numeric, numeric, text) from public;
revoke execute on function public.ar_criar_produto(text, text, text, numeric, numeric, text) from anon;
grant execute on function public.ar_criar_produto(text, text, text, numeric, numeric, text) to authenticated;;
