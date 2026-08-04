-- Financeiro / Fase 9: homologacao, ativacao e reversao.

insert into public.recursos_acesso (chave, nome, tipo, recurso_pai, rota, ordem, status)
values
  ('financeiro.homologacao', 'Homologacao', 'funcao', 'financeiro.configuracoes', '/financeiro/configuracoes', 68, 'ativo'),
  ('financeiro.reversao', 'Plano de reversao', 'funcao', 'financeiro.configuracoes', '/financeiro/configuracoes', 69, 'ativo')
on conflict (chave) do update
set nome = excluded.nome,
    tipo = excluded.tipo,
    recurso_pai = excluded.recurso_pai,
    rota = excluded.rota,
    ordem = excluded.ordem,
    status = excluded.status,
    updated_at = now();

insert into public.fin_parametros (
  empresa_id,
  chave,
  valor,
  descricao,
  sensivel,
  status
)
values (
  null,
  'modulo_ativo',
  'true'::jsonb,
  'Chave global de ativacao controlada do Financeiro.',
  false,
  'ativo'
)
on conflict (empresa_id, chave) do update
set valor = excluded.valor,
    status = 'ativo',
    updated_at = now(),
    updated_by = public.app_usuario_atual_id();

update public.itens
set status = 'ativo',
    dados = coalesce(dados, '{}'::jsonb) || jsonb_build_object(
      'slug', 'financeiro',
      'tipo', 'modulo',
      'ordem', 50,
      'bloqueavel', true,
      'exibir_home', true,
      'fase', 9
    ),
    updated_at = now()
where dados ->> 'slug' = 'financeiro'
  and dados ->> 'tipo' = 'modulo';

create table if not exists public.fin_homologacao_ciclos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.fin_empresas(id) on delete restrict,
  nome text not null,
  escopo_congelado jsonb not null default '{}'::jsonb,
  plano_reversao jsonb not null default '{}'::jsonb,
  status text not null default 'preparacao',
  iniciado_em timestamptz not null default now(),
  concluido_em timestamptz,
  autorizacao_producao_em timestamptz,
  responsavel_id uuid references public.usuarios(id) on delete set null,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_homologacao_ciclos_status_check check (status in (
    'preparacao',
    'operacao_paralela',
    'ativacao_gradual',
    'concluido',
    'bloqueado',
    'cancelado'
  ))
);

create unique index if not exists fin_homologacao_ciclos_empresa_nome_idx
  on public.fin_homologacao_ciclos (empresa_id, nome);
create unique index if not exists fin_homologacao_ciclos_id_empresa_id_unique_idx
  on public.fin_homologacao_ciclos (id, empresa_id);
create index if not exists fin_homologacao_ciclos_empresa_status_idx
  on public.fin_homologacao_ciclos (empresa_id, status, iniciado_em desc);
create index if not exists fin_homologacao_ciclos_responsavel_idx on public.fin_homologacao_ciclos (responsavel_id);
create index if not exists fin_homologacao_ciclos_created_by_idx on public.fin_homologacao_ciclos (created_by);
create index if not exists fin_homologacao_ciclos_updated_by_idx on public.fin_homologacao_ciclos (updated_by);

create table if not exists public.fin_homologacao_checklist (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  ciclo_id uuid not null,
  grupo text not null,
  item text not null,
  status text not null default 'pendente',
  evidencia jsonb not null default '{}'::jsonb,
  observacoes text,
  validado_by uuid references public.usuarios(id) on delete set null,
  validado_at timestamptz,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_homologacao_checklist_ciclo_empresa_fkey
    foreign key (ciclo_id, empresa_id) references public.fin_homologacao_ciclos(id, empresa_id) on delete cascade,
  constraint fin_homologacao_checklist_grupo_check check (grupo in (
    'preparacao',
    'operacao_paralela',
    'ativacao_gradual',
    'criterio_final'
  )),
  constraint fin_homologacao_checklist_status_check check (status in ('pendente', 'aprovado', 'reprovado', 'dispensado'))
);

create unique index if not exists fin_homologacao_checklist_ciclo_item_idx
  on public.fin_homologacao_checklist (ciclo_id, grupo, item);
