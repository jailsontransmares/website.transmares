alter table public.usuarios
  add column if not exists cpf text,
  add column if not exists telefone text;

comment on column public.usuarios.cpf is 'CPF cadastrado no módulo administrativo de usuários.';
comment on column public.usuarios.telefone is 'Telefone cadastrado no módulo administrativo de usuários.';
