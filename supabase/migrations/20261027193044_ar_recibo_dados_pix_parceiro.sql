-- Expose only the partner identity and PIX fields needed by AR receipts.
-- The regular parceiros RLS policy intentionally does not grant AR users
-- access to the full partner directory.
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
    p.nome::text,
    p.nome_completo::text,
    p.codigo_revendedor::text,
    p.nome_chave_pix::text,
    p.chave_pix::text
  from public.parceiros as p
  where upper(btrim(p.codigo_revendedor::text)) = upper(btrim(p_codigo_revendedor))
  order by p.updated_at desc nulls last, p.created_at desc nulls last
  limit 1;
end;
$$;

revoke all on function public.ar_recibo_dados_pix_parceiro(text) from public, anon;
grant execute on function public.ar_recibo_dados_pix_parceiro(text) to authenticated;
