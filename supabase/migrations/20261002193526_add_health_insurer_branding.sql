begin;

alter table public.simulador_saude_operadoras
  add column if not exists logo_url text,
  add column if not exists cor_marca text not null default '#174A8B';

alter table public.simulador_saude_operadoras
  drop constraint if exists simulador_saude_operadoras_cor_marca_check,
  add constraint simulador_saude_operadoras_cor_marca_check
    check (cor_marca ~ '^#[0-9A-Fa-f]{6}$');

-- Logos use the existing public branding bucket. Uploads are allowed only to
-- users who can create or update the health catalog.
drop policy if exists simulador_saude_upload_operator_logo on storage.objects;
create policy simulador_saude_upload_operator_logo
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'branding'
  and name like 'operadoras/%'
  and (
    (select public.app_tem_permissao('simulador_saude.catalogo', 'create'))
    or (select public.app_tem_permissao('simulador_saude.catalogo', 'update'))
  )
);

drop policy if exists simulador_saude_remove_operator_logo on storage.objects;
create policy simulador_saude_remove_operator_logo
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'branding'
  and name like 'operadoras/%'
  and (
    (select public.app_tem_permissao('simulador_saude.catalogo', 'create'))
    or (select public.app_tem_permissao('simulador_saude.catalogo', 'update'))
  )
);

commit;
