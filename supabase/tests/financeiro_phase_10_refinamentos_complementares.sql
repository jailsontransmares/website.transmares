-- Financeiro / Fase 10
-- Validacao somente de leitura dos refinamentos complementares.

with expected(object_name) as (
  values
    ('public.fin_importacao_especial_itens'),
    ('public.fin_importacao_especial_consolidacoes'),
    ('public.fin_alerta_agendamentos'),
    ('public.fin_backup_execucoes'),
    ('public.fin_complementares_resumo')
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
    'fin_importacao_especial_itens',
    'fin_importacao_especial_consolidacoes',
    'fin_alerta_agendamentos',
    'fin_backup_execucoes'
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
  and c.relname = 'fin_complementares_resumo';

select
  item.status as item_status,
  item.dados ->> 'exibir_home' as exibir_home,
  item.dados ->> 'fase' as fase
from public.itens item
where item.dados ->> 'slug' = 'financeiro'
  and item.dados ->> 'tipo' = 'modulo';
