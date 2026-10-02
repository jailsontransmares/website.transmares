begin;

insert into public.recursos_acesso (chave, nome, tipo, recurso_pai, rota, ordem, status)
values (
  'simulador_saude',
  'Simulador - Saúde',
  'modulo',
  null,
  '/operacoes/corretora/simulador-saude',
  36,
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

insert into public.recursos_acesso (chave, nome, tipo, recurso_pai, rota, ordem, status)
values (
  'simulador_saude.catalogo',
  'Catálogo de Planos e Preços',
  'aba',
  'simulador_saude',
  '/operacoes/corretora/simulador-saude/catalogo',
  37,
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

with recursos as (
  select unnest(array['simulador_saude', 'simulador_saude.catalogo']) as chave
), perfis_leitura as (
  select id from public.perfis where slug in ('admin', 'usuario', 'especial', 'consulta')
)
insert into public.perfil_permissoes (perfil_id, recurso_chave, acao, permitido)
select perfil.id, recurso.chave, 'view', true
from perfis_leitura perfil
cross join recursos recurso
on conflict (perfil_id, recurso_chave, acao) do nothing;

with perfil_operacional as (
  select id from public.perfis where slug in ('admin', 'usuario', 'especial')
), recurso as (
  select chave from public.recursos_acesso where chave = 'simulador_saude'
)
insert into public.perfil_permissoes (perfil_id, recurso_chave, acao, permitido)
select perfil.id, recurso.chave, acao.nome, true
from perfil_operacional perfil
cross join recurso
cross join (values ('create'), ('update')) as acao(nome)
on conflict (perfil_id, recurso_chave, acao) do nothing;

with perfil_admin as (
  select id from public.perfis where slug = 'admin'
), recurso as (
  select chave from public.recursos_acesso where chave = 'simulador_saude.catalogo'
)
insert into public.perfil_permissoes (perfil_id, recurso_chave, acao, permitido)
select perfil.id, recurso.chave, acao.nome, true
from perfil_admin perfil
cross join recurso
cross join (values ('create'), ('update')) as acao(nome)
on conflict (perfil_id, recurso_chave, acao) do nothing;

commit;
