alter table public.parceiros
  add column if not exists principal_codigo_revendedor boolean not null default false;

create unique index if not exists parceiros_codigo_revendedor_principal_uidx
  on public.parceiros (upper(btrim(codigo_revendedor::text)))
  where principal_codigo_revendedor is true
    and nullif(btrim(codigo_revendedor::text), '') is not null;

create or replace function public.admin_marcar_parceiro_principal_codigo_revendedor(p_parceiro_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_codigo text;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária para definir o cadastro principal.'
      using errcode = '42501';
  end if;

  if not public.app_tem_permissao('admin.parceiros_indicacao', 'update') then
    raise exception 'Sem permissão para definir o cadastro principal do parceiro.'
      using errcode = '42501';
  end if;

  select parceiro.codigo_revendedor::text
    into v_codigo
  from public.parceiros as parceiro
  where parceiro.id = p_parceiro_id
  for update;

  if not found then
    raise exception 'Parceiro não encontrado.';
  end if;

  if nullif(btrim(v_codigo), '') is null then
    raise exception 'Informe o código do revendedor antes de definir o cadastro principal.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(upper(btrim(v_codigo)), 0)
  );

  update public.parceiros as parceiro
  set principal_codigo_revendedor = false
  where upper(btrim(parceiro.codigo_revendedor::text)) = upper(btrim(v_codigo))
    and parceiro.principal_codigo_revendedor is true;

  update public.parceiros as parceiro
  set principal_codigo_revendedor = true
  where parceiro.id = p_parceiro_id;

  return p_parceiro_id;
end;
$$;

revoke all on function public.admin_marcar_parceiro_principal_codigo_revendedor(uuid) from public, anon;
grant execute on function public.admin_marcar_parceiro_principal_codigo_revendedor(uuid) to authenticated;

create or replace function public.ar_recibo_dados_pix_parceiro(p_codigo_revendedor text)
returns table (
  nome text,
  nome_completo text,
  codigo_revendedor text,
  nome_chave_pix text,
  chave_pix text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária para consultar os dados PIX do parceiro.'
      using errcode = '42501';
  end if;

  if not (
    public.app_tem_permissao('painel_ar.validacoes', 'view')
    or public.app_tem_permissao('admin.parceiros_indicacao', 'view_sensitive')
  ) then
    raise exception 'Sem permissão para consultar os dados PIX do parceiro.'
      using errcode = '42501';
  end if;

  if nullif(btrim(p_codigo_revendedor), '') is null then
    return;
  end if;

  return query
  select
    parceiro.nome::text,
    parceiro.nome_completo::text,
    parceiro.codigo_revendedor::text,
    parceiro.nome_chave_pix::text,
    parceiro.chave_pix::text
  from public.parceiros as parceiro
  where upper(btrim(parceiro.codigo_revendedor::text)) = upper(btrim(p_codigo_revendedor))
  order by
    parceiro.principal_codigo_revendedor desc,
    parceiro.updated_at desc nulls last,
    parceiro.created_at desc nulls last
  limit 1;
end;
$$;
