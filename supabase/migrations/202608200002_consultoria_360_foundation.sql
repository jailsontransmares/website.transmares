begin;

-- A Consultoria 360° reutiliza cad_pessoas como cadastro central. Não cria cliente paralelo.
create table if not exists public.consultoria_360_atendimentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.fin_empresas(id) on delete restrict,
  pessoa_id uuid not null,
  status text not null default 'rascunho',
  responsavel_usuario_id uuid references public.usuarios(id) on delete set null,
  prioridade_final text,
  scores jsonb not null default '{}'::jsonb,
  consorcio_fit numeric(5,2),
  cliente_snapshot jsonb not null default '{}'::jsonb,
  contexto jsonb not null default '{}'::jsonb,
  iniciado_em timestamptz not null default now(),
  concluido_em timestamptz,
  proxima_revisao date,
  observacoes text,
  created_by uuid not null default public.app_usuario_atual_id() references public.usuarios(id) on delete restrict,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consultoria_360_atendimentos_pessoa_empresa_fkey
    foreign key (pessoa_id, empresa_id) references public.cad_pessoas(id, empresa_id) on delete restrict,
  constraint consultoria_360_atendimentos_status_check
    check (status in ('rascunho', 'em_andamento', 'concluido', 'arquivado')),
  constraint consultoria_360_atendimentos_prioridade_check
    check (prioridade_final is null or prioridade_final in ('protecao', 'saude', 'patrimonio'))
);

create index if not exists consultoria_360_atendimentos_empresa_status_idx
  on public.consultoria_360_atendimentos (empresa_id, status, updated_at desc);
create index if not exists consultoria_360_atendimentos_pessoa_idx
  on public.consultoria_360_atendimentos (empresa_id, pessoa_id, updated_at desc);

