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
  'painel_ar.crm_2',
  'CRM 2.0',
  'aba',
  'painel_ar',
  '/painel-ar/200',
  16,
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

insert into public.perfil_permissoes (perfil_id, recurso_chave, acao, permitido)
select perfil.id, 'painel_ar.crm_2', acao, true
from public.perfis perfil
cross join unnest(array['view', 'update', 'delete']) as acao
where perfil.slug = 'admin'
on conflict (perfil_id, recurso_chave, acao) do update
set permitido = true,
    updated_at = now();

insert into public.perfil_permissoes (perfil_id, recurso_chave, acao, permitido)
select perfil.id, 'painel_ar.crm_2', acao, true
from public.perfis perfil
cross join unnest(array['view', 'update']) as acao
where perfil.slug in ('usuario', 'especial')
on conflict (perfil_id, recurso_chave, acao) do update
set permitido = true,
    updated_at = now();

insert into public.perfil_permissoes (perfil_id, recurso_chave, acao, permitido)
select perfil.id, 'painel_ar.crm_2', 'view', true
from public.perfis perfil
where perfil.slug = 'consulta'
on conflict (perfil_id, recurso_chave, acao) do update
set permitido = true,
    updated_at = now();
