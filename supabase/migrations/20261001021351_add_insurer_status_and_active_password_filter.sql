alter table public.seguradoras
  add column if not exists status public.status_registro not null default 'ativo'::public.status_registro;

drop function if exists public.app_listar_seguradoras();

create function public.app_listar_seguradoras(p_status text default 'ativo')
returns table (id uuid, nome text, status text)
language plpgsql
security definer
set search_path = public
as $function$
begin
  if not public.app_tem_permissao('central_senhas', 'view')
     and not public.app_tem_permissao('central_senhas', 'create')
     and not public.app_tem_permissao('central_senhas', 'update')
     and not public.app_tem_permissao('central_senhas', 'delete') then
    raise exception 'Permissao insuficiente para consultar seguradoras.';
  end if;

  if coalesce(p_status, '') not in ('ativo', 'inativo', 'todos') then
    raise exception 'Status de seguradora inválido.';
  end if;

  return query
  select s.id, s.nome, s.status::text
  from public.seguradoras s
  where p_status = 'todos' or s.status::text = p_status
  order by lower(s.nome);
end;
$function$;

create or replace function public.app_alterar_status_seguradora(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_status public.status_registro;
  v_nome text;
begin
  if not public.app_tem_permissao('central_senhas', 'update') then
    raise exception 'Permissao insuficiente para alterar status da seguradora.';
  end if;

  if p_id is null or p_status is null or p_status not in ('ativo', 'inativo') then
    raise exception 'Informe a seguradora e um status válido.';
  end if;

  v_status := p_status::public.status_registro;

  update public.seguradoras
  set status = v_status, updated_at = now()
  where id = p_id
  returning nome into v_nome;

  if not found then
    raise exception 'Seguradora não encontrada.';
  end if;

  perform public.app_registrar_auditoria(
    'update',
    'central_senhas',
    null::uuid,
    jsonb_build_object('seguradora_id', p_id, 'seguradora_nome', v_nome, 'status', v_status::text)
  );
end;
$function$;

revoke all on function public.app_listar_seguradoras(text) from public, anon;
revoke all on function public.app_alterar_status_seguradora(uuid, text) from public, anon;

grant execute on function public.app_listar_seguradoras(text) to authenticated;
grant execute on function public.app_alterar_status_seguradora(uuid, text) to authenticated;;
