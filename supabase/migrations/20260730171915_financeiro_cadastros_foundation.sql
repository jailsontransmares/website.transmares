-- Financeiro / Fase 4: cadastros estruturantes.
-- Cria a base de cadastros compartilhados e financeiros, sem backfill.

create table if not exists public.fin_categorias_cadastro (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.fin_empresas(id) on delete restrict,
  nome text not null,
  descricao text,
  obrigatorio_cliente boolean not null default false,
  obrigatorio_fornecedor boolean not null default false,
  obrigatorio_parceiro boolean not null default false,
  ordem integer not null default 0,
  status text not null default 'ativo',
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_categorias_cadastro_nome_empresa_key unique (empresa_id, nome),
  constraint fin_categorias_cadastro_status_check check (status in ('ativo', 'inativo', 'arquivado'))
);

create table if not exists public.cad_pessoas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.fin_empresas(id) on delete restrict,
  categoria_id uuid references public.fin_categorias_cadastro(id) on delete set null,
  tipo_pessoa text not null default 'sem_documento',
  nome_razao_social text not null,
  nome_fantasia text,
  cpf text,
  cnpj text,
  cei_caepf text,
  inscricao_estadual text,
  inscricao_municipal text,
  isento_ie boolean not null default false,
  origem text not null default 'manual',
  observacoes text,
  status text not null default 'ativo',
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cad_pessoas_tipo_check check (tipo_pessoa in ('pf', 'pj', 'sem_documento')),
  constraint cad_pessoas_cpf_check check (cpf is null or cpf ~ '^[0-9]{11}$'),
  constraint cad_pessoas_cnpj_check check (cnpj is null or cnpj ~ '^[0-9]{14}$'),
  constraint cad_pessoas_status_check check (status in ('ativo', 'inativo', 'arquivado')),
  constraint cad_pessoas_documento_tipo_check check (
    (tipo_pessoa = 'pf' and cpf is not null and cnpj is null)
    or (tipo_pessoa = 'pj' and cnpj is not null and cpf is null)
    or (tipo_pessoa = 'sem_documento' and cpf is null and cnpj is null)
  )
);

create unique index if not exists cad_pessoas_empresa_cpf_unique_idx
  on public.cad_pessoas (empresa_id, cpf)
  where cpf is not null;

create unique index if not exists cad_pessoas_empresa_cnpj_unique_idx
  on public.cad_pessoas (empresa_id, cnpj)
  where cnpj is not null;

create unique index if not exists cad_pessoas_id_empresa_id_unique_idx
  on public.cad_pessoas (id, empresa_id);

create index if not exists cad_pessoas_empresa_status_nome_idx
  on public.cad_pessoas (empresa_id, status, nome_razao_social);

create index if not exists cad_pessoas_categoria_idx
  on public.cad_pessoas (categoria_id);

create index if not exists cad_pessoas_created_by_idx
  on public.cad_pessoas (created_by);

create index if not exists cad_pessoas_updated_by_idx
  on public.cad_pessoas (updated_by);

create table if not exists public.cad_pessoa_classificacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  pessoa_id uuid not null,
  classificacao text not null,
  status text not null default 'ativo',
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cad_pessoa_classificacoes_pessoa_empresa_fkey
    foreign key (pessoa_id, empresa_id) references public.cad_pessoas(id, empresa_id) on delete cascade,
  constraint cad_pessoa_classificacoes_key unique (empresa_id, pessoa_id, classificacao),
  constraint cad_pessoa_classificacoes_tipo_check check (classificacao in ('cliente', 'fornecedor', 'parceiro')),
  constraint cad_pessoa_classificacoes_status_check check (status in ('ativo', 'inativo'))
);

create index if not exists cad_pessoa_classificacoes_empresa_tipo_idx
  on public.cad_pessoa_classificacoes (empresa_id, classificacao, status);

create index if not exists cad_pessoa_classificacoes_pessoa_idx
  on public.cad_pessoa_classificacoes (pessoa_id);

create index if not exists cad_pessoa_classificacoes_created_by_idx
  on public.cad_pessoa_classificacoes (created_by);

create index if not exists cad_pessoa_classificacoes_updated_by_idx
  on public.cad_pessoa_classificacoes (updated_by);

