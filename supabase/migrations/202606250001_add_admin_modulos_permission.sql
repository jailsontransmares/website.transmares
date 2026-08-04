insert into public.recursos_acesso (chave, nome, tipo, recurso_pai, rota, ordem, status)
values ('admin.modulos', 'Configurações por Módulo', 'aba', 'admin', '/admin/modulos', 94, 'ativo')
on conflict (chave) do update
set nome = excluded.nome,
    tipo = excluded.tipo,
    recurso_pai = excluded.recurso_pai,
    rota = excluded.rota,
    ordem = excluded.ordem,
    status = excluded.status,
    updated_at = now();

insert into public.perfil_permissoes (perfil_id, recurso_chave, acao, permitido)
select p.id, 'admin.modulos', acao, true
from public.perfis p
cross join unnest(array['view', 'create', 'update', 'delete', 'manage_permissions']) as acao
where p.slug = 'admin'
on conflict (perfil_id, recurso_chave, acao) do update
set permitido = excluded.permitido,
    updated_at = now();
