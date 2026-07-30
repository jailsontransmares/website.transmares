create table if not exists public.rh_colaboradores (
  id uuid primary key default gen_random_uuid(),
  nome_completo text not null,
  data_nascimento date not null,
  estado_civil text,
  nacionalidade text,
  naturalidade text,
  nome_pai text,
  nome_mae text,
  sexo text,
  escolaridade text,
  cor_raca text,
  telefone_celular text,
  email_contato text,
  contato_emergencia_nome text,
  contato_emergencia_telefone text,
  endereco_logradouro text,
  endereco_numero text,
  endereco_complemento text,
  endereco_bairro text,
  endereco_cidade text,
  endereco_uf text,
  endereco_cep text,
  status text not null default 'ativo',
  observacoes text,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rh_colaboradores_nome_check
    check (length(btrim(nome_completo)) >= 3),
  constraint rh_colaboradores_nascimento_check
    check (data_nascimento between date '1900-01-01' and current_date),
  constraint rh_colaboradores_contato_check
    check (
      nullif(btrim(coalesce(telefone_celular, '')), '') is not null
      or nullif(btrim(coalesce(email_contato, '')), '') is not null
    ),
  constraint rh_colaboradores_email_check
    check (
      email_contato is null
      or email_contato ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ),
  constraint rh_colaboradores_uf_check
    check (endereco_uf is null or endereco_uf ~ '^[A-Z]{2}$'),
  constraint rh_colaboradores_cep_check
    check (endereco_cep is null or endereco_cep ~ '^[0-9]{8}$'),
  constraint rh_colaboradores_status_check
    check (status in ('ativo', 'inativo'))
);

create table if not exists public.rh_documentos_cadastrais (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null unique
    references public.rh_colaboradores(id) on delete restrict,
  cpf text not null unique,
  identidade_tipo text,
  identidade_numero text,
  identidade_data_emissao date,
  identidade_orgao_emissor text,
  identidade_uf_emissor text,
  cnh_categoria text,
  titulo_eleitor text,
  zona_eleitoral text,
  secao_eleitoral text,
  ctps_numero text,
  ctps_serie text,
  ctps_data_expedicao date,
  ctps_uf text,
  reservista_numero text,
  reservista_categoria text,
  pis_numero text,
  pis_data_cadastro date,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rh_documentos_cpf_check
    check (cpf ~ '^[0-9]{11}$' and cpf !~ '^([0-9])\1{10}$'),
  constraint rh_documentos_identidade_tipo_check
    check (identidade_tipo is null or identidade_tipo in ('rg', 'cnh')),
  constraint rh_documentos_identidade_uf_check
    check (identidade_uf_emissor is null or identidade_uf_emissor ~ '^[A-Z]{2}$'),
  constraint rh_documentos_ctps_uf_check
    check (ctps_uf is null or ctps_uf ~ '^[A-Z]{2}$')
);

create table if not exists public.rh_dependentes (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null
    references public.rh_colaboradores(id) on delete restrict,
  nome_completo text not null,
  data_nascimento date not null,
  parentesco text,
  ativo boolean not null default true,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rh_dependentes_nome_check
    check (length(btrim(nome_completo)) >= 3),
  constraint rh_dependentes_nascimento_check
    check (data_nascimento between date '1900-01-01' and current_date)
);

create index if not exists rh_colaboradores_nome_idx
  on public.rh_colaboradores (nome_completo);

create index if not exists rh_colaboradores_status_nome_idx
  on public.rh_colaboradores (status, nome_completo);

create index if not exists rh_colaboradores_updated_at_idx
  on public.rh_colaboradores (updated_at desc);

create index if not exists rh_documentos_colaborador_idx
  on public.rh_documentos_cadastrais (colaborador_id);

create index if not exists rh_dependentes_colaborador_ativo_idx
  on public.rh_dependentes (colaborador_id, ativo);

create unique index if not exists rh_dependentes_ativos_unicos_idx
  on public.rh_dependentes (
    colaborador_id,
    lower(btrim(nome_completo)),
    data_nascimento
  )
  where ativo;

create or replace function private.rh_preparar_inclusao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid;
begin
  v_usuario_id := public.app_usuario_atual_id();
  new.created_by := v_usuario_id;
  new.updated_by := v_usuario_id;
  return new;
end;
$$;

revoke all on function private.rh_preparar_inclusao() from public;
revoke all on function private.rh_preparar_inclusao() from anon;
revoke all on function private.rh_preparar_inclusao() from authenticated;

