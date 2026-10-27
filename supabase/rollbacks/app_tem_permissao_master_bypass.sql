-- Rollback source for 20261002013744_aplicar_status_recursos_a_master.sql.
-- To roll back, create a NEW migration with `supabase migration new` and copy
-- this function body into it; do not edit/revert an already-applied migration.
create or replace function public.app_tem_permissao(p_recurso text, p_acao text default 'view')
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid;
  v_perfil_id uuid;
  v_is_master boolean;
  v_perfil_legacy text;
  v_negado boolean;
  v_permitido boolean;
begin
  select u.id, u.perfil_id, coalesce(u.is_master, false), lower(coalesce(u.perfil::text, ''))
    into v_usuario_id, v_perfil_id, v_is_master, v_perfil_legacy
  from public.usuarios u
  where u.status::text = 'ativo'
    and (
      u.auth_user_id = auth.uid()
      or lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  order by case when u.auth_user_id = auth.uid() then 0 else 1 end
  limit 1;

  if v_usuario_id is null then
    return false;
  end if;

  if v_is_master then
    return true;
  end if;

  if v_perfil_id is null then
    select p.id
      into v_perfil_id
    from public.perfis p
    where p.slug = case
      when v_perfil_legacy in ('admin', 'gestor') then 'admin'
      when v_perfil_legacy in ('especial') then 'especial'
      when v_perfil_legacy in ('consulta') then 'consulta'
      else 'usuario'
    end
    limit 1;
  end if;

  select exists (
    select 1
    from public.usuario_permissoes up
    join public.recursos_acesso r on r.chave = up.recurso_chave
    where up.usuario_id = v_usuario_id
      and up.recurso_chave = p_recurso
      and up.acao = p_acao
      and up.efeito = 'negar'
      and r.status = 'ativo'
      and (up.valido_de is null or up.valido_de <= now())
      and (up.valido_ate is null or up.valido_ate >= now())
  ) into v_negado;

  if v_negado then
    return false;
  end if;

  select exists (
    select 1
    from public.usuario_permissoes up
    join public.recursos_acesso r on r.chave = up.recurso_chave
    where up.usuario_id = v_usuario_id
      and up.recurso_chave = p_recurso
      and up.acao = p_acao
      and up.efeito = 'permitir'
      and r.status = 'ativo'
      and (up.valido_de is null or up.valido_de <= now())
      and (up.valido_ate is null or up.valido_ate >= now())
  ) into v_permitido;

  if v_permitido then
    return true;
  end if;

  select exists (
    select 1
    from public.perfil_permissoes pp
    join public.perfis p on p.id = pp.perfil_id
    join public.recursos_acesso r on r.chave = pp.recurso_chave
    where pp.perfil_id = v_perfil_id
      and pp.recurso_chave = p_recurso
      and pp.acao = p_acao
      and pp.permitido = true
      and p.status = 'ativo'
      and r.status = 'ativo'
  ) into v_permitido;

  return coalesce(v_permitido, false);
end;
$$;
