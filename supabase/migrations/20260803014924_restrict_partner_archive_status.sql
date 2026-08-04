drop policy if exists parceiros_update_permission on public.parceiros;

create policy parceiros_update_permission
on public.parceiros
for update
to authenticated
using (
  public.app_tem_permissao('admin.parceiros_indicacao', 'update')
  or public.app_tem_permissao('admin.parceiros_indicacao', 'archive')
)
with check (
  (
    public.app_tem_permissao('admin.parceiros_indicacao', 'archive')
    or (
      public.app_tem_permissao('admin.parceiros_indicacao', 'update')
      and status::text <> 'arquivado'
    )
  )
);
