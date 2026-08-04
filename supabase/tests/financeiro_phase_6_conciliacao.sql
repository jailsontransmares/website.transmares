-- Financeiro / Fase 6
-- Validacao somente de leitura da fundacao de conciliacao bancaria.

with expected(object_name) as (
  values
    ('public.fin_extrato_importacoes'),
    ('public.fin_movimentos_bancarios'),
    ('public.fin_conciliacao_sugestoes'),
    ('public.fin_conciliacoes'),
    ('public.fin_conciliacao_resumo')
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
    'fin_extrato_importacoes',
    'fin_movimentos_bancarios',
    'fin_conciliacao_sugestoes',
    'fin_conciliacoes'
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
    'fin_extrato_importacoes',
    'fin_movimentos_bancarios',
    'fin_conciliacao_sugestoes',
    'fin_conciliacoes',
    'fin_conciliacao_resumo'
  )
  and grantee in ('anon', 'authenticated')
group by grantee, table_name
order by grantee, table_name;

select
  c.relname as view_name,
  case
    when coalesce(c.reloptions, array[]::text[]) @> array['security_invoker=true'] then 'ok'
    else 'security_invoker_missing'
  end as status
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'fin_conciliacao_resumo';
