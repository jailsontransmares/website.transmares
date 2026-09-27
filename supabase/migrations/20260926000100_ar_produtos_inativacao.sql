create or replace function public.ar_atualizar_status_produtos(
  p_produto_ids uuid[],
  p_status_atual text,
  p_status text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_total integer;
  v_produtos jsonb;
begin
  if not public.app_tem_permissao('painel_ar.produtos', 'update') then
    raise exception 'Seu usuário não possui permissão para alterar o status dos produtos.'
      using errcode = '42501';
  end if;

  if p_status_atual is null
    or p_status_atual not in ('ativo', 'inativo')
    or p_status is null
    or p_status not in ('ativo', 'inativo')
    or p_status_atual = p_status then
    raise exception 'Status de produto inválido.';
  end if;

  if p_produto_ids is null
    or cardinality(p_produto_ids) = 0
    or cardinality(p_produto_ids) > 200 then
    raise exception 'Selecione entre 1 e 200 produtos para alterar.';
  end if;

  if exists (
    select 1
    from unnest(p_produto_ids) as item(id)
    where item.id is null
  ) or (
    select count(distinct id) <> cardinality(p_produto_ids)
    from unnest(p_produto_ids) as item(id)
  ) then
    raise exception 'A seleção contém identificadores inválidos ou repetidos.';
  end if;

  update public.produtos_ar produto
  set status = p_status::public.status_registro,
      updated_at = now()
  where produto.id = any(p_produto_ids)
    and produto.status = p_status_atual::public.status_registro;

  get diagnostics v_total = row_count;

  if v_total <> cardinality(p_produto_ids) then
    raise exception 'Um ou mais produtos não foram encontrados ou não podem ser atualizados.';
  end if;

  select coalesce(jsonb_agg(to_jsonb(produto) order by produto.descricao_comercial), '[]'::jsonb)
    into v_produtos
  from public.produtos_ar produto
  where produto.id = any(p_produto_ids);

  return jsonb_build_object(
    'status', p_status,
    'total', v_total,
    'produtos', v_produtos
  );
end;
$$;

revoke execute on function public.ar_atualizar_status_produtos(uuid[], text, text) from public;
revoke execute on function public.ar_atualizar_status_produtos(uuid[], text, text) from anon;
grant execute on function public.ar_atualizar_status_produtos(uuid[], text, text) to authenticated;
