-- Fase 5: gestão contratual interna. Não substitui registros oficiais da contabilidade.

create table if not exists public.rh_beneficios_colaboradores (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.rh_colaboradores(id) on delete restrict,
  tipo text not null,
  nome text not null,
  operadora_fornecedor text,
  valor_empresa numeric(12,2),
  valor_colaborador numeric(12,2),
  inicio_em date,
  fim_em date,
  status text not null default 'ativo',
  observacoes text,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rh_beneficios_tipo_check check (tipo in ('vale_transporte','vale_refeicao','vale_alimentacao','plano_saude','seguro_vida','auxilio','outro')),
  constraint rh_beneficios_status_check check (status in ('ativo','suspenso','encerrado')),
  constraint rh_beneficios_valores_check check (coalesce(valor_empresa, 0) >= 0 and coalesce(valor_colaborador, 0) >= 0),
  constraint rh_beneficios_datas_check check (fim_em is null or inicio_em is null or fim_em >= inicio_em)
);

create table if not exists public.rh_dados_bancarios_colaboradores (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null unique references public.rh_colaboradores(id) on delete restrict,
  banco_codigo text,
  banco_nome text,
  tipo_conta text,
  agencia text,
  conta text,
  conta_digito text,
  operacao text,
  pix_tipo text,
  pix_chave text,
  titular_nome text,
  titular_cpf text,
  status text not null default 'ativo',
  observacoes text,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rh_dados_bancarios_tipo_conta_check check (tipo_conta is null or tipo_conta in ('corrente','poupanca','pagamento','outro')),
  constraint rh_dados_bancarios_pix_tipo_check check (pix_tipo is null or pix_tipo in ('cpf','email','telefone','aleatoria')),
  constraint rh_dados_bancarios_status_check check (status in ('ativo','inativo')),
  constraint rh_dados_bancarios_cpf_check check (titular_cpf is null or titular_cpf ~ '^[0-9]{11}$')
);

create table if not exists public.rh_movimentacoes_colaboradores (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.rh_colaboradores(id) on delete restrict,
  tipo text not null,
  data_efetivacao date not null,
  titulo text not null,
  descricao text,
  dados_anteriores jsonb,
  dados_novos jsonb,
  referencia_externa text,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rh_movimentacoes_tipo_check check (tipo in ('admissao','cargo_funcao','remuneracao','jornada','beneficio','dados_bancarios','situacao','outro'))
);

create table if not exists public.rh_checklist_admissional (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.rh_colaboradores(id) on delete restrict,
  item_chave text not null,
  status text not null default 'pendente',
  concluido_em date,
  observacoes text,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (colaborador_id, item_chave),
  constraint rh_checklist_item_check check (item_chave in ('dados_pessoais','documentos','vinculo','beneficios','dados_bancarios','anexos','conferencia_contabilidade')),
  constraint rh_checklist_status_check check (status in ('pendente','concluido','nao_aplicavel')),
  constraint rh_checklist_conclusao_check check ((status = 'concluido' and concluido_em is not null) or status <> 'concluido')
);

create index if not exists rh_beneficios_colaborador_status_idx on public.rh_beneficios_colaboradores (colaborador_id, status);
create index if not exists rh_movimentacoes_colaborador_data_idx on public.rh_movimentacoes_colaboradores (colaborador_id, data_efetivacao desc, created_at desc);
create index if not exists rh_checklist_colaborador_idx on public.rh_checklist_admissional (colaborador_id, item_chave);

do $$
declare
  tabela text;
begin
  foreach tabela in array array['rh_beneficios_colaboradores','rh_dados_bancarios_colaboradores','rh_movimentacoes_colaboradores','rh_checklist_admissional'] loop
    execute format('alter table public.%I enable row level security', tabela);
    execute format('revoke all on table public.%I from anon, authenticated', tabela);
    execute format('grant select, insert, update on table public.%I to authenticated', tabela);
    execute format('drop policy if exists rh_fase5_select_permission on public.%I', tabela);
    execute format('drop policy if exists rh_fase5_insert_permission on public.%I', tabela);
    execute format('drop policy if exists rh_fase5_update_permission on public.%I', tabela);
    execute format($sql$create policy rh_fase5_select_permission on public.%I for select to authenticated using ((select public.app_tem_permissao('rh_dp.colaboradores', 'view')) and (select public.app_tem_permissao('rh_dp.colaboradores', 'view_sensitive')))$sql$, tabela);
    execute format($sql$create policy rh_fase5_insert_permission on public.%I for insert to authenticated with check ((select public.app_tem_permissao('rh_dp.colaboradores', 'update')) and (select public.app_tem_permissao('rh_dp.colaboradores', 'view_sensitive')))$sql$, tabela);
    execute format($sql$create policy rh_fase5_update_permission on public.%I for update to authenticated using ((select public.app_tem_permissao('rh_dp.colaboradores', 'update')) and (select public.app_tem_permissao('rh_dp.colaboradores', 'view_sensitive'))) with check ((select public.app_tem_permissao('rh_dp.colaboradores', 'update')) and (select public.app_tem_permissao('rh_dp.colaboradores', 'view_sensitive')))$sql$, tabela);
    execute format('drop trigger if exists rh_fase5_prepare_insert on public.%I', tabela);
    execute format('create trigger rh_fase5_prepare_insert before insert on public.%I for each row execute function private.rh_preparar_inclusao()', tabela);
    execute format('drop trigger if exists rh_fase5_prepare_update on public.%I', tabela);
    execute format('create trigger rh_fase5_prepare_update before update on public.%I for each row execute function private.rh_preparar_atualizacao()', tabela);
    execute format('drop trigger if exists rh_fase5_audit on public.%I', tabela);
    execute format('create trigger rh_fase5_audit after insert or update or delete on public.%I for each row execute function private.rh_auditar_linha()', tabela);
  end loop;
end;
$$;
;
