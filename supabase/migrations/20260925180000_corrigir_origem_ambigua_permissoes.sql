create or replace function public.app_permissoes_efetivas()
returns table(recurso_chave text, acao text, permitido boolean, origem text)
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
    return;
  end if;

  if v_is_master then
    return query
      select distinct pp.recurso_chave, pp.acao, true, 'master'
      from public.perfil_permissoes pp
      join public.recursos_acesso r on r.chave = pp.recurso_chave
      where pp.permitido = true
        and r.status = 'ativo';
    return;
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

  return query
    with perfil_base as (
      select pp.recurso_chave, pp.acao, true as permitido, 'perfil'::text as origem
      from public.perfil_permissoes pp
      join public.perfis p on p.id = pp.perfil_id
      join public.recursos_acesso r on r.chave = pp.recurso_chave
      where pp.perfil_id = v_perfil_id
        and pp.permitido = true
        and p.status = 'ativo'
        and r.status = 'ativo'
    ),
    individuais as (
      select up.recurso_chave,
             up.acao,
             up.efeito = 'permitir' as permitido,
             ('usuario_' || up.efeito)::text as origem
      from public.usuario_permissoes up
      join public.recursos_acesso r on r.chave = up.recurso_chave
      where up.usuario_id = v_usuario_id
        and r.status = 'ativo'
        and (up.valido_de is null or up.valido_de <= now())
        and (up.valido_ate is null or up.valido_ate >= now())
    ),
    combinadas as (
      select * from perfil_base
      union all
      select * from individuais
    ),
    priorizadas as (
      select combinadas.recurso_chave,
             combinadas.acao,
             combinadas.permitido,
             combinadas.origem,
             row_number() over (
               partition by combinadas.recurso_chave, combinadas.acao
               order by case combinadas.origem
                 when 'usuario_negar' then 1
                 when 'usuario_permitir' then 2
                 else 3
               end
             ) as prioridade
      from combinadas
    )
    select priorizadas.recurso_chave, priorizadas.acao, priorizadas.permitido, priorizadas.origem
    from priorizadas
    where priorizadas.prioridade = 1
      and priorizadas.permitido = true;
end;
$$;
