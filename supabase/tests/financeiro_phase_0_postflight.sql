-- Financeiro / Fase 0
-- Validação reutilizável após cada migration futura.
-- Inspeção somente de leitura.

-- Todas as tabelas financeiras e compartilhadas expostas no schema public
-- devem ter RLS habilitado.
select
  n.nspname || '.' || c.relname as object_name,
  c.relrowsecurity as rls_enabled,
  case when c.relrowsecurity then 'ok' else 'rls_disabled' end as status
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and (c.relname like 'fin\_%' escape '\' or c.relname like 'cad\_%' escape '\')
order by c.relname;

-- Cada tabela nova precisa ter ao menos uma policy. As permissões de cada ação
-- ainda devem ser validadas pelos testes específicos da fase.
select
  schemaname || '.' || tablename as object_name,
  count(policyname) as policy_count,
  case when count(policyname) > 0 then 'ok' else 'missing_policy' end as status
from pg_policies
where schemaname = 'public'
  and (tablename like 'fin\_%' escape '\' or tablename like 'cad\_%' escape '\')
group by schemaname, tablename
order by tablename;

-- Chaves estrangeiras devem possuir índice iniciado pelas mesmas colunas.
with foreign_keys as (
  select
    c.conrelid,
    c.conname,
    c.conkey
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where c.contype = 'f'
    and n.nspname = 'public'
    and (t.relname like 'fin\_%' escape '\' or t.relname like 'cad\_%' escape '\')
)
select
  foreign_keys.conrelid::regclass::text as table_name,
  foreign_keys.conname as constraint_name,
  exists (
    select 1
    from pg_index i
    where i.indrelid = foreign_keys.conrelid
      and i.indisvalid
      and (
        i.indkey::text = array_to_string(foreign_keys.conkey, ' ')
        or i.indkey::text like array_to_string(foreign_keys.conkey, ' ') || ' %'
      )
  ) as indexed,
  case
    when exists (
      select 1
      from pg_index i
      where i.indrelid = foreign_keys.conrelid
        and i.indisvalid
        and (
          i.indkey::text = array_to_string(foreign_keys.conkey, ' ')
          or i.indkey::text like array_to_string(foreign_keys.conkey, ' ') || ' %'
        )
    ) then 'ok'
    else 'missing_index'
  end as status
from foreign_keys
order by table_name, constraint_name;

-- Auditoria financeira não pode aceitar update ou delete do cliente.
select
  grantee,
  privilege_type,
  case
    when privilege_type in ('UPDATE', 'DELETE', 'TRUNCATE') then 'forbidden_grant'
    else 'ok'
  end as status
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'fin_auditoria'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;

-- Visibilidade e autorização do módulo são inspecionadas separadamente para
-- evitar ativação acidental durante uma migration de banco.
select
  titulo,
  status,
  dados ->> 'slug' as slug,
  dados ->> 'exibir_home' as exibir_home
from public.itens
where dados ->> 'slug' = 'financeiro'
  and dados ->> 'tipo' = 'modulo';

select
  chave,
  tipo,
  recurso_pai,
  rota,
  status
from public.recursos_acesso
where chave = 'financeiro'
   or chave like 'financeiro.%'
order by ordem, chave;