create table if not exists public.cad_pessoa_contatos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  pessoa_id uuid not null,
  tipo text not null,
  nome text,
  email text,
  telefone text,
  cargo text,
  principal boolean not null default false,
  observacoes text,
  status text not null default 'ativo',
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cad_pessoa_contatos_pessoa_empresa_fkey
    foreign key (pessoa_id, empresa_id) references public.cad_pessoas(id, empresa_id) on delete cascade,
  constraint cad_pessoa_contatos_tipo_check check (tipo in ('email', 'telefone', 'contato')),
  constraint cad_pessoa_contatos_status_check check (status in ('ativo', 'inativo')),
  constraint cad_pessoa_contatos_valor_check check (email is not null or telefone is not null or nome is not null)
);

create unique index if not exists cad_pessoa_contatos_email_principal_idx
  on public.cad_pessoa_contatos (empresa_id, pessoa_id)
  where tipo = 'email' and principal and status = 'ativo';

create unique index if not exists cad_pessoa_contatos_telefone_principal_idx
  on public.cad_pessoa_contatos (empresa_id, pessoa_id)
  where tipo = 'telefone' and principal and status = 'ativo';

create unique index if not exists cad_pessoa_contatos_contato_principal_idx
  on public.cad_pessoa_contatos (empresa_id, pessoa_id)
  where tipo = 'contato' and principal and status = 'ativo';

create index if not exists cad_pessoa_contatos_empresa_pessoa_idx
  on public.cad_pessoa_contatos (empresa_id, pessoa_id, status);

create index if not exists cad_pessoa_contatos_created_by_idx
  on public.cad_pessoa_contatos (created_by);

create index if not exists cad_pessoa_contatos_updated_by_idx
  on public.cad_pessoa_contatos (updated_by);

create table if not exists public.cad_pessoa_enderecos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  pessoa_id uuid not null,
  tipo text not null default 'principal',
  cep text not null,
  logradouro text not null,
  numero text,
  complemento text,
  bairro text,
  cidade text not null,
  uf text not null,
  observacoes text,
  principal boolean not null default false,
  status text not null default 'ativo',
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cad_pessoa_enderecos_pessoa_empresa_fkey
    foreign key (pessoa_id, empresa_id) references public.cad_pessoas(id, empresa_id) on delete cascade,
  constraint cad_pessoa_enderecos_cep_check check (cep ~ '^[0-9]{8}$'),
  constraint cad_pessoa_enderecos_uf_check check (uf ~ '^[A-Z]{2}$'),
  constraint cad_pessoa_enderecos_status_check check (status in ('ativo', 'inativo'))
);

create unique index if not exists cad_pessoa_enderecos_principal_idx
  on public.cad_pessoa_enderecos (empresa_id, pessoa_id)
  where principal and status = 'ativo';

create index if not exists cad_pessoa_enderecos_empresa_pessoa_idx
  on public.cad_pessoa_enderecos (empresa_id, pessoa_id, status);

create index if not exists cad_pessoa_enderecos_created_by_idx
  on public.cad_pessoa_enderecos (created_by);

create index if not exists cad_pessoa_enderecos_updated_by_idx
  on public.cad_pessoa_enderecos (updated_by);

create table if not exists public.cad_pessoa_documentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  pessoa_id uuid not null,
  tipo_documento text not null,
  documento text not null,
  orgao_emissor text,
  data_emissao date,
  data_validade date,
  observacoes text,
  principal boolean not null default false,
  status text not null default 'ativo',
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cad_pessoa_documentos_pessoa_empresa_fkey
    foreign key (pessoa_id, empresa_id) references public.cad_pessoas(id, empresa_id) on delete cascade,
  constraint cad_pessoa_documentos_status_check check (status in ('ativo', 'inativo'))
);

create index if not exists cad_pessoa_documentos_empresa_pessoa_idx
  on public.cad_pessoa_documentos (empresa_id, pessoa_id, tipo_documento, status);

create index if not exists cad_pessoa_documentos_created_by_idx
  on public.cad_pessoa_documentos (created_by);

create index if not exists cad_pessoa_documentos_updated_by_idx
  on public.cad_pessoa_documentos (updated_by);