drop trigger if exists rh_colaboradores_prepare_insert on public.rh_colaboradores;
create trigger rh_colaboradores_prepare_insert
before insert on public.rh_colaboradores
for each row
execute function private.rh_preparar_inclusao();

drop trigger if exists rh_colaboradores_prepare_update on public.rh_colaboradores;
create trigger rh_colaboradores_prepare_update
before update on public.rh_colaboradores
for each row
execute function private.rh_preparar_atualizacao();

drop trigger if exists rh_colaboradores_audit on public.rh_colaboradores;
create trigger rh_colaboradores_audit
after insert or update or delete on public.rh_colaboradores
for each row
execute function private.rh_auditar_linha();

drop trigger if exists rh_documentos_prepare_insert on public.rh_documentos_cadastrais;
create trigger rh_documentos_prepare_insert
before insert on public.rh_documentos_cadastrais
for each row
execute function private.rh_preparar_inclusao();

drop trigger if exists rh_documentos_prepare_update on public.rh_documentos_cadastrais;
create trigger rh_documentos_prepare_update
before update on public.rh_documentos_cadastrais
for each row
execute function private.rh_preparar_atualizacao();

drop trigger if exists rh_documentos_audit on public.rh_documentos_cadastrais;
create trigger rh_documentos_audit
after insert or update or delete on public.rh_documentos_cadastrais
for each row
execute function private.rh_auditar_linha();

drop trigger if exists rh_dependentes_prepare_insert on public.rh_dependentes;
create trigger rh_dependentes_prepare_insert
before insert on public.rh_dependentes
for each row
execute function private.rh_preparar_inclusao();

drop trigger if exists rh_dependentes_prepare_update on public.rh_dependentes;
create trigger rh_dependentes_prepare_update
before update on public.rh_dependentes
for each row
execute function private.rh_preparar_atualizacao();

drop trigger if exists rh_dependentes_audit on public.rh_dependentes;
create trigger rh_dependentes_audit
after insert or update or delete on public.rh_dependentes
for each row
execute function private.rh_auditar_linha();

alter table public.rh_colaboradores enable row level security;
alter table public.rh_documentos_cadastrais enable row level security;
alter table public.rh_dependentes enable row level security;

revoke all on table public.rh_colaboradores from anon;
revoke all on table public.rh_documentos_cadastrais from anon;
revoke all on table public.rh_dependentes from anon;
revoke all on table public.rh_colaboradores from authenticated;
revoke all on table public.rh_documentos_cadastrais from authenticated;
revoke all on table public.rh_dependentes from authenticated;

grant select, insert, update on table public.rh_colaboradores to authenticated;
grant select, insert, update on table public.rh_documentos_cadastrais to authenticated;
grant select, insert, update on table public.rh_dependentes to authenticated;

drop policy if exists rh_colaboradores_select_permission on public.rh_colaboradores;
create policy rh_colaboradores_select_permission
on public.rh_colaboradores
for select
to authenticated
using ((select public.app_tem_permissao('rh_dp.colaboradores', 'view')));

drop policy if exists rh_colaboradores_insert_permission on public.rh_colaboradores;
create policy rh_colaboradores_insert_permission
on public.rh_colaboradores
for insert
to authenticated
with check ((select public.app_tem_permissao('rh_dp.colaboradores', 'create')));

drop policy if exists rh_colaboradores_update_permission on public.rh_colaboradores;
create policy rh_colaboradores_update_permission
on public.rh_colaboradores
for update
to authenticated
using ((select public.app_tem_permissao('rh_dp.colaboradores', 'update')))
with check ((select public.app_tem_permissao('rh_dp.colaboradores', 'update')));

drop policy if exists rh_documentos_select_permission on public.rh_documentos_cadastrais;
create policy rh_documentos_select_permission
on public.rh_documentos_cadastrais
for select
to authenticated
using (
  (select public.app_tem_permissao('rh_dp.colaboradores', 'view'))
  and (select public.app_tem_permissao('rh_dp.colaboradores', 'view_sensitive'))
);

drop policy if exists rh_documentos_insert_permission on public.rh_documentos_cadastrais;
create policy rh_documentos_insert_permission
on public.rh_documentos_cadastrais
for insert
to authenticated
with check (
  (
    (select public.app_tem_permissao('rh_dp.colaboradores', 'create'))
    or (select public.app_tem_permissao('rh_dp.colaboradores', 'update'))
  )
  and (select public.app_tem_permissao('rh_dp.colaboradores', 'view_sensitive'))
);

