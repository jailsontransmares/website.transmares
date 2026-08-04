-- Financeiro / Fase 10: refinamentos de complementares, backups e importacoes especiais.

insert into public.recursos_acesso (chave, nome, tipo, recurso_pai, rota, ordem, status)
values
  ('financeiro.backups', 'Backups', 'funcao', 'financeiro.complementares', '/financeiro/configuracoes', 70, 'ativo'),
  ('financeiro.alertas_agendamentos', 'Agendamentos de alertas', 'funcao', 'financeiro.complementares', '/financeiro/configuracoes', 71, 'ativo')
on conflict (chave) do update
set nome = excluded.nome,
    tipo = excluded.tipo,
    recurso_pai = excluded.recurso_pai,
    rota = excluded.rota,
    ordem = excluded.ordem,
    status = excluded.status,
    updated_at = now();

update public.itens
set status = 'ativo',
    dados = coalesce(dados, '{}'::jsonb) || jsonb_build_object(
      'slug', 'financeiro',
      'tipo', 'modulo',
      'ordem', 50,
      'bloqueavel', true,
      'exibir_home', true,
      'fase', 10
    ),
    updated_at = now()
where dados ->> 'slug' = 'financeiro'
  and dados ->> 'tipo' = 'modulo';

create unique index if not exists fin_importacoes_especiais_id_empresa_id_unique_idx
  on public.fin_importacoes_especiais (id, empresa_id);

create table if not exists public.fin_importacao_especial_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  importacao_id uuid not null,
  linha_numero integer not null,
  competencia date,
  seguradora_nome text,
  linha_negocio_id uuid references public.fin_linhas_negocio(id) on delete set null,
  credito_referencia text,
  repasse_referencia text,
  pessoa_documento text,
  pessoa_nome text,
  valor_bruto numeric(15,2) not null default 0,
  valor_liquido numeric(15,2) not null default 0,
  status text not null default 'pre_validado',
  chave_duplicidade text not null,
  detalhes jsonb not null default '{}'::jsonb,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_importacao_especial_itens_importacao_empresa_fkey
    foreign key (importacao_id, empresa_id) references public.fin_importacoes_especiais(id, empresa_id) on delete cascade,
  constraint fin_importacao_especial_itens_linha_check check (linha_numero > 0),
  constraint fin_importacao_especial_itens_valores_check check (valor_bruto >= 0 and valor_liquido >= 0),
  constraint fin_importacao_especial_itens_status_check check (status in ('pre_validado', 'valido', 'duplicado', 'gerado', 'ignorado', 'erro'))
);

create unique index if not exists fin_importacao_especial_itens_importacao_linha_idx
  on public.fin_importacao_especial_itens (importacao_id, linha_numero);
create unique index if not exists fin_importacao_especial_itens_empresa_duplicidade_idx
  on public.fin_importacao_especial_itens (empresa_id, chave_duplicidade)
  where status in ('valido', 'gerado');
create index if not exists fin_importacao_especial_itens_importacao_empresa_idx
  on public.fin_importacao_especial_itens (importacao_id, empresa_id);
create index if not exists fin_importacao_especial_itens_empresa_status_idx
  on public.fin_importacao_especial_itens (empresa_id, status, competencia desc);
create index if not exists fin_importacao_especial_itens_linha_negocio_idx
  on public.fin_importacao_especial_itens (linha_negocio_id);
create index if not exists fin_importacao_especial_itens_created_by_idx
  on public.fin_importacao_especial_itens (created_by);
create index if not exists fin_importacao_especial_itens_updated_by_idx
  on public.fin_importacao_especial_itens (updated_by);

create table if not exists public.fin_importacao_especial_consolidacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  importacao_id uuid not null,
  competencia date not null,
  seguradora_nome text not null,
  linha_negocio_id uuid references public.fin_linhas_negocio(id) on delete set null,
  total_creditos integer not null default 0,
  valor_bruto numeric(15,2) not null default 0,
  valor_liquido numeric(15,2) not null default 0,
  lancamento_id uuid references public.fin_lancamentos(id) on delete set null,
  status text not null default 'preview',
  detalhes jsonb not null default '{}'::jsonb,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_importacao_especial_consolidacoes_importacao_empresa_fkey
    foreign key (importacao_id, empresa_id) references public.fin_importacoes_especiais(id, empresa_id) on delete cascade,
  constraint fin_importacao_especial_consolidacoes_totais_check check (total_creditos >= 0 and valor_bruto >= 0 and valor_liquido >= 0),
  constraint fin_importacao_especial_consolidacoes_status_check check (status in ('preview', 'gerado', 'cancelado'))
);