create table if not exists public.fin_contas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.fin_empresas(id) on delete restrict,
  nome text not null,
  tipo text not null,
  banco text,
  agencia text,
  conta text,
  chave_pix text,
  saldo_inicial numeric(15,2) not null default 0,
  moeda text not null default 'BRL',
  sensivel boolean not null default false,
  status text not null default 'ativo',
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_contas_empresa_nome_key unique (empresa_id, nome),
  constraint fin_contas_tipo_check check (tipo in ('banco', 'caixa', 'carteira', 'cartao')),
  constraint fin_contas_moeda_check check (moeda ~ '^[A-Z]{3}$'),
  constraint fin_contas_status_check check (status in ('ativo', 'inativo', 'arquivado'))
);

create index if not exists fin_contas_empresa_status_nome_idx
  on public.fin_contas (empresa_id, status, nome);

create index if not exists fin_contas_created_by_idx
  on public.fin_contas (created_by);

create index if not exists fin_contas_updated_by_idx
  on public.fin_contas (updated_by);

create table if not exists public.fin_categorias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.fin_empresas(id) on delete restrict,
  categoria_pai_id uuid,
  codigo text,
  nome text not null,
  natureza text not null,
  dre_grupo text,
  ordem integer not null default 0,
  status text not null default 'ativo',
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_categorias_empresa_nome_key unique (empresa_id, nome),
  constraint fin_categorias_empresa_codigo_key unique (empresa_id, codigo),
  constraint fin_categorias_natureza_check check (natureza in ('entrada', 'saida', 'transferencia')),
  constraint fin_categorias_status_check check (status in ('ativo', 'inativo', 'arquivado')),
  constraint fin_categorias_not_self_parent check (categoria_pai_id is null or categoria_pai_id <> id)
);

create unique index if not exists fin_categorias_id_empresa_id_unique_idx
  on public.fin_categorias (id, empresa_id);

alter table public.fin_categorias
  drop constraint if exists fin_categorias_pai_empresa_fkey;

alter table public.fin_categorias
  add constraint fin_categorias_pai_empresa_fkey
  foreign key (categoria_pai_id, empresa_id)
  references public.fin_categorias(id, empresa_id)
  on delete restrict;

create index if not exists fin_categorias_empresa_status_nome_idx
  on public.fin_categorias (empresa_id, status, nome);

create index if not exists fin_categorias_pai_idx
  on public.fin_categorias (categoria_pai_id);

create index if not exists fin_categorias_created_by_idx
  on public.fin_categorias (created_by);

create index if not exists fin_categorias_updated_by_idx
  on public.fin_categorias (updated_by);

create table if not exists public.fin_centros_custo (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.fin_empresas(id) on delete restrict,
  codigo text,
  nome text not null,
  descricao text,
  ordem integer not null default 0,
  status text not null default 'ativo',
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_centros_custo_empresa_nome_key unique (empresa_id, nome),
  constraint fin_centros_custo_empresa_codigo_key unique (empresa_id, codigo),
  constraint fin_centros_custo_status_check check (status in ('ativo', 'inativo', 'arquivado'))
);

create index if not exists fin_centros_custo_empresa_status_nome_idx
  on public.fin_centros_custo (empresa_id, status, nome);

create index if not exists fin_centros_custo_created_by_idx
  on public.fin_centros_custo (created_by);

create index if not exists fin_centros_custo_updated_by_idx
  on public.fin_centros_custo (updated_by);

create table if not exists public.fin_linhas_negocio (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.fin_empresas(id) on delete restrict,
  codigo text,
  nome text not null,
  descricao text,
  ordem integer not null default 0,
  status text not null default 'ativo',
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_linhas_negocio_empresa_nome_key unique (empresa_id, nome),
  constraint fin_linhas_negocio_empresa_codigo_key unique (empresa_id, codigo),
  constraint fin_linhas_negocio_status_check check (status in ('ativo', 'inativo', 'arquivado'))
);

create index if not exists fin_linhas_negocio_empresa_status_nome_idx
  on public.fin_linhas_negocio (empresa_id, status, nome);

create index if not exists fin_linhas_negocio_created_by_idx
  on public.fin_linhas_negocio (created_by);

create index if not exists fin_linhas_negocio_updated_by_idx
  on public.fin_linhas_negocio (updated_by);