drop policy if exists rh_documentos_update_permission on public.rh_documentos_cadastrais;
create policy rh_documentos_update_permission
on public.rh_documentos_cadastrais
for update
to authenticated
using (
  (select public.app_tem_permissao('rh_dp.colaboradores', 'update'))
  and (select public.app_tem_permissao('rh_dp.colaboradores', 'view_sensitive'))
)
with check (
  (select public.app_tem_permissao('rh_dp.colaboradores', 'update'))
  and (select public.app_tem_permissao('rh_dp.colaboradores', 'view_sensitive'))
);

drop policy if exists rh_dependentes_select_permission on public.rh_dependentes;
create policy rh_dependentes_select_permission
on public.rh_dependentes
for select
to authenticated
using (
  (select public.app_tem_permissao('rh_dp.colaboradores', 'view'))
  and (select public.app_tem_permissao('rh_dp.colaboradores', 'view_sensitive'))
);

drop policy if exists rh_dependentes_insert_permission on public.rh_dependentes;
create policy rh_dependentes_insert_permission
on public.rh_dependentes
for insert
to authenticated
with check (
  (
    (select public.app_tem_permissao('rh_dp.colaboradores', 'create'))
    or (select public.app_tem_permissao('rh_dp.colaboradores', 'update'))
  )
  and (select public.app_tem_permissao('rh_dp.colaboradores', 'view_sensitive'))
);

drop policy if exists rh_dependentes_update_permission on public.rh_dependentes;
create policy rh_dependentes_update_permission
on public.rh_dependentes
for update
to authenticated
using (
  (select public.app_tem_permissao('rh_dp.colaboradores', 'update'))
  and (select public.app_tem_permissao('rh_dp.colaboradores', 'view_sensitive'))
)
with check (
  (select public.app_tem_permissao('rh_dp.colaboradores', 'update'))
  and (select public.app_tem_permissao('rh_dp.colaboradores', 'view_sensitive'))
);

