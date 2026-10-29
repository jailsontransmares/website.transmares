alter table public.fin_lancamentos
  add column if not exists cliente_nome text;

comment on column public.fin_lancamentos.cliente_nome is
  'Nome informado na operacao de cobranca quando o cliente ainda nao possui cadastro.';
