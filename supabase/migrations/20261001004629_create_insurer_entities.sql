create table if not exists public.seguradoras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seguradoras_nome_nao_vazio check (length(btrim(nome)) > 0)
);

create unique index if not exists seguradoras_nome_normalizado_uidx
  on public.seguradoras (lower(btrim(nome)));

alter table public.seguradoras enable row level security;

alter table public.chaves_acesso
  add column if not exists seguradora_id uuid references public.seguradoras(id) on delete restrict;

create index if not exists chaves_acesso_seguradora_id_idx
  on public.chaves_acesso (seguradora_id);

with legados as (
  select min(nullif(btrim(dados.categoria), '')) as nome
  from public.chaves_acesso c
  cross join lateral (
    select case
      when pg_input_is_valid(c.descricao, 'jsonb') then c.descricao::jsonb ->> 'categoria'
      else null
    end as categoria
  ) dados
  where nullif(btrim(dados.categoria), '') is not null
  group by lower(btrim(dados.categoria))
)
insert into public.seguradoras (nome)
select legados.nome
from legados
where not exists (
  select 1 from public.seguradoras s
  where lower(btrim(s.nome)) = lower(btrim(legados.nome))
);

with legados as (
  select c.id, nullif(btrim(dados.categoria), '') as nome
  from public.chaves_acesso c
  cross join lateral (
    select case
      when pg_input_is_valid(c.descricao, 'jsonb') then c.descricao::jsonb ->> 'categoria'
      else null
    end as categoria
  ) dados
  where nullif(btrim(dados.categoria), '') is not null
)
update public.chaves_acesso c
set seguradora_id = s.id
from legados l
join public.seguradoras s on lower(btrim(s.nome)) = lower(btrim(l.nome))
where c.id = l.id
  and c.seguradora_id is null;

drop function if exists public.app_listar_chaves_acesso();

