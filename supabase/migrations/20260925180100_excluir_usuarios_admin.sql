create or replace function public.app_excluir_usuario_admin(p_usuario_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_usuario_id is null then
    raise exception 'Informe o usuário que será excluído.';
  end if;

  -- Preserve os registros de auditoria, mas remova a dependência do usuário.
  update public.auditoria_acessos
  set autor_usuario_id = null
  where autor_usuario_id = p_usuario_id;

  update public.auditoria_acessos
  set alvo_usuario_id = null
  where alvo_usuario_id = p_usuario_id;

  update public.corretora_configuracoes
  set updated_by = null
  where updated_by = p_usuario_id;

  update public.usuario_permissoes
  set created_by = null
  where created_by = p_usuario_id;

  delete from public.usuarios
  where id = p_usuario_id;

  if not found then
    raise exception 'Usuário não encontrado.';
  end if;
exception
  when foreign_key_violation then
    raise exception 'Este usuário possui registros históricos vinculados que impedem a exclusão. Inative-o para preservar esses dados.';
end;
$$;

revoke all on function public.app_excluir_usuario_admin(uuid) from public, anon, authenticated;
grant execute on function public.app_excluir_usuario_admin(uuid) to service_role;