create index if not exists fin_homologacao_checklist_ciclo_empresa_idx on public.fin_homologacao_checklist (ciclo_id, empresa_id);
create index if not exists fin_homologacao_checklist_empresa_status_idx on public.fin_homologacao_checklist (empresa_id, status, grupo);
create index if not exists fin_homologacao_checklist_validado_by_idx on public.fin_homologacao_checklist (validado_by);
create index if not exists fin_homologacao_checklist_created_by_idx on public.fin_homologacao_checklist (created_by);
create index if not exists fin_homologacao_checklist_updated_by_idx on public.fin_homologacao_checklist (updated_by);

create table if not exists public.fin_homologacao_divergencias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  ciclo_id uuid not null,
  tipo text not null,
  severidade text not null default 'media',
  descricao text not null,
  valor_referencia numeric(15,2),
  valor_financeiro numeric(15,2),
  status text not null default 'aberta',
  resolucao text,
  resolved_by uuid references public.usuarios(id) on delete set null,
  resolved_at timestamptz,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_homologacao_divergencias_ciclo_empresa_fkey
    foreign key (ciclo_id, empresa_id) references public.fin_homologacao_ciclos(id, empresa_id) on delete cascade,
  constraint fin_homologacao_divergencias_tipo_check check (tipo in ('saldo', 'baixa', 'documento', 'relatorio', 'permissao', 'outro')),
  constraint fin_homologacao_divergencias_severidade_check check (severidade in ('baixa', 'media', 'alta', 'critica')),
  constraint fin_homologacao_divergencias_status_check check (status in ('aberta', 'em_analise', 'corrigida', 'aceita', 'cancelada'))
);

create index if not exists fin_homologacao_divergencias_ciclo_empresa_idx on public.fin_homologacao_divergencias (ciclo_id, empresa_id);
create index if not exists fin_homologacao_divergencias_empresa_status_idx on public.fin_homologacao_divergencias (empresa_id, status, severidade);
create index if not exists fin_homologacao_divergencias_resolved_by_idx on public.fin_homologacao_divergencias (resolved_by);
create index if not exists fin_homologacao_divergencias_created_by_idx on public.fin_homologacao_divergencias (created_by);
create index if not exists fin_homologacao_divergencias_updated_by_idx on public.fin_homologacao_divergencias (updated_by);

create table if not exists public.fin_backup_restore_validacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  ciclo_id uuid not null,
  tipo text not null,
  referencia text,
  status text not null default 'planejado',
  detalhes jsonb not null default '{}'::jsonb,
  executado_by uuid references public.usuarios(id) on delete set null,
  executado_at timestamptz,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_backup_restore_validacoes_ciclo_empresa_fkey
    foreign key (ciclo_id, empresa_id) references public.fin_homologacao_ciclos(id, empresa_id) on delete cascade,
  constraint fin_backup_restore_validacoes_tipo_check check (tipo in ('backup', 'restore', 'reversao')),
  constraint fin_backup_restore_validacoes_status_check check (status in ('planejado', 'executado', 'validado', 'falhou', 'dispensado'))
);

create index if not exists fin_backup_restore_validacoes_ciclo_empresa_idx on public.fin_backup_restore_validacoes (ciclo_id, empresa_id);
create index if not exists fin_backup_restore_validacoes_empresa_status_idx on public.fin_backup_restore_validacoes (empresa_id, status, tipo);
create index if not exists fin_backup_restore_validacoes_executado_by_idx on public.fin_backup_restore_validacoes (executado_by);
create index if not exists fin_backup_restore_validacoes_created_by_idx on public.fin_backup_restore_validacoes (created_by);
create index if not exists fin_backup_restore_validacoes_updated_by_idx on public.fin_backup_restore_validacoes (updated_by);

drop view if exists public.fin_homologacao_resumo;
create view public.fin_homologacao_resumo
with (security_invoker = true)
as
select
  empresa.id as empresa_id,
  (select count(*)::integer from public.fin_homologacao_ciclos ciclo where ciclo.empresa_id = empresa.id) as ciclos,
  (select count(*)::integer from public.fin_homologacao_ciclos ciclo where ciclo.empresa_id = empresa.id and ciclo.status in ('preparacao', 'operacao_paralela', 'ativacao_gradual')) as ciclos_abertos,
  (select count(*)::integer from public.fin_homologacao_checklist item where item.empresa_id = empresa.id and item.status = 'pendente') as checklist_pendente,
  (select count(*)::integer from public.fin_homologacao_divergencias div where div.empresa_id = empresa.id and div.status in ('aberta', 'em_analise')) as divergencias_abertas,
  (select count(*)::integer from public.fin_backup_restore_validacoes val where val.empresa_id = empresa.id and val.status in ('planejado', 'executado')) as backup_restore_pendente
