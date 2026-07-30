create table if not exists public.rh_arquivos_colaboradores (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null
    references public.rh_colaboradores(id) on delete restrict,
  categoria text not null,
  tipo_documento text,
  nome_arquivo text not null,
  descricao text,
  origem text not null default 'google_drive',
  google_drive_file_id text,
  google_drive_web_url text,
  google_drive_preview_url text,
  google_drive_folder_id text,
  mime_type text,
  tamanho_bytes bigint,
  data_referencia date,
  data_validade date,
  retencao_ate date,
  status text not null default 'ativo',
  observacoes text,
  excluido_by uuid references public.usuarios(id) on delete set null,
  excluido_at timestamptz,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rh_arquivos_categoria_check
    check (categoria in (
      'admissao',
      'documento_pessoal',
      'contrato',
      'beneficios',
      'ferias',
      'afastamento',
      'saude_ocupacional',
      'ocorrencia',
      'desligamento',
      'outros'
    )),
  constraint rh_arquivos_origem_check
    check (origem in ('google_drive', 'manual')),
  constraint rh_arquivos_status_check
    check (status in ('ativo', 'arquivado', 'excluido')),
  constraint rh_arquivos_link_check
    check (
      status = 'excluido'
      or google_drive_file_id is not null
      or google_drive_web_url is not null
    ),
  constraint rh_arquivos_url_check
    check (
      (google_drive_web_url is null or google_drive_web_url ~* '^https?://')
      and (google_drive_preview_url is null or google_drive_preview_url ~* '^https?://')
    ),
  constraint rh_arquivos_tamanho_check
    check (tamanho_bytes is null or tamanho_bytes >= 0),
  constraint rh_arquivos_validade_check
    check (data_validade is null or data_referencia is null or data_validade >= data_referencia)
);

create index if not exists rh_arquivos_colaborador_status_idx
  on public.rh_arquivos_colaboradores (colaborador_id, status, created_at desc);

create index if not exists rh_arquivos_categoria_idx
  on public.rh_arquivos_colaboradores (categoria);

create index if not exists rh_arquivos_validade_idx
  on public.rh_arquivos_colaboradores (data_validade)
  where data_validade is not null and status <> 'excluido';

create index if not exists rh_arquivos_created_by_idx
  on public.rh_arquivos_colaboradores (created_by);

create index if not exists rh_arquivos_updated_by_idx
  on public.rh_arquivos_colaboradores (updated_by);

create index if not exists rh_arquivos_excluido_by_idx
  on public.rh_arquivos_colaboradores (excluido_by);

create or replace function private.rh_preparar_arquivo_colaborador()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_retencao_anos smallint;
begin
  select coalesce(retencao_documentos_anos, 10)
  into v_retencao_anos
  from public.rh_configuracoes
  where id = 1;

  if tg_op = 'INSERT' then
    new.created_by := public.app_usuario_atual_id();
    new.updated_by := public.app_usuario_atual_id();
    new.created_at := now();
  else
    new.updated_by := public.app_usuario_atual_id();
  end if;

  new.updated_at := now();

  if new.retencao_ate is null then
    new.retencao_ate := (coalesce(new.data_referencia, current_date) + make_interval(years => coalesce(v_retencao_anos, 10)))::date;
  end if;

  if new.status = 'excluido' and (tg_op = 'INSERT' or old.status is distinct from 'excluido') then
    new.excluido_by := public.app_usuario_atual_id();
    new.excluido_at := now();
  elsif new.status <> 'excluido' then
    new.excluido_by := null;
    new.excluido_at := null;
  end if;

  return new;
end;
$$;

revoke all on function private.rh_preparar_arquivo_colaborador() from public;
revoke all on function private.rh_preparar_arquivo_colaborador() from anon;
revoke all on function private.rh_preparar_arquivo_colaborador() from authenticated;

drop trigger if exists rh_arquivos_prepare_insert on public.rh_arquivos_colaboradores;
create trigger rh_arquivos_prepare_insert
before insert on public.rh_arquivos_colaboradores
for each row
execute function private.rh_preparar_arquivo_colaborador();

drop trigger if exists rh_arquivos_prepare_update on public.rh_arquivos_colaboradores;
create trigger rh_arquivos_prepare_update
before update on public.rh_arquivos_colaboradores
for each row
execute function private.rh_preparar_arquivo_colaborador();

drop trigger if exists rh_arquivos_audit on public.rh_arquivos_colaboradores;
create trigger rh_arquivos_audit
after insert or update or delete on public.rh_arquivos_colaboradores
for each row
execute function private.rh_auditar_linha();

alter table public.rh_arquivos_colaboradores enable row level security;

revoke all on table public.rh_arquivos_colaboradores from anon;
revoke all on table public.rh_arquivos_colaboradores from authenticated;

grant select, insert, update on table public.rh_arquivos_colaboradores to authenticated;

drop policy if exists rh_arquivos_select_permission on public.rh_arquivos_colaboradores;
create policy rh_arquivos_select_permission
on public.rh_arquivos_colaboradores
for select
to authenticated
using (
  (select public.app_tem_permissao('rh_dp.colaboradores', 'view'))
  and (select public.app_tem_permissao('rh_dp.documentos', 'view'))
);

drop policy if exists rh_arquivos_insert_permission on public.rh_arquivos_colaboradores;
create policy rh_arquivos_insert_permission
on public.rh_arquivos_colaboradores
for insert
to authenticated
with check (
  status <> 'excluido'
  and (select public.app_tem_permissao('rh_dp.colaboradores', 'view'))
  and (select public.app_tem_permissao('rh_dp.documentos', 'create'))
);

drop policy if exists rh_arquivos_update_permission on public.rh_arquivos_colaboradores;
create policy rh_arquivos_update_permission
on public.rh_arquivos_colaboradores
for update
to authenticated
using (
  status <> 'excluido'
  and (select public.app_tem_permissao('rh_dp.colaboradores', 'view'))
  and (
    (select public.app_tem_permissao('rh_dp.documentos', 'update'))
    or (select public.app_tem_permissao('rh_dp.documentos', 'delete'))
  )
)
with check (
  (select public.app_tem_permissao('rh_dp.colaboradores', 'view'))
  and (
    (
      status <> 'excluido'
      and (select public.app_tem_permissao('rh_dp.documentos', 'update'))
    )
    or (
      status = 'excluido'
      and (select public.app_tem_permissao('rh_dp.documentos', 'delete'))
    )
  )
);