create or replace function public.rh_salvar_cadastro_pessoal(
  p_colaborador_id uuid,
  p_colaborador jsonb,
  p_documentos jsonb default null,
  p_dependentes jsonb default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_colaborador_id uuid;
  v_dependente jsonb;
  v_dependente_id uuid;
  v_dependentes_ids uuid[];
  v_criando boolean := p_colaborador_id is null;
begin
  if p_colaborador is null then
    raise exception 'INVALID_COLLABORATOR';
  end if;

  if v_criando then
    if not public.app_tem_permissao('rh_dp.colaboradores', 'create') then
      raise exception 'RH_CREATE_DENIED';
    end if;

    if p_documentos is null
      or not public.app_tem_permissao('rh_dp.colaboradores', 'view_sensitive') then
      raise exception 'RH_SENSITIVE_DATA_REQUIRED';
    end if;

    insert into public.rh_colaboradores (
      nome_completo,
      data_nascimento,
      estado_civil,
      nacionalidade,
      naturalidade,
      nome_pai,
      nome_mae,
      sexo,
      escolaridade,
      cor_raca,
      telefone_celular,
      email_contato,
      contato_emergencia_nome,
      contato_emergencia_telefone,
      endereco_logradouro,
      endereco_numero,
      endereco_complemento,
      endereco_bairro,
      endereco_cidade,
      endereco_uf,
      endereco_cep,
      status,
      observacoes
    )
    values (
      nullif(btrim(p_colaborador ->> 'nome_completo'), ''),
      nullif(p_colaborador ->> 'data_nascimento', '')::date,
      nullif(btrim(p_colaborador ->> 'estado_civil'), ''),
      nullif(btrim(p_colaborador ->> 'nacionalidade'), ''),
      nullif(btrim(p_colaborador ->> 'naturalidade'), ''),
      nullif(btrim(p_colaborador ->> 'nome_pai'), ''),
      nullif(btrim(p_colaborador ->> 'nome_mae'), ''),
      nullif(btrim(p_colaborador ->> 'sexo'), ''),
      nullif(btrim(p_colaborador ->> 'escolaridade'), ''),
      nullif(btrim(p_colaborador ->> 'cor_raca'), ''),
      nullif(btrim(p_colaborador ->> 'telefone_celular'), ''),
      nullif(lower(btrim(p_colaborador ->> 'email_contato')), ''),
      nullif(btrim(p_colaborador ->> 'contato_emergencia_nome'), ''),
      nullif(btrim(p_colaborador ->> 'contato_emergencia_telefone'), ''),
      nullif(btrim(p_colaborador ->> 'endereco_logradouro'), ''),
      nullif(btrim(p_colaborador ->> 'endereco_numero'), ''),
      nullif(btrim(p_colaborador ->> 'endereco_complemento'), ''),
      nullif(btrim(p_colaborador ->> 'endereco_bairro'), ''),
      nullif(btrim(p_colaborador ->> 'endereco_cidade'), ''),
      nullif(upper(btrim(p_colaborador ->> 'endereco_uf')), ''),
      nullif(regexp_replace(coalesce(p_colaborador ->> 'endereco_cep', ''), '[^0-9]', '', 'g'), ''),
      coalesce(nullif(lower(btrim(p_colaborador ->> 'status')), ''), 'ativo'),
      nullif(btrim(p_colaborador ->> 'observacoes'), '')
    )
    returning id into v_colaborador_id;
  else
    if not public.app_tem_permissao('rh_dp.colaboradores', 'update') then
      raise exception 'RH_UPDATE_DENIED';
    end if;

    update public.rh_colaboradores
    set nome_completo = nullif(btrim(p_colaborador ->> 'nome_completo'), ''),
        data_nascimento = nullif(p_colaborador ->> 'data_nascimento', '')::date,
        estado_civil = nullif(btrim(p_colaborador ->> 'estado_civil'), ''),
        nacionalidade = nullif(btrim(p_colaborador ->> 'nacionalidade'), ''),
        naturalidade = nullif(btrim(p_colaborador ->> 'naturalidade'), ''),
        nome_pai = nullif(btrim(p_colaborador ->> 'nome_pai'), ''),
        nome_mae = nullif(btrim(p_colaborador ->> 'nome_mae'), ''),
        sexo = nullif(btrim(p_colaborador ->> 'sexo'), ''),
        escolaridade = nullif(btrim(p_colaborador ->> 'escolaridade'), ''),
        cor_raca = nullif(btrim(p_colaborador ->> 'cor_raca'), ''),
        telefone_celular = nullif(btrim(p_colaborador ->> 'telefone_celular'), ''),
        email_contato = nullif(lower(btrim(p_colaborador ->> 'email_contato')), ''),
        contato_emergencia_nome = nullif(btrim(p_colaborador ->> 'contato_emergencia_nome'), ''),
        contato_emergencia_telefone = nullif(btrim(p_colaborador ->> 'contato_emergencia_telefone'), ''),
        endereco_logradouro = nullif(btrim(p_colaborador ->> 'endereco_logradouro'), ''),
        endereco_numero = nullif(btrim(p_colaborador ->> 'endereco_numero'), ''),
        endereco_complemento = nullif(btrim(p_colaborador ->> 'endereco_complemento'), ''),
        endereco_bairro = nullif(btrim(p_colaborador ->> 'endereco_bairro'), ''),
        endereco_cidade = nullif(btrim(p_colaborador ->> 'endereco_cidade'), ''),
        endereco_uf = nullif(upper(btrim(p_colaborador ->> 'endereco_uf')), ''),
        endereco_cep = nullif(regexp_replace(coalesce(p_colaborador ->> 'endereco_cep', ''), '[^0-9]', '', 'g'), ''),
        status = coalesce(nullif(lower(btrim(p_colaborador ->> 'status')), ''), 'ativo'),
        observacoes = nullif(btrim(p_colaborador ->> 'observacoes'), '')
    where id = p_colaborador_id
    returning id into v_colaborador_id;

    if v_colaborador_id is null then
      raise exception 'RH_COLLABORATOR_NOT_FOUND';
    end if;
  end if;

  if p_documentos is not null then
    if not public.app_tem_permissao('rh_dp.colaboradores', 'view_sensitive') then
      raise exception 'RH_SENSITIVE_DATA_DENIED';
    end if;

    insert into public.rh_documentos_cadastrais (
      colaborador_id,
      cpf,
      identidade_tipo,
      identidade_numero,
      identidade_data_emissao,
      identidade_orgao_emissor,
      identidade_uf_emissor,
      cnh_categoria,
      titulo_eleitor,
      zona_eleitoral,
      secao_eleitoral,
      ctps_numero,
      ctps_serie,
      ctps_data_expedicao,
      ctps_uf,
      reservista_numero,
      reservista_categoria,
      pis_numero,
      pis_data_cadastro
    )
    values (
      v_colaborador_id,
      regexp_replace(coalesce(p_documentos ->> 'cpf', ''), '[^0-9]', '', 'g'),
      nullif(lower(btrim(p_documentos ->> 'identidade_tipo')), ''),
      nullif(btrim(p_documentos ->> 'identidade_numero'), ''),
      nullif(p_documentos ->> 'identidade_data_emissao', '')::date,
      nullif(btrim(p_documentos ->> 'identidade_orgao_emissor'), ''),
      nullif(upper(btrim(p_documentos ->> 'identidade_uf_emissor')), ''),
      nullif(upper(btrim(p_documentos ->> 'cnh_categoria')), ''),
      nullif(regexp_replace(coalesce(p_documentos ->> 'titulo_eleitor', ''), '[^0-9]', '', 'g'), ''),
      nullif(btrim(p_documentos ->> 'zona_eleitoral'), ''),
      nullif(btrim(p_documentos ->> 'secao_eleitoral'), ''),
      nullif(btrim(p_documentos ->> 'ctps_numero'), ''),
      nullif(btrim(p_documentos ->> 'ctps_serie'), ''),
      nullif(p_documentos ->> 'ctps_data_expedicao', '')::date,
      nullif(upper(btrim(p_documentos ->> 'ctps_uf')), ''),
      nullif(btrim(p_documentos ->> 'reservista_numero'), ''),
      nullif(btrim(p_documentos ->> 'reservista_categoria'), ''),
      nullif(regexp_replace(coalesce(p_documentos ->> 'pis_numero', ''), '[^0-9]', '', 'g'), ''),
      nullif(p_documentos ->> 'pis_data_cadastro', '')::date
    )
    on conflict (colaborador_id) do update
    set cpf = excluded.cpf,
        identidade_tipo = excluded.identidade_tipo,
        identidade_numero = excluded.identidade_numero,
        identidade_data_emissao = excluded.identidade_data_emissao,
        identidade_orgao_emissor = excluded.identidade_orgao_emissor,
        identidade_uf_emissor = excluded.identidade_uf_emissor,
        cnh_categoria = excluded.cnh_categoria,
        titulo_eleitor = excluded.titulo_eleitor,
        zona_eleitoral = excluded.zona_eleitoral,
        secao_eleitoral = excluded.secao_eleitoral,
        ctps_numero = excluded.ctps_numero,
        ctps_serie = excluded.ctps_serie,
        ctps_data_expedicao = excluded.ctps_data_expedicao,
        ctps_uf = excluded.ctps_uf,
        reservista_numero = excluded.reservista_numero,
        reservista_categoria = excluded.reservista_categoria,
        pis_numero = excluded.pis_numero,
        pis_data_cadastro = excluded.pis_data_cadastro;
  end if;

  if p_dependentes is not null then
    if not public.app_tem_permissao('rh_dp.colaboradores', 'view_sensitive') then
      raise exception 'RH_SENSITIVE_DATA_DENIED';
    end if;

    select coalesce(array_agg((item ->> 'id')::uuid), array[]::uuid[])
    into v_dependentes_ids
    from jsonb_array_elements(p_dependentes) item
    where nullif(item ->> 'id', '') is not null;

    update public.rh_dependentes
    set ativo = false
    where colaborador_id = v_colaborador_id
      and ativo
      and not (id = any(v_dependentes_ids));

    for v_dependente in
      select value
      from jsonb_array_elements(p_dependentes)
    loop
      v_dependente_id := nullif(v_dependente ->> 'id', '')::uuid;

      if v_dependente_id is null then
        insert into public.rh_dependentes (
          colaborador_id,
          nome_completo,
          data_nascimento,
          parentesco
        )
        values (
          v_colaborador_id,
          nullif(btrim(v_dependente ->> 'nome_completo'), ''),
          nullif(v_dependente ->> 'data_nascimento', '')::date,
          nullif(btrim(v_dependente ->> 'parentesco'), '')
        );
      else
        update public.rh_dependentes
        set nome_completo = nullif(btrim(v_dependente ->> 'nome_completo'), ''),
            data_nascimento = nullif(v_dependente ->> 'data_nascimento', '')::date,
            parentesco = nullif(btrim(v_dependente ->> 'parentesco'), ''),
            ativo = true
        where id = v_dependente_id
          and colaborador_id = v_colaborador_id;

        if not found then
          raise exception 'RH_DEPENDENT_NOT_FOUND';
        end if;
      end if;
    end loop;
  end if;

  return v_colaborador_id;
end;
$$;

revoke all on function public.rh_salvar_cadastro_pessoal(uuid, jsonb, jsonb, jsonb) from public;
revoke all on function public.rh_salvar_cadastro_pessoal(uuid, jsonb, jsonb, jsonb) from anon;
grant execute on function public.rh_salvar_cadastro_pessoal(uuid, jsonb, jsonb, jsonb) to authenticated;
