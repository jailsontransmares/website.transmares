alter table public.usuarios
  add column if not exists nome_usuario text;

comment on column public.usuarios.nome_usuario is
  'Identificador público de login futuro, único sem distinção entre maiúsculas e minúsculas.';

alter table public.usuarios
  add constraint usuarios_nome_usuario_format_check
  check (nome_usuario is null or nome_usuario ~ '^[a-z0-9._-]{3,32}$');

create unique index if not exists usuarios_nome_usuario_lower_unique_idx
  on public.usuarios (lower(nome_usuario))
  where nome_usuario is not null;
