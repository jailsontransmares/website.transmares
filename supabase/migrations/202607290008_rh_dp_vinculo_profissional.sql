create table if not exists public.rh_vinculos_profissionais (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null unique
    references public.rh_colaboradores(id) on delete restrict,
  tipo_vinculo text,
  data_admissao date,
  data_desligamento date,
  cargo text,
  funcao text,
  cbo text,
  departamento text,
  gestor_responsavel text,
  situacao text not null default 'ativo',
  tipo_remuneracao text,
  remuneracao_valor numeric(12, 2),
  modelo_jornada text,
  carga_horaria_semanal numeric(5, 2),
  horario_entrada time,
  horario_saida time,
  intervalo_inicio time,
  intervalo_fim time,
  dias_trabalho text,
  observacoes text,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rh_vinculos_tipo_check
    check (tipo_vinculo is null or tipo_vinculo in ('clt', 'estagio', 'socio', 'prestador', 'temporario', 'outro')),
  constraint rh_vinculos_situacao_check
    check (situacao in ('ativo', 'experiencia', 'afastado', 'desligado')),
  constraint rh_vinculos_tipo_remuneracao_check
    check (tipo_remuneracao is null or tipo_remuneracao in ('salario', 'bolsa', 'pro_labore', 'honorario', 'outro')),
  constraint rh_vinculos_modelo_jornada_check
    check (modelo_jornada is null or modelo_jornada in ('integral', 'parcial', 'escala', 'flexivel', 'remoto', 'hibrido', 'outro')),
  constraint rh_vinculos_datas_check
    check (data_desligamento is null or data_admissao is null or data_desligamento >= data_admissao),
  constraint rh_vinculos_remuneracao_check
    check (remuneracao_valor is null or remuneracao_valor >= 0),
  constraint rh_vinculos_carga_horaria_check
    check (carga_horaria_semanal is null or carga_horaria_semanal between 0 and 80),
  constraint rh_vinculos_cbo_check
    check (cbo is null or cbo ~ '^[0-9]{4}-?[0-9]{2}$')
);

create index if not exists rh_vinculos_colaborador_idx
  on public.rh_vinculos_profissionais (colaborador_id);

create index if not exists rh_vinculos_situacao_admissao_idx
  on public.rh_vinculos_profissionais (situacao, data_admissao desc);

create index if not exists rh_vinculos_cargo_idx
  on public.rh_vinculos_profissionais (cargo);

create index if not exists rh_vinculos_created_by_idx
  on public.rh_vinculos_profissionais (created_by);

create index if not exists rh_vinculos_updated_by_idx
  on public.rh_vinculos_profissionais (updated_by);

drop trigger if exists rh_vinculos_prepare_insert on public.rh_vinculos_profissionais;
create trigger rh_vinculos_prepare_insert
before insert on public.rh_vinculos_profissionais
for each row
execute function private.rh_preparar_inclusao();

drop trigger if exists rh_vinculos_prepare_update on public.rh_vinculos_profissionais;
create trigger rh_vinculos_prepare_update
before update on public.rh_vinculos_profissionais
for each row
execute function private.rh_preparar_atualizacao();

drop trigger if exists rh_vinculos_audit on public.rh_vinculos_profissionais;
create trigger rh_vinculos_audit
after insert or update or delete on public.rh_vinculos_profissionais
for each row
execute function private.rh_auditar_linha();

alter table public.rh_vinculos_profissionais enable row level security;

revoke all on table public.rh_vinculos_profissionais from anon;
revoke all on table public.rh_vinculos_profissionais from authenticated;

grant select, insert, update on table public.rh_vinculos_profissionais to authenticated;

drop policy if exists rh_vinculos_select_permission on public.rh_vinculos_profissionais;
create policy rh_vinculos_select_permission
on public.rh_vinculos_profissionais
for select
to authenticated
using (
  (select public.app_tem_permissao('rh_dp.colaboradores', 'view'))
  and (select public.app_tem_permissao('rh_dp.colaboradores', 'view_sensitive'))
);

