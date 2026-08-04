-- Financeiro / Fase 7
-- Validacao somente de leitura de relatorios, dashboard e fechamento.

with expected(object_name) as (
  values
    ('public.fin_fechamento_periodos'),
    ('public.fin_relatorio_execucoes'),
    ('public.fin_orcamentos'),
    ('public.fin_fluxo_caixa_resumo'),
    ('public.fin_contas_pagar_receber_resumo'),
    ('public.fin_inadimplencia_resumo'),
    ('public.fin_dre_gerencial_resumo'),
    ('public.fin_orcamento_realizado_resumo'),
    ('public.fin_dashboard_resumo')
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
    'fin_fechamento_periodos',
    'fin_relatorio_execucoes',
    'fin_orcamentos'
  )
group by c.relname, c.relrowsecurity
order by c.relname;

select
  c.relname as view_name,
  case
    when coalesce(c.reloptions, array[]::text[]) @> array['security_invoker=true'] then 'ok'
    else 'security_invoker_missing'
  end as status
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'fin_fluxo_caixa_resumo',
    'fin_contas_pagar_receber_resumo',
    'fin_inadimplencia_resumo',
    'fin_dre_gerencial_resumo',
    'fin_orcamento_realizado_resumo',
    'fin_dashboard_resumo'
  )
order by c.relname;

select
  grantee,
  table_name,
  string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'fin_fechamento_periodos',
    'fin_relatorio_execucoes',
    'fin_orcamentos',
    'fin_fluxo_caixa_resumo',
    'fin_contas_pagar_receber_resumo',
    'fin_inadimplencia_resumo',
    'fin_dre_gerencial_resumo',
    'fin_orcamento_realizado_resumo',
    'fin_dashboard_resumo'
  )
  and grantee in ('anon', 'authenticated')
group by grantee, table_name
order by grantee, table_name;
