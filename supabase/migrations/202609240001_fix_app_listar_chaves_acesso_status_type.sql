create or replace function public.app_listar_chaves_acesso()
returns table (
  id uuid,
  descricao text,
  chave text,
  status text,
  data_inicio text,
  data_fim text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  pode_ver_senha boolean;
begin
  if not public.app_tem_permissao('central_senhas', 'view') then
    raise exception 'Permissao insuficiente para visualizar a Central de Senhas.';
  end if;

  pode_ver_senha := public.app_tem_permissao('central_senhas', 'view_secret');

  return query
  select
    c.id,
    c.descricao,
    case when pode_ver_senha then c.chave else null end as chave,
    c.status::text,
    c.data_inicio::text,
    c.data_fim::text,
    c.created_at
  from public.chaves_acesso c
  order by c.created_at desc;
end;
$function$;
