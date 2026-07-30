-- Financeiro / Fase 4
-- Validacao somente de leitura da base de cadastros.

with expected(object_name) as (
  values
    ('public.fin_categorias_cadastro'),
    ('public.cad_pessoas'),
    ('public.cad_pessoa_classificacoes'),
    ('public.cad_pessoa_contatos'),
    ('public.cad_pessoa_enderecos'),
    ('public.cad_pessoa_documentos'),
    ('public.fin_contas'),
    ('public.fin_categorias'),
    ('public.fin_centros_custo'),
    ('public.fin_linhas_negocio'),
    ('public.fin_contratos'),
    ('public.fin_cadastros_resumo')
)
select
  expected.object_name,
  to_regclass(expected.object_name) is not null as passed,
  case when to_regclass(expected.object_name) is not null then 'ok' else 'missing' end as status
from expected
order by expected.object_name;

select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  count(p.policyname) as policy_count,
  case
    when c.relrowsecurity and count(p.policyname) >= 3 then 'ok'
    else 'rls_or_policy_missing'
  end as status
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
where n.nspname = 'public'
  and c.relname in (
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
  )
group by c.relname, c.relrowsecurity
order by c.relname;

select
  grantee,
  table_name,
  string_agg(privilege_type, ', ' order by privilege_type) as privileges,
  case
    when bool_and(privilege_type in ('INSERT', 'SELECT', 'UPDATE')) then 'ok'
    else 'unexpected_grant'
  end as status
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
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
    'fin_contratos',
    'fin_cadastros_resumo'
  )
  and grantee in ('anon', 'authenticated')
group by grantee, table_name
order by grantee, table_name;

select
  chave,
  status,
  case when status = 'ativo' then 'ok' else 'inactive_resource' end as status_validacao
from public.recursos_acesso
where chave like 'financeiro.cadastros.%'
order by ordem, chave;
