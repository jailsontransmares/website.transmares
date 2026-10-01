create or replace function public.app_salvar_chave_acesso(
  p_id uuid default null,
  p_descricao text default '',
  p_chave text default '',
  p_status text default 'ativo'
)
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
  registro record;
  acao_auditoria text;
  status_acesso public.status_registro;
begin
  if nullif(trim(coalesce(p_chave, '')), '') is null then
    raise exception 'Informe a senha do acesso.';
  end if;

  status_acesso := case
    when p_status = 'inativo' then 'inativo'
    else 'ativo'
  end::public.status_registro;

  if p_id is null then
    if not public.app_tem_permissao('central_senhas', 'create') then
      raise exception 'Permissao insuficiente para criar acesso.';
    end if;

    insert into public.chaves_acesso (usuario_id, descricao, chave, status)
    values (
      public.app_usuario_atual_id(),
      coalesce(p_descricao, ''),
      trim(p_chave),
      status_acesso
    )
    returning * into registro;

    acao_auditoria := 'create';
  else
    if not public.app_tem_permissao('central_senhas', 'update') then
      raise exception 'Permissao insuficiente para editar acesso.';
    end if;

    update public.chaves_acesso c
    set descricao = coalesce(p_descricao, ''),
        chave = trim(p_chave),
        status = status_acesso
    where c.id = p_id
    returning * into registro;

    if not found then
      raise exception 'Acesso nao encontrado.';
    end if;

    acao_auditoria := 'update';
  end if;

  perform public.app_registrar_auditoria(
    'central_senhas',
    acao_auditoria,
    registro.id::text,
    jsonb_build_object('status', registro.status)
  );

  return query
  select
    registro.id::uuid,
    registro.descricao::text,
    registro.chave::text,
    registro.status::text,
    registro.data_inicio::text,
    registro.data_fim::text,
    registro.created_at::timestamptz;
end;
$function$;

revoke all on function public.app_salvar_chave_acesso(uuid, text, text, text) from public;
grant execute on function public.app_salvar_chave_acesso(uuid, text, text, text) to authenticated;
