create extension if not exists pgcrypto;

create table if not exists public.perfis (
  id uuid primary key default gen_random_uuid(),
  slug text,
  nome text,
  descricao text,
  nivel integer default 0,
  status text not null default 'ativo',
  sistema boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.perfis
  add column if not exists slug text,
  add column if not exists nome text,
  add column if not exists descricao text,
  add column if not exists nivel integer default 0,
  add column if not exists status text not null default 'ativo',
  add column if not exists sistema boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.perfis
set slug = lower(regexp_replace(coalesce(slug, nome, id::text), '[^a-zA-Z0-9]+', '_', 'g'))
where slug is null or btrim(slug) = '';

update public.perfis
set nome = initcap(replace(slug, '_', ' '))
where nome is null or btrim(nome) = '';

alter table public.perfis
  alter column slug set not null,
  alter column nome set not null;

create unique index if not exists perfis_slug_unique_idx on public.perfis (slug);

insert into public.perfis (slug, nome, descricao, nivel, sistema, status)
values
  ('admin', 'Admin', 'Acesso administrativo total', 100, true, 'ativo'),
  ('usuario', 'Usuário', 'Usuário operacional padrão', 20, true, 'ativo'),
  ('especial', 'Especial', 'Usuário com acessos diferenciados', 30, true, 'ativo'),
  ('consulta', 'Consulta', 'Usuário somente leitura', 10, true, 'ativo')
on conflict (slug) do update
set nome = excluded.nome,
    descricao = excluded.descricao,
    nivel = excluded.nivel,
    sistema = excluded.sistema,
    updated_at = now();

create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  nome text,
  email text,
  perfil_id uuid references public.perfis(id),
  perfil text,
  status text not null default 'pendente',
  is_master boolean not null default false,
  liberado_em timestamptz,
  bloqueado_em timestamptz,
  motivo_bloqueio text,
  ultimo_login_em timestamptz,
  preferencia_modo_visual text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.usuarios
  add column if not exists auth_user_id uuid,
  add column if not exists nome text,
  add column if not exists email text,
  add column if not exists perfil_id uuid,
  add column if not exists perfil text,
  add column if not exists status text not null default 'pendente',
  add column if not exists is_master boolean not null default false,
  add column if not exists liberado_em timestamptz,
  add column if not exists bloqueado_em timestamptz,
  add column if not exists motivo_bloqueio text,
  add column if not exists ultimo_login_em timestamptz,
  add column if not exists preferencia_modo_visual text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.usuarios
set status = 'ativo'
where status is null or btrim(status::text) = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'usuarios_status_check'
      and conrelid = 'public.usuarios'::regclass
  ) then
    alter table public.usuarios
      add constraint usuarios_status_check check (status::text in ('pendente', 'ativo', 'bloqueado', 'inativo'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'usuarios_perfil_id_fkey'
      and conrelid = 'public.usuarios'::regclass
  ) then
    alter table public.usuarios
      add constraint usuarios_perfil_id_fkey foreign key (perfil_id) references public.perfis(id);
  end if;
end $$;

create or replace function public.app_tem_permissao(p_recurso text, p_acao text default 'view')
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select false
$$;

do $$
begin
  if to_regclass('public.ar_validacoes') is not null then
    drop policy if exists ar_validacoes_authenticated_all on public.ar_validacoes;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'ar_validacoes' and policyname = 'ar_validacoes_select_permission'
    ) then
      create policy ar_validacoes_select_permission on public.ar_validacoes
        for select to authenticated
        using (public.app_tem_permissao('painel_ar.validacoes', 'view'));
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'ar_validacoes' and policyname = 'ar_validacoes_insert_permission'
    ) then
      create policy ar_validacoes_insert_permission on public.ar_validacoes
        for insert to authenticated
        with check (
          public.app_tem_permissao('painel_ar.validacoes', 'importar')
          or public.app_tem_permissao('painel_ar.validacoes', 'emitir_recibo')
        );
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'ar_validacoes' and policyname = 'ar_validacoes_update_permission'
    ) then
      create policy ar_validacoes_update_permission on public.ar_validacoes
        for update to authenticated
        using (
          public.app_tem_permissao('painel_ar.validacoes', 'importar')
          or public.app_tem_permissao('painel_ar.validacoes', 'emitir_recibo')
          or public.app_tem_permissao('painel_ar.validacoes', 'cancelar_recibo')
        )
        with check (
          public.app_tem_permissao('painel_ar.validacoes', 'importar')
          or public.app_tem_permissao('painel_ar.validacoes', 'emitir_recibo')
          or public.app_tem_permissao('painel_ar.validacoes', 'cancelar_recibo')
        );
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'ar_validacoes' and policyname = 'ar_validacoes_delete_permission'
    ) then
      create policy ar_validacoes_delete_permission on public.ar_validacoes
        for delete to authenticated
        using (public.app_tem_permissao('painel_ar.validacoes', 'excluir_importacao'));
    end if;
  end if;

  if to_regclass('public.ar_recibos') is not null then
    drop policy if exists ar_recibos_authenticated_all on public.ar_recibos;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'ar_recibos' and policyname = 'ar_recibos_select_permission'
    ) then
      create policy ar_recibos_select_permission on public.ar_recibos
        for select to authenticated
        using (public.app_tem_permissao('painel_ar.validacoes', 'view'));
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'ar_recibos' and policyname = 'ar_recibos_insert_permission'
    ) then
      create policy ar_recibos_insert_permission on public.ar_recibos
        for insert to authenticated
        with check (public.app_tem_permissao('painel_ar.validacoes', 'emitir_recibo'));
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'ar_recibos' and policyname = 'ar_recibos_update_permission'
    ) then
      create policy ar_recibos_update_permission on public.ar_recibos
        for update to authenticated
        using (public.app_tem_permissao('painel_ar.validacoes', 'cancelar_recibo'))
        with check (public.app_tem_permissao('painel_ar.validacoes', 'cancelar_recibo'));
    end if;
  end if;

  if to_regclass('public.ar_recibo_itens') is not null then
    drop policy if exists ar_recibo_itens_authenticated_all on public.ar_recibo_itens;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'ar_recibo_itens' and policyname = 'ar_recibo_itens_select_permission'
    ) then
      create policy ar_recibo_itens_select_permission on public.ar_recibo_itens
        for select to authenticated
        using (public.app_tem_permissao('painel_ar.validacoes', 'view'));
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'ar_recibo_itens' and policyname = 'ar_recibo_itens_insert_permission'
    ) then
      create policy ar_recibo_itens_insert_permission on public.ar_recibo_itens
        for insert to authenticated
        with check (public.app_tem_permissao('painel_ar.validacoes', 'emitir_recibo'));
    end if;
  end if;

  if to_regclass('public.ar_recibo_sequencias') is not null then
    drop policy if exists ar_recibo_sequencias_authenticated_all on public.ar_recibo_sequencias;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'ar_recibo_sequencias' and policyname = 'ar_recibo_sequencias_emitir_recibo'
    ) then
      create policy ar_recibo_sequencias_emitir_recibo on public.ar_recibo_sequencias
        for all to authenticated
        using (public.app_tem_permissao('painel_ar.validacoes', 'emitir_recibo'))
        with check (public.app_tem_permissao('painel_ar.validacoes', 'emitir_recibo'));
    end if;
  end if;

  if to_regclass('public.ar_importacoes') is not null then
    drop policy if exists ar_importacoes_authenticated_all on public.ar_importacoes;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'ar_importacoes' and policyname = 'ar_importacoes_select_permission'
    ) then
      create policy ar_importacoes_select_permission on public.ar_importacoes
        for select to authenticated
        using (public.app_tem_permissao('painel_ar.validacoes', 'view'));
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'ar_importacoes' and policyname = 'ar_importacoes_insert_permission'
    ) then
      create policy ar_importacoes_insert_permission on public.ar_importacoes
        for insert to authenticated
        with check (public.app_tem_permissao('painel_ar.validacoes', 'importar'));
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'ar_importacoes' and policyname = 'ar_importacoes_update_permission'
    ) then
      create policy ar_importacoes_update_permission on public.ar_importacoes
        for update to authenticated
        using (public.app_tem_permissao('painel_ar.validacoes', 'importar'))
        with check (public.app_tem_permissao('painel_ar.validacoes', 'importar'));
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'ar_importacoes' and policyname = 'ar_importacoes_delete_permission'
    ) then
      create policy ar_importacoes_delete_permission on public.ar_importacoes
        for delete to authenticated
        using (public.app_tem_permissao('painel_ar.validacoes', 'excluir_importacao'));
    end if;
  end if;
