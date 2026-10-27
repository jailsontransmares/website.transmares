-- Consolidates CRM/CRM 2.0 permissions under the global Painel AR resource.
-- Canonical actions: view, update, delete.
-- Existing canonical grants take precedence over legacy grants when both exist.

begin;

-- Migrate profile permissions first. The legacy execute action maps to update.
insert into public.perfil_permissoes (perfil_id, recurso_chave, acao, permitido)
select old.perfil_id,
       'painel_ar',
       case when old.acao = 'execute' then 'update' else old.acao end,
       old.permitido
from public.perfil_permissoes old
where old.recurso_chave in ('painel_ar.crm', 'painel_ar.crm_2')
  and old.acao in ('view', 'update', 'delete', 'execute')
  and not exists (
    select 1
    from public.perfil_permissoes canonical
    where canonical.perfil_id = old.perfil_id
      and canonical.recurso_chave = 'painel_ar'
      and canonical.acao = case when old.acao = 'execute' then 'update' else old.acao end
  )
on conflict (perfil_id, recurso_chave, acao) do nothing;

-- Migrate user-specific overrides with the same action mapping.
insert into public.usuario_permissoes (
  usuario_id, recurso_chave, acao, efeito, motivo, valido_de, valido_ate, created_by
)
select old.usuario_id,
       'painel_ar',
       case when old.acao = 'execute' then 'update' else old.acao end,
       old.efeito,
       old.motivo,
       old.valido_de,
       old.valido_ate,
       old.created_by
from public.usuario_permissoes old
where old.recurso_chave in ('painel_ar.crm', 'painel_ar.crm_2')
  and old.acao in ('view', 'update', 'delete', 'execute')
  and not exists (
    select 1
    from public.usuario_permissoes canonical
    where canonical.usuario_id = old.usuario_id
      and canonical.recurso_chave = 'painel_ar'
      and canonical.acao = case when old.acao = 'execute' then 'update' else old.acao end
  )
on conflict (usuario_id, recurso_chave, acao) do nothing;

-- Remove migrated legacy grants so the administrative screen has one source of truth.
delete from public.perfil_permissoes
where recurso_chave in ('painel_ar.crm', 'painel_ar.crm_2');

delete from public.usuario_permissoes
where recurso_chave in ('painel_ar.crm', 'painel_ar.crm_2');

-- Keep the legacy resources for referential/audit safety, but hide them from active permission management.
update public.recursos_acesso
set status = 'inativo', updated_at = now()
where chave in ('painel_ar.crm', 'painel_ar.crm_2');

-- CRM data policies now use the global AR permission.
drop policy if exists ar_crm_items_select_permission on public.ar_crm_items;
create policy ar_crm_items_select_permission on public.ar_crm_items
  for select to authenticated
  using (public.app_tem_permissao('painel_ar', 'view'));

drop policy if exists ar_crm_mapping_select_permission on public.ar_crm_clickup_mapping;
create policy ar_crm_mapping_select_permission on public.ar_crm_clickup_mapping
  for select to authenticated
  using (public.app_tem_permissao('painel_ar', 'view'));

drop policy if exists ar_crm_sync_runs_select_permission on public.ar_crm_sync_runs;
create policy ar_crm_sync_runs_select_permission on public.ar_crm_sync_runs
  for select to authenticated
  using (public.app_tem_permissao('painel_ar', 'view'));

drop policy if exists ar_crm_comment_links_select_permission on public.ar_crm_comment_links;
create policy ar_crm_comment_links_select_permission on public.ar_crm_comment_links
  for select to authenticated
  using (public.app_tem_permissao('painel_ar', 'view'));

drop policy if exists ar_crm_comment_reactions_select_permission on public.ar_crm_comment_reactions;
create policy ar_crm_comment_reactions_select_permission on public.ar_crm_comment_reactions
  for select to authenticated
  using (public.app_tem_permissao('painel_ar', 'view'));

drop policy if exists ar_crm_comment_reactions_insert_self on public.ar_crm_comment_reactions;
create policy ar_crm_comment_reactions_insert_self on public.ar_crm_comment_reactions
  for insert to authenticated
  with check (
    public.app_tem_permissao('painel_ar', 'update')
    and exists (
      select 1 from public.usuarios u
      where u.id = user_id
        and u.auth_user_id = (select auth.uid())
        and u.status = 'ativo'
    )
  );

drop policy if exists ar_crm_comment_reactions_delete_self on public.ar_crm_comment_reactions;
create policy ar_crm_comment_reactions_delete_self on public.ar_crm_comment_reactions
  for delete to authenticated
  using (
    public.app_tem_permissao('painel_ar', 'update')
    and exists (
      select 1 from public.usuarios u
      where u.id = user_id
        and u.auth_user_id = (select auth.uid())
        and u.status = 'ativo'
    )
  );

drop policy if exists ar_crm_comment_mentions_select_permission on public.ar_crm_comment_mentions;
create policy ar_crm_comment_mentions_select_permission on public.ar_crm_comment_mentions
  for select to authenticated
  using (public.app_tem_permissao('painel_ar', 'view'));

commit;