from public.fin_empresas empresa
where empresa.status = 'ativo';

do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'fin_homologacao_ciclos',
    'fin_homologacao_checklist',
    'fin_homologacao_divergencias',
    'fin_backup_restore_validacoes'
  ]
  loop
    execute format('alter table public.%I enable row level security', v_tabela);
    execute format('revoke all on table public.%I from anon', v_tabela);
    execute format('revoke all on table public.%I from authenticated', v_tabela);
    execute format('grant select, insert, update on table public.%I to authenticated', v_tabela);
    execute format('drop trigger if exists %I on public.%I', v_tabela || '_prepare_update', v_tabela);
    execute format('create trigger %I before update on public.%I for each row execute function private.fin_preparar_atualizacao()', v_tabela || '_prepare_update', v_tabela);
    execute format('drop trigger if exists %I on public.%I', v_tabela || '_audit', v_tabela);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function private.fin_auditar_linha()', v_tabela || '_audit', v_tabela);
  end loop;
end;
$$;

revoke all on table public.fin_homologacao_resumo from anon;
revoke all on table public.fin_homologacao_resumo from authenticated;
grant select on table public.fin_homologacao_resumo to authenticated;

do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'fin_homologacao_ciclos',
    'fin_homologacao_checklist',
    'fin_homologacao_divergencias',
    'fin_backup_restore_validacoes'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', v_tabela || '_select_financeiro_homologacao', v_tabela);
    execute format(
      'create policy %I on public.%I for select to authenticated using (
        (
          (select public.app_tem_permissao(''financeiro.homologacao'', ''view''))
          or (select public.app_tem_permissao(''financeiro.configuracoes'', ''view''))
        )
        and empresa_id in (
          select acesso.empresa_id
          from public.fin_usuario_empresas acesso
          where acesso.usuario_id = (select public.app_usuario_atual_id())
            and acesso.status = ''ativo''
        )
      )',
      v_tabela || '_select_financeiro_homologacao',
      v_tabela
    );

    execute format('drop policy if exists %I on public.%I', v_tabela || '_insert_financeiro_homologacao', v_tabela);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (
        (
          (select public.app_tem_permissao(''financeiro.homologacao'', ''edit''))
          or (select public.app_tem_permissao(''financeiro.configuracoes'', ''edit''))
        )
        and empresa_id in (
          select acesso.empresa_id
          from public.fin_usuario_empresas acesso
          where acesso.usuario_id = (select public.app_usuario_atual_id())
            and acesso.status = ''ativo''
        )
      )',
      v_tabela || '_insert_financeiro_homologacao',
      v_tabela
    );

    execute format('drop policy if exists %I on public.%I', v_tabela || '_update_financeiro_homologacao', v_tabela);
    execute format(
      'create policy %I on public.%I for update to authenticated using (
        (
          (select public.app_tem_permissao(''financeiro.homologacao'', ''edit''))
          or (select public.app_tem_permissao(''financeiro.configuracoes'', ''edit''))
        )
        and empresa_id in (
          select acesso.empresa_id
          from public.fin_usuario_empresas acesso
          where acesso.usuario_id = (select public.app_usuario_atual_id())
            and acesso.status = ''ativo''
        )
      ) with check (
        (
          (select public.app_tem_permissao(''financeiro.homologacao'', ''edit''))
          or (select public.app_tem_permissao(''financeiro.configuracoes'', ''edit''))
        )
        and empresa_id in (
          select acesso.empresa_id
          from public.fin_usuario_empresas acesso
          where acesso.usuario_id = (select public.app_usuario_atual_id())
            and acesso.status = ''ativo''
        )
      )',
      v_tabela || '_update_financeiro_homologacao',
      v_tabela
    );
  end loop;
end;
$$;