end $$;

do $$
begin
  if to_regclass('public.chaves_acesso') is not null then
    alter table public.chaves_acesso enable row level security;
    execute 'grant select, insert, update, delete on table public.chaves_acesso to authenticated';

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'chaves_acesso' and policyname = 'chaves_acesso_select_permission'
    ) then
      create policy chaves_acesso_select_permission on public.chaves_acesso
        for select to authenticated
        using (public.app_tem_permissao('central_senhas', 'view'));
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'chaves_acesso' and policyname = 'chaves_acesso_insert_permission'
    ) then
      create policy chaves_acesso_insert_permission on public.chaves_acesso
        for insert to authenticated
        with check (public.app_tem_permissao('central_senhas', 'create'));
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'chaves_acesso' and policyname = 'chaves_acesso_update_permission'
    ) then
      create policy chaves_acesso_update_permission on public.chaves_acesso
        for update to authenticated
        using (public.app_tem_permissao('central_senhas', 'update'))
        with check (public.app_tem_permissao('central_senhas', 'update'));
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'chaves_acesso' and policyname = 'chaves_acesso_delete_permission'
    ) then
      create policy chaves_acesso_delete_permission on public.chaves_acesso
        for delete to authenticated
        using (public.app_tem_permissao('central_senhas', 'delete'));
    end if;

    execute $function$
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
      as $rpc$
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
          c.status,
          c.data_inicio::text,
          c.data_fim::text,
          c.created_at
        from public.chaves_acesso c
        order by c.created_at desc;
      end;
      $rpc$;
    $function$;

    execute 'revoke all on function public.app_listar_chaves_acesso() from public';
    execute 'grant execute on function public.app_listar_chaves_acesso() to authenticated';

    execute $function$
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
      as $rpc$
      declare
        registro record;
        acao_auditoria text;
      begin
        if nullif(trim(coalesce(p_chave, '')), '') is null then
          raise exception 'Informe a senha do acesso.';
        end if;

        if p_id is null then
          if not public.app_tem_permissao('central_senhas', 'create') then
            raise exception 'Permissao insuficiente para criar acesso.';
          end if;

          insert into public.chaves_acesso (usuario_id, descricao, chave, status)
          values (
            public.app_usuario_atual_id(),
            coalesce(p_descricao, ''),
            trim(p_chave),
            case when p_status = 'inativo' then 'inativo' else 'ativo' end
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
              status = case when p_status = 'inativo' then 'inativo' else 'ativo' end
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
      $rpc$;
    $function$;

    execute 'revoke all on function public.app_salvar_chave_acesso(uuid, text, text, text) from public';
    execute 'grant execute on function public.app_salvar_chave_acesso(uuid, text, text, text) to authenticated';

    execute $function$
      create or replace function public.app_excluir_chave_acesso(p_id uuid)
      returns void
      language plpgsql
      security definer
      set search_path = public
      as $rpc$
      declare
        registro record;
      begin
        if not public.app_tem_permissao('central_senhas', 'delete') then
          raise exception 'Permissao insuficiente para excluir acesso.';
        end if;

        delete from public.chaves_acesso c
        where c.id = p_id
        returning c.id, c.status into registro;

        if not found then
          raise exception 'Acesso nao encontrado.';
        end if;

        perform public.app_registrar_auditoria(
          'central_senhas',
          'delete',
          registro.id::text,
          jsonb_build_object('status', registro.status)
        );
      end;
      $rpc$;
    $function$;

    execute 'revoke all on function public.app_excluir_chave_acesso(uuid) from public';
    execute 'grant execute on function public.app_excluir_chave_acesso(uuid) to authenticated';
  end if;
end $$;

create unique index if not exists usuarios_auth_user_id_unique_idx
  on public.usuarios (auth_user_id)
  where auth_user_id is not null;

create unique index if not exists usuarios_email_unique_idx
  on public.usuarios (lower(email))
  where email is not null;

update public.usuarios u
set perfil_id = p.id,
    updated_at = now()
from public.perfis p
where u.perfil_id is null
  and p.slug = case
    when lower(coalesce(u.perfil::text, '')) in ('admin', 'gestor') then 'admin'
    when lower(coalesce(u.perfil::text, '')) in ('especial') then 'especial'
    when lower(coalesce(u.perfil::text, '')) in ('consulta') then 'consulta'
    else 'usuario'
  end;

create table if not exists public.recursos_acesso (
  chave text primary key,
  nome text not null,
  tipo text not null,
  recurso_pai text references public.recursos_acesso(chave),
  rota text,
  ordem integer not null default 999,
  status text not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.perfil_permissoes (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  recurso_chave text not null references public.recursos_acesso(chave) on delete cascade,
  acao text not null,
  permitido boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (perfil_id, recurso_chave, acao)
);

create table if not exists public.usuario_permissoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  recurso_chave text not null references public.recursos_acesso(chave) on delete cascade,
  acao text not null,
  efeito text not null check (efeito in ('permitir', 'negar')),
  motivo text,
  valido_de timestamptz,
  valido_ate timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.usuarios(id),
  updated_at timestamptz not null default now(),
  unique (usuario_id, recurso_chave, acao)
);

create table if not exists public.auditoria_acessos (
  id uuid primary key default gen_random_uuid(),
  autor_usuario_id uuid references public.usuarios(id),
  alvo_usuario_id uuid references public.usuarios(id),
  acao text not null,
  recurso text,
  detalhes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.recursos_acesso (chave, nome, tipo, recurso_pai, rota, ordem, status)
values
  ('links_corretora', 'Links Corretora', 'modulo', null, '/', 1, 'ativo'),
  ('links_ar', 'Links AR', 'modulo', null, '/', 2, 'ativo'),
  ('links_gestao', 'Links Gestão', 'modulo', null, '/', 3, 'ativo'),
  ('painel_ar', 'Painel AR', 'modulo', null, '/painel-ar', 10, 'ativo'),
  ('painel_ar.gerar_links', 'Gerar Links', 'aba', 'painel_ar', '/painel-ar', 11, 'ativo'),
  ('painel_ar.validacoes', 'Validações', 'aba', 'painel_ar', '/painel-ar', 12, 'ativo'),
  ('painel_ar.validacoes.importacao', 'Importação de Repasse', 'acao', 'painel_ar.validacoes', '/painel-ar', 13, 'ativo'),
  ('painel_ar.validacoes.recibos', 'Recibos', 'acao', 'painel_ar.validacoes', '/painel-ar', 14, 'ativo'),
  ('central_senhas', 'Central de Senhas', 'modulo', null, '/central-senhas', 20, 'ativo'),
  ('admin', 'Administração', 'modulo', null, '/admin', 90, 'ativo'),
  ('admin.usuarios', 'Usuários', 'aba', 'admin', '/admin/usuarios', 91, 'ativo'),
  ('admin.perfis', 'Perfis de Acesso', 'aba', 'admin', '/admin/perfis', 92, 'ativo'),
  ('admin.permissoes', 'Permissões por Módulo', 'aba', 'admin', '/admin/permissoes', 93, 'ativo')
on conflict (chave) do update
set nome = excluded.nome,
    tipo = excluded.tipo,
    recurso_pai = excluded.recurso_pai,
    rota = excluded.rota,
    ordem = excluded.ordem,
    status = excluded.status,
    updated_at = now();

with admin_perfil as (
  select id from public.perfis where slug = 'admin'
),
permissoes_admin as (
  select recurso.chave, acao
  from public.recursos_acesso recurso
  cross join unnest(array['view', 'create', 'update', 'delete', 'execute', 'block', 'manage_permissions', 'view_secret', 'importar', 'excluir_importacao', 'emitir_recibo', 'cancelar_recibo']) as acao
  where recurso.status = 'ativo'
)
insert into public.perfil_permissoes (perfil_id, recurso_chave, acao, permitido)
select admin_perfil.id, permissoes_admin.chave, permissoes_admin.acao, true
from admin_perfil
cross join permissoes_admin
on conflict (perfil_id, recurso_chave, acao) do update
set permitido = true,
    updated_at = now();

with perfil_base as (
  select id, slug from public.perfis where slug in ('usuario', 'especial', 'consulta')
),
permissoes_base as (
  select *
  from (values
    ('links_corretora', 'view'),
    ('links_ar', 'view'),
    ('links_gestao', 'view'),
    ('painel_ar', 'view'),
    ('painel_ar.gerar_links', 'view'),
    ('painel_ar.gerar_links', 'execute'),
    ('painel_ar.validacoes', 'view'),
    ('central_senhas', 'view')
  ) as permissao(recurso_chave, acao)
)
insert into public.perfil_permissoes (perfil_id, recurso_chave, acao, permitido)
select perfil_base.id, permissoes_base.recurso_chave, permissoes_base.acao, true
from perfil_base
cross join permissoes_base
where perfil_base.slug in ('usuario', 'especial')
on conflict (perfil_id, recurso_chave, acao) do nothing;

with perfil_consulta as (
  select id from public.perfis where slug = 'consulta'
),
permissoes_consulta as (
  select *
  from (values
    ('links_corretora', 'view'),
    ('links_ar', 'view'),
    ('links_gestao', 'view'),
    ('painel_ar', 'view'),
    ('painel_ar.gerar_links', 'view'),
    ('painel_ar.validacoes', 'view'),
    ('central_senhas', 'view')
  ) as permissao(recurso_chave, acao)
)
insert into public.perfil_permissoes (perfil_id, recurso_chave, acao, permitido)
select perfil_consulta.id, permissoes_consulta.recurso_chave, permissoes_consulta.acao, true
from perfil_consulta
cross join permissoes_consulta
on conflict (perfil_id, recurso_chave, acao) do nothing;

create or replace function public.app_usuario_atual_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id
  from public.usuarios u
  where u.status::text = 'ativo'
    and (
      u.auth_user_id = auth.uid()
      or lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  order by case when u.auth_user_id = auth.uid() then 0 else 1 end
  limit 1
$$;

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
      select *,
             row_number() over (
               partition by recurso_chave, acao
               order by case origem
                 when 'usuario_negar' then 1
                 when 'usuario_permitir' then 2
                 else 3
               end
             ) as prioridade
      from combinadas
    )
    select priorizadas.recurso_chave, priorizadas.acao, priorizadas.permitido, priorizadas.origem
    from priorizadas
    where prioridade = 1
      and permitido = true;
end;
$$;

create or replace function public.app_registrar_auditoria(
  p_acao text,
  p_recurso text default null,
  p_alvo_usuario_id uuid default null,
  p_detalhes jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auditoria_id uuid;
  v_autor_usuario_id uuid;
begin
  v_autor_usuario_id := public.app_usuario_atual_id();

  if v_autor_usuario_id is null then
    raise exception 'Usuário autenticado não encontrado para auditoria.';
  end if;

  insert into public.auditoria_acessos (
    autor_usuario_id,
    alvo_usuario_id,
    acao,
    recurso,
    detalhes
  )
  values (
    v_autor_usuario_id,
    p_alvo_usuario_id,
    p_acao,
    p_recurso,
    coalesce(p_detalhes, '{}'::jsonb)
  )
  returning id into v_auditoria_id;

  return v_auditoria_id;
end;
$$;

alter table public.perfis enable row level security;
alter table public.usuarios enable row level security;
alter table public.recursos_acesso enable row level security;
alter table public.perfil_permissoes enable row level security;
alter table public.usuario_permissoes enable row level security;
alter table public.auditoria_acessos enable row level security;

grant select on table public.recursos_acesso to authenticated;
grant select, insert, update on table public.perfis to authenticated;
grant select, insert, update on table public.perfil_permissoes to authenticated;
grant select, insert, update, delete on table public.usuario_permissoes to authenticated;
grant select, insert, update on table public.usuarios to authenticated;
grant insert on table public.auditoria_acessos to authenticated;

revoke execute on function public.app_usuario_atual_id() from public;
revoke execute on function public.app_tem_permissao(text, text) from public;
revoke execute on function public.app_permissoes_efetivas() from public;
revoke execute on function public.app_registrar_auditoria(text, text, uuid, jsonb) from public;

grant execute on function public.app_usuario_atual_id() to authenticated;
grant execute on function public.app_tem_permissao(text, text) to authenticated;
grant execute on function public.app_permissoes_efetivas() to authenticated;
grant execute on function public.app_registrar_auditoria(text, text, uuid, jsonb) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'usuarios' and policyname = 'usuarios_select_self_or_admin'
  ) then
    create policy usuarios_select_self_or_admin on public.usuarios
      for select to authenticated
      using (
        id = public.app_usuario_atual_id()
        or public.app_tem_permissao('admin.usuarios', 'view')
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'usuarios' and policyname = 'usuarios_update_admin'
  ) then
    create policy usuarios_update_admin on public.usuarios
      for update to authenticated
      using (public.app_tem_permissao('admin.usuarios', 'update'))
      with check (public.app_tem_permissao('admin.usuarios', 'update'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'usuarios' and policyname = 'usuarios_insert_admin'
  ) then
    create policy usuarios_insert_admin on public.usuarios
      for insert to authenticated
      with check (public.app_tem_permissao('admin.usuarios', 'create'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'perfis' and policyname = 'perfis_select_authenticated'
  ) then
    create policy perfis_select_authenticated on public.perfis
      for select to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'perfis' and policyname = 'perfis_insert_admin'
  ) then
    create policy perfis_insert_admin on public.perfis
      for insert to authenticated
      with check (public.app_tem_permissao('admin.perfis', 'create'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'perfis' and policyname = 'perfis_update_admin'
  ) then
    create policy perfis_update_admin on public.perfis
      for update to authenticated
      using (public.app_tem_permissao('admin.perfis', 'update'))
      with check (public.app_tem_permissao('admin.perfis', 'update'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'recursos_acesso' and policyname = 'recursos_acesso_select_authenticated'
  ) then
    create policy recursos_acesso_select_authenticated on public.recursos_acesso
      for select to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'perfil_permissoes' and policyname = 'perfil_permissoes_select_admin_or_own'
  ) then
    create policy perfil_permissoes_select_admin_or_own on public.perfil_permissoes
      for select to authenticated
      using (
        public.app_tem_permissao('admin.permissoes', 'view')
        or perfil_id = (
          select u.perfil_id
          from public.usuarios u
          where u.id = public.app_usuario_atual_id()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'perfil_permissoes' and policyname = 'perfil_permissoes_insert_admin'
  ) then
    create policy perfil_permissoes_insert_admin on public.perfil_permissoes
      for insert to authenticated
      with check (public.app_tem_permissao('admin.permissoes', 'update'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'perfil_permissoes' and policyname = 'perfil_permissoes_update_admin'
  ) then
    create policy perfil_permissoes_update_admin on public.perfil_permissoes
      for update to authenticated
      using (public.app_tem_permissao('admin.permissoes', 'update'))
      with check (public.app_tem_permissao('admin.permissoes', 'update'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'usuario_permissoes' and policyname = 'usuario_permissoes_select_admin_or_own'
  ) then
    create policy usuario_permissoes_select_admin_or_own on public.usuario_permissoes
      for select to authenticated
      using (
        public.app_tem_permissao('admin.permissoes', 'view')
        or usuario_id = public.app_usuario_atual_id()
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'usuario_permissoes' and policyname = 'usuario_permissoes_insert_admin'
  ) then
    create policy usuario_permissoes_insert_admin on public.usuario_permissoes
      for insert to authenticated
      with check (public.app_tem_permissao('admin.usuarios', 'manage_permissions'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'usuario_permissoes' and policyname = 'usuario_permissoes_update_admin'
  ) then
    create policy usuario_permissoes_update_admin on public.usuario_permissoes
      for update to authenticated
      using (public.app_tem_permissao('admin.usuarios', 'manage_permissions'))
      with check (public.app_tem_permissao('admin.usuarios', 'manage_permissions'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'usuario_permissoes' and policyname = 'usuario_permissoes_delete_admin'
  ) then
    create policy usuario_permissoes_delete_admin on public.usuario_permissoes
      for delete to authenticated
      using (public.app_tem_permissao('admin.usuarios', 'manage_permissions'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'auditoria_acessos' and policyname = 'auditoria_insert_authenticated'
  ) then
    create policy auditoria_insert_authenticated on public.auditoria_acessos
      for insert to authenticated
      with check (autor_usuario_id = public.app_usuario_atual_id());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'auditoria_acessos' and policyname = 'auditoria_select_admin'
  ) then
    create policy auditoria_select_admin on public.auditoria_acessos
      for select to authenticated
      using (public.app_tem_permissao('admin.usuarios', 'view'));
  end if;
end $$;
