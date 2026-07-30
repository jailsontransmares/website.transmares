create index if not exists rh_colaboradores_created_by_idx
  on public.rh_colaboradores (created_by);

create index if not exists rh_colaboradores_updated_by_idx
  on public.rh_colaboradores (updated_by);

create index if not exists rh_documentos_created_by_idx
  on public.rh_documentos_cadastrais (created_by);

create index if not exists rh_documentos_updated_by_idx
  on public.rh_documentos_cadastrais (updated_by);

create index if not exists rh_dependentes_created_by_idx
  on public.rh_dependentes (created_by);

create index if not exists rh_dependentes_updated_by_idx
  on public.rh_dependentes (updated_by);

drop index if exists public.rh_documentos_colaborador_idx;