create table if not exists public.fin_contratos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.fin_empresas(id) on delete restrict,
  pessoa_id uuid not null,
  numero text,
  descricao text not null,
  data_inicio date not null,
  data_fim date,
  valor_previsto numeric(15,2),
  status text not null default 'ativo',
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_contratos_pessoa_empresa_fkey
    foreign key (pessoa_id, empresa_id) references public.cad_pessoas(id, empresa_id) on delete restrict,
  constraint fin_contratos_periodo_check check (data_fim is null or data_fim >= data_inicio),
  constraint fin_contratos_valor_check check (valor_previsto is null or valor_previsto >= 0),
  constraint fin_contratos_status_check check (status in ('ativo', 'inativo', 'encerrado', 'arquivado'))
);

create unique index if not exists fin_contratos_empresa_numero_unique_idx
  on public.fin_contratos (empresa_id, numero)
  where numero is not null;

create index if not exists fin_contratos_empresa_status_inicio_idx
  on public.fin_contratos (empresa_id, status, data_inicio desc);

create index if not exists fin_contratos_pessoa_idx
  on public.fin_contratos (pessoa_id);

create index if not exists fin_contratos_created_by_idx
  on public.fin_contratos (created_by);

create index if not exists fin_contratos_updated_by_idx
  on public.fin_contratos (updated_by);

create or replace function private.fin_prevenir_ciclo_categoria()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_encontrado boolean;
begin
  if new.categoria_pai_id is null then
    return new;
  end if;

  with recursive arvore as (
    select c.id, c.categoria_pai_id
    from public.fin_categorias c
    where c.id = new.categoria_pai_id
      and c.empresa_id = new.empresa_id
    union all
    select pai.id, pai.categoria_pai_id
    from public.fin_categorias pai
    join arvore on arvore.categoria_pai_id = pai.id
    where pai.empresa_id = new.empresa_id
  )
  select exists (select 1 from arvore where id = new.id)
    into v_encontrado;

  if v_encontrado then
    raise exception 'Categoria financeira nao pode formar ciclo hierarquico.';
  end if;

  return new;
end;
$$;

revoke all on function private.fin_prevenir_ciclo_categoria() from public;
revoke all on function private.fin_prevenir_ciclo_categoria() from anon;
revoke all on function private.fin_prevenir_ciclo_categoria() from authenticated;

drop trigger if exists fin_categorias_prevent_cycle on public.fin_categorias;
create trigger fin_categorias_prevent_cycle
before insert or update of categoria_pai_id, empresa_id on public.fin_categorias
for each row execute function private.fin_prevenir_ciclo_categoria();

drop view if exists public.fin_cadastros_resumo;
create view public.fin_cadastros_resumo
with (security_invoker = true)
as
select
  empresa.id as empresa_id,
  count(distinct pessoa.id)::integer as pessoas,
  count(distinct pessoa.id) filter (where pessoa.status = 'ativo')::integer as pessoas_ativas,
  count(distinct classificacao.pessoa_id) filter (where classificacao.classificacao = 'cliente' and classificacao.status = 'ativo')::integer as clientes,
  count(distinct classificacao.pessoa_id) filter (where classificacao.classificacao = 'fornecedor' and classificacao.status = 'ativo')::integer as fornecedores,
  count(distinct classificacao.pessoa_id) filter (where classificacao.classificacao = 'parceiro' and classificacao.status = 'ativo')::integer as parceiros,
  (select count(*)::integer from public.fin_contas conta where conta.empresa_id = empresa.id and conta.status = 'ativo') as contas,
  (select count(*)::integer from public.fin_categorias categoria where categoria.empresa_id = empresa.id and categoria.status = 'ativo') as categorias,
  (select count(*)::integer from public.fin_centros_custo centro where centro.empresa_id = empresa.id and centro.status = 'ativo') as centros_custo,
  (select count(*)::integer from public.fin_linhas_negocio linha where linha.empresa_id = empresa.id and linha.status = 'ativo') as linhas_negocio,
  (select count(*)::integer from public.fin_contratos contrato where contrato.empresa_id = empresa.id and contrato.status = 'ativo') as contratos
from public.fin_empresas empresa
left join public.cad_pessoas pessoa on pessoa.empresa_id = empresa.id
left join public.cad_pessoa_classificacoes classificacao on classificacao.empresa_id = empresa.id and classificacao.pessoa_id = pessoa.id
where empresa.status = 'ativo'
group by empresa.id;

