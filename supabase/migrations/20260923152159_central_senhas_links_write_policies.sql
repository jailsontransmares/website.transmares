-- Keep link writes aligned with the Central de Senhas permission model while
-- preventing these permissions from changing other public.itens records.
drop policy if exists itens_links_insert_central_senhas_permission on public.itens;
create policy itens_links_insert_central_senhas_permission
on public.itens
for insert
to authenticated
with check (
  coalesce(dados ->> 'tipo', '') = 'link'
  and coalesce(dados ->> 'escopo', 'corretora') in ('corretora', 'ar', 'gestao')
  and (select public.app_tem_permissao('central_senhas', 'create'))
);

drop policy if exists itens_links_update_central_senhas_permission on public.itens;
create policy itens_links_update_central_senhas_permission
on public.itens
for update
to authenticated
using (
  coalesce(dados ->> 'tipo', '') = 'link'
  and (select public.app_tem_permissao('central_senhas', 'update'))
)
with check (
  coalesce(dados ->> 'tipo', '') = 'link'
  and coalesce(dados ->> 'escopo', 'corretora') in ('corretora', 'ar', 'gestao')
  and (select public.app_tem_permissao('central_senhas', 'update'))
);
