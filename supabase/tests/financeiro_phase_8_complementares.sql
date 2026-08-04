-- Financeiro / Fase 8
-- Validacao somente de leitura dos recursos complementares.

with expected(object_name) as (
  values
    ('public.fin_patrimonios'),
    ('public.fin_estoque_itens'),
    ('public.fin_estoque_movimentos'),
    ('public.fin_solicitacoes_compra'),
    ('public.fin_solicitacao_compra_itens'),
    ('public.fin_recibos'),
    ('public.fin_alertas'),
    ('public.fin_importacoes_especiais'),
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
    'fin_patrimonios',
    'fin_estoque_itens',
    'fin_estoque_movimentos',
    'fin_solicitacoes_compra',
    'fin_solicitacao_compra_itens',
    'fin_recibos',
    'fin_alertas',
    'fin_importacoes_especiais'
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
  valor::text as modulo_ativo,
  status
from public.fin_parametros
where empresa_id is null
  and chave = 'modulo_ativo';
