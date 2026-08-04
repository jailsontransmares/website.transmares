create or replace function public.pode_atualizar_dados_corretora()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.app_permissoes_efetivas() p
      where p.permitido = true
        and p.acao = 'update'
        and p.recurso_chave in ('configuracoes.corretora', 'configuracoes.identidade_visual', 'configuracoes')
    );
$$;

drop policy if exists "branding admin insere arquivos" on storage.objects;
drop policy if exists "branding admin atualiza arquivos" on storage.objects;
drop policy if exists "branding admin remove arquivos" on storage.objects;

create policy "branding usuarios autorizados inserem arquivos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'branding'
  and public.pode_atualizar_dados_corretora()
);

create policy "branding usuarios autorizados atualizam arquivos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'branding'
  and public.pode_atualizar_dados_corretora()
)
with check (
  bucket_id = 'branding'
  and public.pode_atualizar_dados_corretora()
);

create policy "branding usuarios autorizados removem arquivos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'branding'
  and public.pode_atualizar_dados_corretora()
);

grant execute on function public.pode_atualizar_dados_corretora() to authenticated;;