create unique index if not exists fin_importacao_especial_consolidacoes_chave_idx
  on public.fin_importacao_especial_consolidacoes (importacao_id, competencia, seguradora_nome, coalesce(linha_negocio_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists fin_importacao_especial_consolidacoes_importacao_empresa_idx
  on public.fin_importacao_especial_consolidacoes (importacao_id, empresa_id);
create index if not exists fin_importacao_especial_consolidacoes_empresa_status_idx
  on public.fin_importacao_especial_consolidacoes (empresa_id, status, competencia desc);
create index if not exists fin_importacao_especial_consolidacoes_linha_negocio_idx
  on public.fin_importacao_especial_consolidacoes (linha_negocio_id);
create index if not exists fin_importacao_especial_consolidacoes_lancamento_idx
  on public.fin_importacao_especial_consolidacoes (lancamento_id);
create index if not exists fin_importacao_especial_consolidacoes_created_by_idx
  on public.fin_importacao_especial_consolidacoes (created_by);
create index if not exists fin_importacao_especial_consolidacoes_updated_by_idx
  on public.fin_importacao_especial_consolidacoes (updated_by);

create table if not exists public.fin_alerta_agendamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.fin_empresas(id) on delete cascade,
  tipo text not null,
  referencia_tipo text,
  referencia_id uuid,
  titulo text not null,
  mensagem text not null,
  recorrencia text not null default 'unico',
  antecedencia_dias integer not null default 0,
  proxima_execucao timestamptz,
  status text not null default 'ativo',
  metadados jsonb not null default '{}'::jsonb,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_alerta_agendamentos_antecedencia_check check (antecedencia_dias >= 0),
  constraint fin_alerta_agendamentos_recorrencia_check check (recorrencia in ('unico', 'semanal', 'mensal', 'anual', 'personalizado')),
  constraint fin_alerta_agendamentos_status_check check (status in ('ativo', 'pausado', 'encerrado'))
);

create index if not exists fin_alerta_agendamentos_empresa_status_idx
  on public.fin_alerta_agendamentos (empresa_id, status, proxima_execucao);
create index if not exists fin_alerta_agendamentos_referencia_idx
  on public.fin_alerta_agendamentos (referencia_tipo, referencia_id);
create index if not exists fin_alerta_agendamentos_created_by_idx
  on public.fin_alerta_agendamentos (created_by);
create index if not exists fin_alerta_agendamentos_updated_by_idx
  on public.fin_alerta_agendamentos (updated_by);

create table if not exists public.fin_backup_execucoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.fin_empresas(id) on delete set null,
  tipo text not null default 'completo',
  armazenamento text not null default 'google_drive',
  drive_file_id text,
  drive_path text,
  status text not null default 'agendado',
  retencao_dias integer not null default 15,
  tentativa integer not null default 0,
  proxima_tentativa timestamptz,
  resultado jsonb not null default '{}'::jsonb,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_backup_execucoes_retencao_check check (retencao_dias between 1 and 365),
  constraint fin_backup_execucoes_tentativa_check check (tentativa >= 0),
  constraint fin_backup_execucoes_tipo_check check (tipo in ('completo', 'parcial', 'restore', 'reversao')),
  constraint fin_backup_execucoes_status_check check (status in ('agendado', 'executando', 'concluido', 'falhou', 'cancelado'))
);

create index if not exists fin_backup_execucoes_empresa_status_idx
  on public.fin_backup_execucoes (empresa_id, status, created_at desc);
create index if not exists fin_backup_execucoes_created_by_idx on public.fin_backup_execucoes (created_by);
create index if not exists fin_backup_execucoes_updated_by_idx on public.fin_backup_execucoes (updated_by);

