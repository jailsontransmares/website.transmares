begin;

-- The permission editor groups resources under root modules. Register the
-- existing Operações section and attach Cartas so its permissions can be
-- managed through the Hub UI.
insert into public.recursos_acesso (chave, nome, tipo, recurso_pai, rota, ordem, status)
values ('operacoes', 'Operações', 'modulo', null, '/', 130, 'ativo')
on conflict (chave) do update set
  nome = excluded.nome,
  tipo = excluded.tipo,
  recurso_pai = excluded.recurso_pai,
  rota = excluded.rota,
  ordem = excluded.ordem,
  status = excluded.status,
  updated_at = now();

update public.recursos_acesso
set tipo = 'aba', recurso_pai = 'operacoes', updated_at = now()
where chave = 'operacoes.cartas';

commit;
