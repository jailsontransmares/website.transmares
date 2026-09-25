create or replace function public.crm2_responsaveis_ativos()
returns table (id uuid, nome text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.app_tem_permissao('painel_ar', 'view') then
    raise exception 'Sem permissão para consultar responsáveis do CRM.';
  end if;

  return query
  select
    u.id,
    coalesce(nullif(btrim(u.nome), ''), nullif(btrim(u.email), ''), 'Usuário')::text
  from public.usuarios as u
  where lower(btrim(u.status::text)) = 'ativo'
  order by lower(coalesce(nullif(btrim(u.nome), ''), nullif(btrim(u.email), ''), 'Usuário'));
end;
$$;

revoke all on function public.crm2_responsaveis_ativos() from public, anon;
grant execute on function public.crm2_responsaveis_ativos() to authenticated;