drop view if exists public.fin_complementares_resumo;
create view public.fin_complementares_resumo
with (security_invoker = true)
as
select
  empresa.id as empresa_id,
  (select count(*)::integer from public.fin_patrimonios item where item.empresa_id = empresa.id and item.status = 'ativo') as patrimonios_ativos,
  (select count(*)::integer from public.fin_estoque_itens item where item.empresa_id = empresa.id and item.status = 'ativo') as itens_estoque,
  (select count(*)::integer from public.fin_estoque_itens item where item.empresa_id = empresa.id and item.status = 'ativo' and item.saldo_atual <= item.estoque_minimo) as itens_estoque_baixo,
  (select count(*)::integer from public.fin_solicitacoes_compra item where item.empresa_id = empresa.id and item.status in ('solicitada', 'aprovada')) as compras_abertas,
  (select count(*)::integer from public.fin_recibos item where item.empresa_id = empresa.id and item.status = 'emitido') as recibos_emitidos,
  (select count(*)::integer from public.fin_alertas item where (item.empresa_id = empresa.id or item.empresa_id is null) and item.status = 'aberto') as alertas_abertos,
  (select count(*)::integer from public.fin_importacoes_especiais item where item.empresa_id = empresa.id and item.status in ('recebida', 'processando', 'processada_com_alertas', 'erro')) as importacoes_pendentes,
  (select count(*)::integer from public.fin_importacao_especial_itens item where item.empresa_id = empresa.id and item.status in ('pre_validado', 'duplicado', 'erro')) as importacao_itens_pendentes,
  (select count(*)::integer from public.fin_alerta_agendamentos item where (item.empresa_id = empresa.id or item.empresa_id is null) and item.status = 'ativo') as alertas_agendados,
  (select count(*)::integer from public.fin_backup_execucoes item where (item.empresa_id = empresa.id or item.empresa_id is null) and item.status = 'falhou') as backups_falha
from public.fin_empresas empresa
where empresa.status = 'ativo';

do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'fin_importacao_especial_itens',
    'fin_importacao_especial_consolidacoes',
    'fin_alerta_agendamentos',
    'fin_backup_execucoes'
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

revoke all on table public.fin_complementares_resumo from anon;
revoke all on table public.fin_complementares_resumo from authenticated;
grant select on table public.fin_complementares_resumo to authenticated;

do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'fin_importacao_especial_itens',
    'fin_importacao_especial_consolidacoes',
    'fin_alerta_agendamentos',
    'fin_backup_execucoes'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', v_tabela || '_select_financeiro_fase10', v_tabela);
    execute format(
      'create policy %I on public.%I for select to authenticated using (
        (
          (select public.app_tem_permissao(''financeiro.complementares'', ''view''))
          or (select public.app_tem_permissao(''financeiro.configuracoes'', ''view''))
        )
        and (
          empresa_id is null
          or empresa_id in (
            select acesso.empresa_id
            from public.fin_usuario_empresas acesso
            where acesso.usuario_id = (select public.app_usuario_atual_id())
              and acesso.status = ''ativo''
          )
        )
      )',
      v_tabela || '_select_financeiro_fase10',
      v_tabela
    );

    execute format('drop policy if exists %I on public.%I', v_tabela || '_insert_financeiro_fase10', v_tabela);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (
        (
          (select public.app_tem_permissao(''financeiro.complementares'', ''edit''))
          or (select public.app_tem_permissao(''financeiro.configuracoes'', ''edit''))
        )
        and (
          empresa_id is null
          or empresa_id in (
            select acesso.empresa_id
            from public.fin_usuario_empresas acesso
            where acesso.usuario_id = (select public.app_usuario_atual_id())
              and acesso.status = ''ativo''
          )
        )
      )',
      v_tabela || '_insert_financeiro_fase10',
      v_tabela
    );

    execute format('drop policy if exists %I on public.%I', v_tabela || '_update_financeiro_fase10', v_tabela);
    execute format(
      'create policy %I on public.%I for update to authenticated using (
        (
          (select public.app_tem_permissao(''financeiro.complementares'', ''edit''))
          or (select public.app_tem_permissao(''financeiro.configuracoes'', ''edit''))
        )
        and (
          empresa_id is null
          or empresa_id in (
            select acesso.empresa_id
            from public.fin_usuario_empresas acesso
            where acesso.usuario_id = (select public.app_usuario_atual_id())
              and acesso.status = ''ativo''
          )
        )
      ) with check (
        (
          (select public.app_tem_permissao(''financeiro.complementares'', ''edit''))
          or (select public.app_tem_permissao(''financeiro.configuracoes'', ''edit''))
        )
        and (
          empresa_id is null
          or empresa_id in (
            select acesso.empresa_id
            from public.fin_usuario_empresas acesso
            where acesso.usuario_id = (select public.app_usuario_atual_id())
              and acesso.status = ''ativo''
          )
        )
      )',
      v_tabela || '_update_financeiro_fase10',
      v_tabela
    );
  end loop;
end;
$$;
