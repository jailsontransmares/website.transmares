-- Financeiro / Fase 5
-- Validacao somente de leitura da fundacao de lancamentos.

with expected(object_name) as (
  values
    ('public.fin_lancamentos'),
    ('public.fin_lancamento_parcelas'),
    ('public.fin_lancamento_rateios'),
    ('public.fin_lancamento_baixas'),
    ('public.fin_lancamento_status_historico'),
    ('public.fin_lancamento_recorrencias'),
    ('public.fin_lancamentos_resumo')
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
    'fin_lancamentos',
    'fin_lancamento_parcelas',
    'fin_lancamento_rateios',
    'fin_lancamento_baixas',
    'fin_lancamento_status_historico',
    'fin_lancamento_recorrencias'
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
    'fin_lancamentos',
    'fin_lancamento_parcelas',
    'fin_lancamento_rateios',
    'fin_lancamento_baixas',
    'fin_lancamento_status_historico',
    'fin_lancamento_recorrencias',
    'fin_lancamentos_resumo'
  )
  and grantee in ('anon', 'authenticated')
group by grantee, table_name
order by grantee, table_name;
