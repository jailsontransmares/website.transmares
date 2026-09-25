alter table public.usuarios
  add column if not exists trocar_senha_proximo_acesso boolean not null default false;

comment on column public.usuarios.trocar_senha_proximo_acesso is
  'Indica que o usuário deve definir uma senha pessoal antes de acessar o Hub.';
