create or replace function public.ar_resolver_nomes_parceiros_por_codigo(p_codigos_revendedor text[])
returns table (
  codigo_revendedor text,
  nome text,
  principal_codigo_revendedor boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária para consultar os nomes dos parceiros.'
      using errcode = '42501';
  end if;

  if not (
    public.app_tem_permissao('painel_ar.validacoes', 'view')
    or public.app_tem_permissao('admin.parceiros_indicacao', 'view_sensitive')
  ) then
    raise exception 'Sem permissão para consultar os nomes dos parceiros.'
      using errcode = '42501';
  end if;

  if p_codigos_revendedor is null or cardinality(p_codigos_revendedor) = 0 then
    return;
  end if;

  return query
  with codigos as (
    select distinct upper(btrim(entrada.codigo)) as codigo_normalizado
    from unnest(p_codigos_revendedor) as entrada(codigo)
    where nullif(btrim(entrada.codigo), '') is not null
  )
  select distinct on (codigos.codigo_normalizado)
    parceiro.codigo_revendedor::text,
    coalesce(nullif(btrim(parceiro.nome_completo::text), ''), nullif(btrim(parceiro.nome::text), '')),
    coalesce(parceiro.principal_codigo_revendedor, false)
  from codigos
  join public.parceiros as parceiro
    on upper(btrim(parceiro.codigo_revendedor::text)) = codigos.codigo_normalizado
  order by
    codigos.codigo_normalizado,
    parceiro.principal_codigo_revendedor desc nulls last,
    parceiro.updated_at desc nulls last,
    parceiro.created_at desc nulls last;
end;
$$;

revoke all on function public.ar_resolver_nomes_parceiros_por_codigo(text[]) from public, anon;
grant execute on function public.ar_resolver_nomes_parceiros_por_codigo(text[]) to authenticated;