create table if not exists public.consultoria_360_respostas (
  id uuid primary key default gen_random_uuid(),
  atendimento_id uuid not null unique references public.consultoria_360_atendimentos(id) on delete cascade,
  versao_questionario text not null default 'diagnostico-360-v1',
  respostas jsonb not null default '{}'::jsonb,
  created_by uuid not null default public.app_usuario_atual_id() references public.usuarios(id) on delete restrict,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consultoria_360_dimensionamentos (
  id uuid primary key default gen_random_uuid(),
  atendimento_id uuid not null references public.consultoria_360_atendimentos(id) on delete cascade,
  tipo text not null,
  premissas jsonb not null default '{}'::jsonb,
  resultado jsonb not null default '{}'::jsonb,
  versao_regra text not null,
  created_by uuid not null default public.app_usuario_atual_id() references public.usuarios(id) on delete restrict,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consultoria_360_dimensionamentos_tipo_check check (tipo in ('protecao', 'saude', 'consorcio')),
  constraint consultoria_360_dimensionamentos_atendimento_tipo_key unique (atendimento_id, tipo)
);

create table if not exists public.consultoria_360_propostas (
  id uuid primary key default gen_random_uuid(),
  atendimento_id uuid not null references public.consultoria_360_atendimentos(id) on delete cascade,
  versao integer not null,
  status text not null default 'rascunho',
  titulo text,
  data_analise date not null default current_date,
  escopo jsonb not null default '{}'::jsonb,
  recomendacao text,
  proximos_passos text,
  observacoes text,
  snapshot jsonb not null default '{}'::jsonb,
  arquivo_url text,
  created_by uuid not null default public.app_usuario_atual_id() references public.usuarios(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint consultoria_360_propostas_status_check check (status in ('rascunho', 'validada', 'arquivada')),
  constraint consultoria_360_propostas_atendimento_versao_key unique (atendimento_id, versao)
);

create index if not exists consultoria_360_propostas_atendimento_data_idx
  on public.consultoria_360_propostas (atendimento_id, data_analise desc, versao desc);

-- Consultoria pode localizar somente o nome/tipo das pessoas da empresa já autorizada.
drop policy if exists cad_pessoas_select_consultoria_360 on public.cad_pessoas;
create policy cad_pessoas_select_consultoria_360 on public.cad_pessoas
  for select to authenticated
  using (
    public.app_tem_permissao('consultoria_360', 'view')
    and empresa_id in (
      select acesso.empresa_id
      from public.fin_usuario_empresas acesso
      where acesso.usuario_id = public.app_usuario_atual_id()
        and acesso.status = 'ativo'
    )
  );

drop policy if exists fin_usuario_empresas_select_consultoria_360 on public.fin_usuario_empresas;
create policy fin_usuario_empresas_select_consultoria_360 on public.fin_usuario_empresas
  for select to authenticated
  using (
    usuario_id = public.app_usuario_atual_id()
    and status = 'ativo'
    and public.app_tem_permissao('consultoria_360', 'view')
  );

drop policy if exists fin_empresas_select_consultoria_360 on public.fin_empresas;
create policy fin_empresas_select_consultoria_360 on public.fin_empresas
  for select to authenticated
  using (
    status = 'ativo'
    and public.app_tem_permissao('consultoria_360', 'view')
    and id in (
      select acesso.empresa_id
      from public.fin_usuario_empresas acesso
      where acesso.usuario_id = public.app_usuario_atual_id()
        and acesso.status = 'ativo'
    )
  );

do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'consultoria_360_atendimentos',
    'consultoria_360_respostas',
    'consultoria_360_dimensionamentos',
    'consultoria_360_propostas'
  ]
  loop
    execute format('alter table public.%I enable row level security', v_tabela);
    execute format('revoke all on table public.%I from anon', v_tabela);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', v_tabela);
  end loop;
end;
$$;

drop policy if exists consultoria_360_atendimentos_select on public.consultoria_360_atendimentos;
create policy consultoria_360_atendimentos_select on public.consultoria_360_atendimentos
  for select to authenticated
  using (
    public.app_tem_permissao('consultoria_360', 'view')
    and empresa_id in (select acesso.empresa_id from public.fin_usuario_empresas acesso where acesso.usuario_id = public.app_usuario_atual_id() and acesso.status = 'ativo')
  );

drop policy if exists consultoria_360_atendimentos_insert on public.consultoria_360_atendimentos;
create policy consultoria_360_atendimentos_insert on public.consultoria_360_atendimentos
  for insert to authenticated
  with check (
    public.app_tem_permissao('consultoria_360', 'create')
    and created_by = public.app_usuario_atual_id()
    and empresa_id in (select acesso.empresa_id from public.fin_usuario_empresas acesso where acesso.usuario_id = public.app_usuario_atual_id() and acesso.status = 'ativo')
  );

drop policy if exists consultoria_360_atendimentos_update on public.consultoria_360_atendimentos;
create policy consultoria_360_atendimentos_update on public.consultoria_360_atendimentos
  for update to authenticated
  using (
    public.app_tem_permissao('consultoria_360', 'update')
    and empresa_id in (select acesso.empresa_id from public.fin_usuario_empresas acesso where acesso.usuario_id = public.app_usuario_atual_id() and acesso.status = 'ativo')
  )
  with check (
    public.app_tem_permissao('consultoria_360', 'update')
    and empresa_id in (select acesso.empresa_id from public.fin_usuario_empresas acesso where acesso.usuario_id = public.app_usuario_atual_id() and acesso.status = 'ativo')
  );

drop policy if exists consultoria_360_atendimentos_delete on public.consultoria_360_atendimentos;
create policy consultoria_360_atendimentos_delete on public.consultoria_360_atendimentos
  for delete to authenticated
  using (
    public.app_tem_permissao('consultoria_360', 'delete')
    and empresa_id in (select acesso.empresa_id from public.fin_usuario_empresas acesso where acesso.usuario_id = public.app_usuario_atual_id() and acesso.status = 'ativo')
  );

drop policy if exists consultoria_360_respostas_select on public.consultoria_360_respostas;
create policy consultoria_360_respostas_select on public.consultoria_360_respostas
  for select to authenticated using (
    public.app_tem_permissao('consultoria_360', 'view')
    and exists (select 1 from public.consultoria_360_atendimentos atendimento where atendimento.id = atendimento_id)
  );
drop policy if exists consultoria_360_respostas_write on public.consultoria_360_respostas;
create policy consultoria_360_respostas_write on public.consultoria_360_respostas
  for all to authenticated using (
    (public.app_tem_permissao('consultoria_360', 'create') or public.app_tem_permissao('consultoria_360', 'update'))
    and exists (select 1 from public.consultoria_360_atendimentos atendimento where atendimento.id = atendimento_id)
  ) with check (
    (public.app_tem_permissao('consultoria_360', 'create') or public.app_tem_permissao('consultoria_360', 'update'))
    and exists (select 1 from public.consultoria_360_atendimentos atendimento where atendimento.id = atendimento_id)
  );

drop policy if exists consultoria_360_dimensionamentos_select on public.consultoria_360_dimensionamentos;
create policy consultoria_360_dimensionamentos_select on public.consultoria_360_dimensionamentos
  for select to authenticated using (
    public.app_tem_permissao('consultoria_360', 'view')
    and exists (select 1 from public.consultoria_360_atendimentos atendimento where atendimento.id = atendimento_id)
  );
drop policy if exists consultoria_360_dimensionamentos_write on public.consultoria_360_dimensionamentos;
create policy consultoria_360_dimensionamentos_write on public.consultoria_360_dimensionamentos
  for all to authenticated using (
    (public.app_tem_permissao('consultoria_360', 'create') or public.app_tem_permissao('consultoria_360', 'update'))
    and exists (select 1 from public.consultoria_360_atendimentos atendimento where atendimento.id = atendimento_id)
  ) with check (
    (public.app_tem_permissao('consultoria_360', 'create') or public.app_tem_permissao('consultoria_360', 'update'))
    and exists (select 1 from public.consultoria_360_atendimentos atendimento where atendimento.id = atendimento_id)
  );

drop policy if exists consultoria_360_propostas_select on public.consultoria_360_propostas;
create policy consultoria_360_propostas_select on public.consultoria_360_propostas
  for select to authenticated using (
    public.app_tem_permissao('consultoria_360', 'view')
    and exists (select 1 from public.consultoria_360_atendimentos atendimento where atendimento.id = atendimento_id)
  );
drop policy if exists consultoria_360_propostas_insert on public.consultoria_360_propostas;
create policy consultoria_360_propostas_insert on public.consultoria_360_propostas
  for insert to authenticated with check (
    (public.app_tem_permissao('consultoria_360', 'create') or public.app_tem_permissao('consultoria_360', 'update'))
    and created_by = public.app_usuario_atual_id()
    and exists (select 1 from public.consultoria_360_atendimentos atendimento where atendimento.id = atendimento_id)
  );
drop policy if exists consultoria_360_propostas_update on public.consultoria_360_propostas;
create policy consultoria_360_propostas_update on public.consultoria_360_propostas
  for update to authenticated using (
    public.app_tem_permissao('consultoria_360', 'update')
    and exists (select 1 from public.consultoria_360_atendimentos atendimento where atendimento.id = atendimento_id)
  ) with check (
    public.app_tem_permissao('consultoria_360', 'update')
    and exists (select 1 from public.consultoria_360_atendimentos atendimento where atendimento.id = atendimento_id)
  );
drop policy if exists consultoria_360_propostas_delete on public.consultoria_360_propostas;
create policy consultoria_360_propostas_delete on public.consultoria_360_propostas
  for delete to authenticated using (
    public.app_tem_permissao('consultoria_360', 'delete')
    and exists (select 1 from public.consultoria_360_atendimentos atendimento where atendimento.id = atendimento_id)
  );

with recurso as (
  select chave from public.recursos_acesso where chave = 'consultoria_360'
), perfil_admin as (
  select id from public.perfis where slug = 'admin'
)
insert into public.perfil_permissoes (perfil_id, recurso_chave, acao, permitido)
select perfil.id, recurso.chave, 'delete', true
from perfil_admin perfil cross join recurso
on conflict (perfil_id, recurso_chave, acao) do update
set permitido = true, updated_at = now();

commit;
