-- Financeiro / Fase 0
-- Inspeção somente de leitura. Não cria nem altera objetos.
-- Resultado esperado: todas as linhas com status = 'ok'.

with required_relations(object_name) as (
  values
    ('public.usuarios'),
    ('public.perfis'),
    ('public.recursos_acesso'),
    ('public.perfil_permissoes'),
    ('public.usuario_permissoes'),
    ('public.itens'),
    ('public.corretora_configuracoes'),
    ('public.parceiros'),
    ('public.rh_colaboradores'),
    ('public.rh_dados_bancarios_colaboradores')
),
required_functions(object_name) as (
  values
    ('public.app_usuario_atual_id()'),
    ('public.app_tem_permissao(text,text)')
),
relation_checks as (
  select
    'relation'::text as check_type,
    object_name,
    to_regclass(object_name) is not null as passed,
    case
      when to_regclass(object_name) is not null then 'ok'
      else 'missing'
    end as status
  from required_relations
),
function_checks as (
  select
    'function'::text as check_type,
    object_name,
    to_regprocedure(object_name) is not null as passed,
    case
      when to_regprocedure(object_name) is not null then 'ok'
      else 'missing'
    end as status
  from required_functions
),
rls_checks as (
  select
    'rls'::text as check_type,
    required_relations.object_name,
    coalesce(pg_class.relrowsecurity, false) as passed,
    case
      when pg_class.relrowsecurity then 'ok'
      else 'disabled_or_missing'
    end as status
  from required_relations
  left join pg_class
    on pg_class.oid = to_regclass(required_relations.object_name)
)
select check_type, object_name, passed, status
from relation_checks
union all
select check_type, object_name, passed, status
from function_checks
union all
select check_type, object_name, passed, status
from rls_checks
order by check_type, object_name;

-- Inventário de migrations já registradas no ambiente.
select version, name
from supabase_migrations.schema_migrations
order by version;

-- O Financeiro não pode existir antes da Fase 1.
select
  count(*) = 0 as passed,
  case when count(*) = 0 then 'ok' else 'finance_objects_already_exist' end as status,
  array_agg(n.nspname || '.' || c.relname order by c.relname)
    filter (where c.relname is not null) as unexpected_objects
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p', 'v', 'm')
  and (c.relname like 'fin\_%' escape '\' or c.relname like 'cad\_%' escape '\');