drop policy if exists rh_vinculos_insert_permission on public.rh_vinculos_profissionais;
create policy rh_vinculos_insert_permission
on public.rh_vinculos_profissionais
for insert
to authenticated
with check (
  (
    (select public.app_tem_permissao('rh_dp.colaboradores', 'create'))
    or (select public.app_tem_permissao('rh_dp.colaboradores', 'update'))
  )
  and (select public.app_tem_permissao('rh_dp.colaboradores', 'view_sensitive'))
);

drop policy if exists rh_vinculos_update_permission on public.rh_vinculos_profissionais;
create policy rh_vinculos_update_permission
on public.rh_vinculos_profissionais
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
  p_vinculo jsonb default null,
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

  if p_vinculo is not null then
    if not public.app_tem_permissao('rh_dp.colaboradores', 'view_sensitive') then
      raise exception 'RH_SENSITIVE_DATA_DENIED';
    end if;

    insert into public.rh_vinculos_profissionais (
      colaborador_id,
      tipo_vinculo,
      data_admissao,
      data_desligamento,
      cargo,
      funcao,
      cbo,
      departamento,
      gestor_responsavel,
      situacao,
      tipo_remuneracao,
      remuneracao_valor,
      modelo_jornada,
      carga_horaria_semanal,
      horario_entrada,
      horario_saida,
      intervalo_inicio,
      intervalo_fim,
      dias_trabalho,
      observacoes
    )
    values (
      v_colaborador_id,
      nullif(lower(btrim(p_vinculo ->> 'tipo_vinculo')), ''),
      nullif(p_vinculo ->> 'data_admissao', '')::date,
      nullif(p_vinculo ->> 'data_desligamento', '')::date,
      nullif(btrim(p_vinculo ->> 'cargo'), ''),
      nullif(btrim(p_vinculo ->> 'funcao'), ''),
      nullif(btrim(p_vinculo ->> 'cbo'), ''),
      nullif(btrim(p_vinculo ->> 'departamento'), ''),
      nullif(btrim(p_vinculo ->> 'gestor_responsavel'), ''),
      coalesce(nullif(lower(btrim(p_vinculo ->> 'situacao')), ''), 'ativo'),
      nullif(lower(btrim(p_vinculo ->> 'tipo_remuneracao')), ''),
      nullif(p_vinculo ->> 'remuneracao_valor', '')::numeric,
      nullif(lower(btrim(p_vinculo ->> 'modelo_jornada')), ''),
      nullif(p_vinculo ->> 'carga_horaria_semanal', '')::numeric,
      nullif(p_vinculo ->> 'horario_entrada', '')::time,
      nullif(p_vinculo ->> 'horario_saida', '')::time,
      nullif(p_vinculo ->> 'intervalo_inicio', '')::time,
      nullif(p_vinculo ->> 'intervalo_fim', '')::time,
      nullif(btrim(p_vinculo ->> 'dias_trabalho'), ''),
      nullif(btrim(p_vinculo ->> 'observacoes'), '')
    )
    on conflict (colaborador_id) do update
    set tipo_vinculo = excluded.tipo_vinculo,
        data_admissao = excluded.data_admissao,
        data_desligamento = excluded.data_desligamento,
        cargo = excluded.cargo,
        funcao = excluded.funcao,
        cbo = excluded.cbo,
        departamento = excluded.departamento,
        gestor_responsavel = excluded.gestor_responsavel,
        situacao = excluded.situacao,
        tipo_remuneracao = excluded.tipo_remuneracao,
        remuneracao_valor = excluded.remuneracao_valor,
        modelo_jornada = excluded.modelo_jornada,
        carga_horaria_semanal = excluded.carga_horaria_semanal,
        horario_entrada = excluded.horario_entrada,
        horario_saida = excluded.horario_saida,
        intervalo_inicio = excluded.intervalo_inicio,
        intervalo_fim = excluded.intervalo_fim,
        dias_trabalho = excluded.dias_trabalho,
        observacoes = excluded.observacoes;
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

revoke all on function public.rh_salvar_cadastro_pessoal(uuid, jsonb, jsonb, jsonb, jsonb) from public;
revoke all on function public.rh_salvar_cadastro_pessoal(uuid, jsonb, jsonb, jsonb, jsonb) from anon;
grant execute on function public.rh_salvar_cadastro_pessoal(uuid, jsonb, jsonb, jsonb, jsonb) to authenticated;
