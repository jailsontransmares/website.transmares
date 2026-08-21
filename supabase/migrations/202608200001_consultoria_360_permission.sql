begin;

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
  'consultoria_360',
  'Consultoria 360°',
  'modulo',
  null,
  '/operacoes/corretora/consultoria-360',
  35,
  'ativo'
)
on conflict (chave) do update
set nome = excluded.nome,
    tipo = excluded.tipo,
    rota = excluded.rota,
    ordem = excluded.ordem,
    status = excluded.status,
    updated_at = now();

with recurso as (
  select chave from public.recursos_acesso where chave = 'consultoria_360'
), perfis_alvo as (
  select id from public.perfis where slug in ('admin', 'usuario', 'especial', 'consulta')
)
insert into public.perfil_permissoes (perfil_id, recurso_chave, acao, permitido)
select perfil.id, recurso.chave, 'view', true
from perfis_alvo perfil
cross join recurso
on conflict (perfil_id, recurso_chave, acao) do update
set permitido = true,
    updated_at = now();

with recurso as (
  select chave from public.recursos_acesso where chave = 'consultoria_360'
), perfis_alvo as (
  select id from public.perfis where slug in ('admin', 'usuario', 'especial')
)
insert into public.perfil_permissoes (perfil_id, recurso_chave, acao, permitido)
select perfil.id, recurso.chave, acao.nome, true
from perfis_alvo perfil
cross join recurso
cross join (values ('create'), ('update')) as acao(nome)
on conflict (perfil_id, recurso_chave, acao) do update
set permitido = true,
    updated_at = now();

commit;
