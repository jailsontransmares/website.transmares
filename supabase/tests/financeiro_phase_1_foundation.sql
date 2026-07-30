-- Financeiro / Fase 1
-- Validação somente de leitura da fundação, segurança e ativação controlada.

select
  expected.object_name,
  to_regclass(expected.object_name) is not null as passed,
  case when to_regclass(expected.object_name) is not null then 'ok' else 'missing' end as status
from (
  values
    ('public.fin_empresas'),
    ('public.fin_usuario_empresas'),
    ('public.fin_parametros'),
    ('public.fin_auditoria')
) as expected(object_name)
order by expected.object_name;

select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  count(p.policyname) as policy_count,
  case
    when c.relrowsecurity and count(p.policyname) > 0 then 'ok'
    else 'rls_or_policy_missing'
  end as status
from pg_class c
join pg_namespace n
  on n.oid = c.relnamespace
left join pg_policies p
  on p.schemaname = n.nspname
 and p.tablename = c.relname
where n.nspname = 'public'
  and c.relname in ('fin_empresas', 'fin_usuario_empresas', 'fin_parametros', 'fin_auditoria')
group by c.relname, c.relrowsecurity
order by c.relname;

select
  recurso.chave,
  recurso.status,
  recurso.rota,
  case when recurso.status = 'ativo' then 'ok' else 'resource_inactive' end as status_validacao
from public.recursos_acesso recurso
where recurso.chave = 'financeiro'
   or recurso.chave like 'financeiro.%'
order by recurso.ordem, recurso.chave;

select
  item.titulo,
  item.status,
  item.dados ->> 'exibir_home' as exibir_home,
  case
    when item.status = 'inativo'
      and item.dados ->> 'exibir_home' = 'false'
    then 'ok'
    else 'unexpected_activation'
  end as status_validacao
from public.itens item
where item.dados ->> 'slug' = 'financeiro'
  and item.dados ->> 'tipo' = 'modulo';

select
  count(*) = 0 as passed,
  case when count(*) = 0 then 'ok' else 'unexpected_automatic_permission' end as status
from public.perfil_permissoes
where recurso_chave = 'financeiro'
   or recurso_chave like 'financeiro.%';

select
  grantee,
  table_name,
  string_agg(privilege_type, ', ' order by privilege_type) as privileges,
  case
    when bool_and(privilege_type = 'SELECT') then 'ok'
    else 'unexpected_write_grant'
  end as status
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('fin_empresas', 'fin_usuario_empresas', 'fin_parametros', 'fin_auditoria')
  and grantee in ('anon', 'authenticated')
group by grantee, table_name
order by grantee, table_name;

select
  count(*) >= 1 as passed,
  case when count(*) >= 1 then 'ok' else 'initial_company_missing' end as status
from public.fin_empresas
where codigo = 'transmares'
  and status = 'ativo';

select
  chave,
  valor,
  case
    when chave = 'modulo_ativo' and valor = 'false'::jsonb then 'ok'
    when chave in ('moeda_padrao', 'timezone_padrao') then 'ok'
    else 'unexpected_value'
  end as status
from public.fin_parametros
where empresa_id is null
  and chave in ('modulo_ativo', 'moeda_padrao', 'timezone_padrao')
order by chave;

select
  trigger_name,
  event_object_table,
  event_manipulation,
  'ok' as status
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table in ('fin_empresas', 'fin_usuario_empresas', 'fin_parametros')
  and trigger_name like 'fin\_%' escape '\'
order by event_object_table, trigger_name, event_manipulation;

select
  policyname,
  qual like '%financeiro.dados_sensiveis%' as protects_sensitive_data,
  case
    when qual like '%financeiro.dados_sensiveis%' then 'ok'
    else 'sensitive_audit_not_protected'
  end as status
from pg_policies
where schemaname = 'public'
  and tablename = 'fin_auditoria'
  and policyname = 'fin_auditoria_select_membership';
