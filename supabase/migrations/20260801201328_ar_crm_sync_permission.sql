insert into public.perfil_permissoes (perfil_id, recurso_chave, acao, permitido)
select perfil.id, 'painel_ar.crm', 'execute', true
from public.perfis perfil
where perfil.slug in ('admin', 'usuario', 'especial')
on conflict (perfil_id, recurso_chave, acao) do update
set permitido = true,
    updated_at = now();