insert into public.recursos_acesso (
  chave,
  nome,
  tipo,
  recurso_pai,
  rota,
  ordem,
  status
)
values
  ('financeiro.cadastros.pessoas', 'Pessoas', 'funcao', 'financeiro.cadastros', '/financeiro/cadastros', 61, 'ativo'),
  ('financeiro.cadastros.contas', 'Contas financeiras', 'funcao', 'financeiro.cadastros', '/financeiro/cadastros', 62, 'ativo'),
  ('financeiro.cadastros.categorias', 'Categorias financeiras', 'funcao', 'financeiro.cadastros', '/financeiro/cadastros', 63, 'ativo'),
  ('financeiro.cadastros.centros_custo', 'Centros de custo', 'funcao', 'financeiro.cadastros', '/financeiro/cadastros', 64, 'ativo'),
  ('financeiro.cadastros.linhas_negocio', 'Linhas de negócio', 'funcao', 'financeiro.cadastros', '/financeiro/cadastros', 65, 'ativo'),
  ('financeiro.cadastros.contratos', 'Contratos', 'funcao', 'financeiro.cadastros', '/financeiro/cadastros', 66, 'ativo')
on conflict (chave) do update
set nome = excluded.nome,
    tipo = excluded.tipo,
    recurso_pai = excluded.recurso_pai,
    rota = excluded.rota,
    ordem = excluded.ordem,
    status = excluded.status,
    updated_at = now();

do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'fin_categorias_cadastro',
    'cad_pessoas',
    'cad_pessoa_classificacoes',
    'cad_pessoa_contatos',
    'cad_pessoa_enderecos',
    'cad_pessoa_documentos',
    'fin_contas',
    'fin_categorias',
    'fin_centros_custo',
    'fin_linhas_negocio',
    'fin_contratos'
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

grant select on public.fin_cadastros_resumo to authenticated;
revoke all on public.fin_cadastros_resumo from anon;

do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'fin_categorias_cadastro',
    'cad_pessoas',
    'cad_pessoa_classificacoes',
    'cad_pessoa_contatos',
    'cad_pessoa_enderecos',
    'cad_pessoa_documentos',
    'fin_contas',
    'fin_categorias',
    'fin_centros_custo',
    'fin_linhas_negocio',
    'fin_contratos'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', v_tabela || '_select_financeiro_cadastros', v_tabela);
    execute format(
      'create policy %I on public.%I for select to authenticated using (
        (select public.app_tem_permissao(''financeiro.cadastros'', ''view''))
        and empresa_id in (
          select acesso.empresa_id
          from public.fin_usuario_empresas acesso
          where acesso.usuario_id = (select public.app_usuario_atual_id())
            and acesso.status = ''ativo''
        )
        and (
          not (to_jsonb(%I) ? ''sensivel'')
          or coalesce((to_jsonb(%I) ->> ''sensivel'')::boolean, false) = false
          or (select public.app_tem_permissao(''financeiro.dados_sensiveis'', ''view_sensitive''))
        )
      )',
      v_tabela || '_select_financeiro_cadastros',
      v_tabela,
      v_tabela,
      v_tabela
    );

    execute format('drop policy if exists %I on public.%I', v_tabela || '_insert_financeiro_cadastros', v_tabela);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (
        (select public.app_tem_permissao(''financeiro.cadastros'', ''create''))
        and empresa_id in (
          select acesso.empresa_id
          from public.fin_usuario_empresas acesso
          where acesso.usuario_id = (select public.app_usuario_atual_id())
            and acesso.status = ''ativo''
        )
      )',
      v_tabela || '_insert_financeiro_cadastros',
      v_tabela
    );

    execute format('drop policy if exists %I on public.%I', v_tabela || '_update_financeiro_cadastros', v_tabela);
    execute format(
      'create policy %I on public.%I for update to authenticated using (
        (select public.app_tem_permissao(''financeiro.cadastros'', ''edit''))
        and empresa_id in (
          select acesso.empresa_id
          from public.fin_usuario_empresas acesso
          where acesso.usuario_id = (select public.app_usuario_atual_id())
            and acesso.status = ''ativo''
        )
      ) with check (
        (select public.app_tem_permissao(''financeiro.cadastros'', ''edit''))
        and empresa_id in (
          select acesso.empresa_id
          from public.fin_usuario_empresas acesso
          where acesso.usuario_id = (select public.app_usuario_atual_id())
            and acesso.status = ''ativo''
        )
      )',
      v_tabela || '_update_financeiro_cadastros',
      v_tabela
    );
  end loop;
end;
$$;