create function public.app_listar_chaves_acesso()
returns table (
  id uuid,
  descricao text,
  chave text,
  status text,
  data_inicio text,
  data_fim text,
  created_at timestamptz,
  seguradora_id uuid,
  seguradora_nome text
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  pode_ver_senha boolean;
begin
  if not public.app_tem_permissao('central_senhas', 'view')
     and not public.app_tem_permissao('central_senhas', 'create')
     and not public.app_tem_permissao('central_senhas', 'update')
     and not public.app_tem_permissao('central_senhas', 'delete') then
    raise exception 'Permissao insuficiente para visualizar a Central de Senhas.';
  end if;

  pode_ver_senha := public.app_tem_permissao('central_senhas', 'view_secret');

  return query
  select
    c.id,
    c.descricao,
    case when pode_ver_senha then c.chave else null end,
    c.status::text,
    c.data_inicio::text,
    c.data_fim::text,
    c.created_at,
    c.seguradora_id,
    s.nome
  from public.chaves_acesso c
  left join public.seguradoras s on s.id = c.seguradora_id
  order by lower(coalesce(s.nome, '')), c.created_at desc;
end;
$function$;

create or replace function public.app_listar_seguradoras()
returns table (id uuid, nome text)
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

  return query
  select s.id, s.nome
  from public.seguradoras s
  order by lower(s.nome);
end;
$function$;

create or replace function public.app_salvar_acesso_seguradora(
  p_id uuid,
  p_seguradora_id uuid,
  p_descricao text,
  p_chave text,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  registro record;
  status_acesso public.status_registro;
begin
  if not public.app_tem_permissao('central_senhas', 'update') then
    raise exception 'Permissao insuficiente para editar acesso.';
  end if;

  if p_id is null or p_seguradora_id is null then
    raise exception 'Informe o acesso e a seguradora.';
  end if;

  if nullif(trim(coalesce(p_chave, '')), '') is null then
    raise exception 'Informe a senha do acesso.';
  end if;

  if not exists (select 1 from public.seguradoras s where s.id = p_seguradora_id) then
    raise exception 'Seguradora nao encontrada.';
  end if;

  status_acesso := case when p_status = 'inativo' then 'inativo' else 'ativo' end::public.status_registro;

  update public.chaves_acesso c
  set seguradora_id = p_seguradora_id,
      descricao = coalesce(p_descricao, ''),
      chave = trim(p_chave),
      status = status_acesso
  where c.id = p_id
  returning c.id, c.status into registro;

  if not found then
    raise exception 'Acesso nao encontrado.';
  end if;

  perform public.app_registrar_auditoria(
    'update',
    'central_senhas',
    null::uuid,
    jsonb_build_object('acesso_id', registro.id, 'seguradora_id', p_seguradora_id, 'status', registro.status)
  );
end;
$function$;

create or replace function public.app_criar_acessos_seguradora(
  p_seguradora_id uuid default null,
  p_nome text default null,
  p_acessos jsonb default '[]'::jsonb
)
returns table (seguradora_id uuid, seguradora_nome text, acessos_criados integer)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_seguradora_id uuid;
  v_nome text;
  v_acesso jsonb;
  v_titulo text;
  v_descricao text;
  v_url text;
  v_login text;
  v_chave text;
  v_grupo text;
  v_status public.status_registro;
  v_acesso_id uuid;
  v_total integer := 0;
begin
  if not public.app_tem_permissao('central_senhas', 'create') then
    raise exception 'Permissao insuficiente para criar acesso.';
  end if;

  if jsonb_typeof(p_acessos) <> 'array' or jsonb_array_length(p_acessos) = 0 then
    raise exception 'Adicione pelo menos um acesso à seguradora.';
  end if;

  if p_seguradora_id is null then
    v_nome := nullif(btrim(coalesce(p_nome, '')), '');
    if v_nome is null then
      raise exception 'Informe o nome da seguradora.';
    end if;

    insert into public.seguradoras (nome)
    values (v_nome)
    returning id, nome into v_seguradora_id, v_nome;
  else
    select s.id, s.nome into v_seguradora_id, v_nome
    from public.seguradoras s
    where s.id = p_seguradora_id;

    if not found then
      raise exception 'Seguradora nao encontrada.';
    end if;
  end if;

  for v_acesso in select value from jsonb_array_elements(p_acessos)
  loop
    v_titulo := nullif(btrim(coalesce(v_acesso ->> 'titulo', '')), '');
    v_descricao := btrim(coalesce(v_acesso ->> 'descricao', ''));
    v_url := btrim(coalesce(v_acesso ->> 'url', ''));
    v_login := nullif(btrim(coalesce(v_acesso ->> 'login', '')), '');
    v_chave := nullif(btrim(coalesce(v_acesso ->> 'senha', '')), '');
    v_grupo := btrim(coalesce(v_acesso ->> 'grupo', ''));

    if v_titulo is null or v_login is null or v_chave is null then
      raise exception 'Cada acesso precisa de título, login e senha.';
    end if;

    if v_url <> '' and v_url !~* '^https?://' then
      raise exception 'Use uma URL começando com http:// ou https://.';
    end if;

    v_status := case when v_acesso ->> 'status' = 'inativo' then 'inativo' else 'ativo' end::public.status_registro;

    insert into public.chaves_acesso (usuario_id, seguradora_id, descricao, chave, status)
    values (
      public.app_usuario_atual_id(),
      v_seguradora_id,
      jsonb_build_object(
        'titulo', v_titulo,
        'descricao', v_descricao,
        'url', v_url,
        'login', v_login,
        'grupo', v_grupo
      )::text,
      v_chave,
      v_status
    )
    returning id into v_acesso_id;

    perform public.app_registrar_auditoria(
      'create',
      'central_senhas',
      null::uuid,
      jsonb_build_object('acesso_id', v_acesso_id, 'seguradora_id', v_seguradora_id, 'status', v_status)
    );

    v_total := v_total + 1;
  end loop;

  if p_seguradora_id is null then
    perform public.app_registrar_auditoria(
      'create',
      'central_senhas',
      null::uuid,
      jsonb_build_object('seguradora_id', v_seguradora_id, 'seguradora_nome', v_nome)
    );
  end if;

  return query select v_seguradora_id, v_nome, v_total;
end;
$function$;

create or replace function public.app_renomear_seguradora(p_id uuid, p_nome text)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_nome text := nullif(btrim(coalesce(p_nome, '')), '');
begin
  if not public.app_tem_permissao('central_senhas', 'update') then
    raise exception 'Permissao insuficiente para editar seguradora.';
  end if;

  if p_id is null or v_nome is null then
    raise exception 'Informe a seguradora e o novo nome.';
  end if;

  update public.seguradoras
  set nome = v_nome, updated_at = now()
  where id = p_id;

  if not found then
    raise exception 'Seguradora nao encontrada.';
  end if;

  perform public.app_registrar_auditoria(
    'update',
    'central_senhas',
    null::uuid,
    jsonb_build_object('seguradora_id', p_id, 'seguradora_nome', v_nome)
  );
end;
$function$;

create or replace function public.app_excluir_seguradora(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_nome text;
begin
  if not public.app_tem_permissao('central_senhas', 'delete') then
    raise exception 'Permissao insuficiente para excluir seguradora.';
  end if;

  select nome into v_nome from public.seguradoras where id = p_id;
  if not found then
    raise exception 'Seguradora nao encontrada.';
  end if;

  if exists (select 1 from public.chaves_acesso where seguradora_id = p_id) then
    raise exception 'Remova ou mova os acessos antes de excluir a seguradora.';
  end if;

  delete from public.seguradoras where id = p_id;

  perform public.app_registrar_auditoria(
    'delete',
    'central_senhas',
    null::uuid,
    jsonb_build_object('seguradora_id', p_id, 'seguradora_nome', v_nome)
  );
end;
$function$;

revoke all on function public.app_listar_chaves_acesso() from public, anon;
revoke all on function public.app_listar_seguradoras() from public, anon;
revoke all on function public.app_salvar_acesso_seguradora(uuid, uuid, text, text, text) from public, anon;
revoke all on function public.app_criar_acessos_seguradora(uuid, text, jsonb) from public, anon;
revoke all on function public.app_renomear_seguradora(uuid, text) from public, anon;
revoke all on function public.app_excluir_seguradora(uuid) from public, anon;

grant execute on function public.app_listar_chaves_acesso() to authenticated;
grant execute on function public.app_listar_seguradoras() to authenticated;
grant execute on function public.app_salvar_acesso_seguradora(uuid, uuid, text, text, text) to authenticated;
grant execute on function public.app_criar_acessos_seguradora(uuid, text, jsonb) to authenticated;
grant execute on function public.app_renomear_seguradora(uuid, text) to authenticated;
grant execute on function public.app_excluir_seguradora(uuid) to authenticated;
