insert into public.recursos_acesso (
  chave,
  nome,
  tipo,
  recurso_pai,
  rota,
  ordem,
  status
)
values (
  'admin.parceiros_indicacao',
  'Parceiros de Indicação',
  'aba',
  'admin',
  '/admin/cadastros/parceiros-indicacao',
  94,
  'ativo'
)
on conflict (chave) do update
set nome = excluded.nome,
    tipo = excluded.tipo,
    recurso_pai = excluded.recurso_pai,
    rota = excluded.rota,
    ordem = excluded.ordem,
    status = excluded.status,
    updated_at = now();

insert into public.perfil_permissoes (
  perfil_id,
  recurso_chave,
  acao,
  permitido
)
select p.id, 'admin.parceiros_indicacao', acao, true
from public.perfis p
cross join unnest(array['view', 'create', 'update', 'archive', 'view_sensitive']) as acao
where p.slug = 'admin'
on conflict (perfil_id, recurso_chave, acao) do update
set permitido = excluded.permitido,
    updated_at = now();

alter table public.parceiros enable row level security;

revoke insert, update, delete, truncate on table public.parceiros from anon;
revoke delete, truncate on table public.parceiros from authenticated;
grant select, insert, update on table public.parceiros to authenticated;

drop policy if exists "admin pode gerenciar parceiros" on public.parceiros;
drop policy if exists "usuarios ativos podem ver parceiros" on public.parceiros;
drop policy if exists parceiros_select_permission on public.parceiros;
drop policy if exists parceiros_insert_permission on public.parceiros;
drop policy if exists parceiros_update_permission on public.parceiros;

create policy parceiros_select_permission
on public.parceiros
for select
to authenticated
using (
  public.app_tem_permissao('admin.parceiros_indicacao', 'view')
  or (
    public.app_tem_permissao('painel_ar.gerar_links', 'view')
    and status::text = 'ativo'
  )
);

create policy parceiros_insert_permission
on public.parceiros
for insert
to authenticated
with check (public.app_tem_permissao('admin.parceiros_indicacao', 'create'));

create policy parceiros_update_permission
on public.parceiros
for update
to authenticated
using (
  public.app_tem_permissao('admin.parceiros_indicacao', 'update')
  or public.app_tem_permissao('admin.parceiros_indicacao', 'archive')
)
with check (
  public.app_tem_permissao('admin.parceiros_indicacao', 'update')
  or public.app_tem_permissao('admin.parceiros_indicacao', 'archive')
);
