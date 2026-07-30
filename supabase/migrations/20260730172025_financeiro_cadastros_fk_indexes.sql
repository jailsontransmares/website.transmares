-- Financeiro / Fase 4: indices complementares de FKs.

create index if not exists fin_categorias_cadastro_created_by_idx
  on public.fin_categorias_cadastro (created_by);

create index if not exists fin_categorias_cadastro_updated_by_idx
  on public.fin_categorias_cadastro (updated_by);

create index if not exists cad_pessoa_classificacoes_pessoa_empresa_idx
  on public.cad_pessoa_classificacoes (pessoa_id, empresa_id);

create index if not exists cad_pessoa_contatos_pessoa_empresa_idx
  on public.cad_pessoa_contatos (pessoa_id, empresa_id);

create index if not exists cad_pessoa_enderecos_pessoa_empresa_idx
  on public.cad_pessoa_enderecos (pessoa_id, empresa_id);

create index if not exists cad_pessoa_documentos_pessoa_empresa_idx
  on public.cad_pessoa_documentos (pessoa_id, empresa_id);

create index if not exists fin_categorias_pai_empresa_idx
  on public.fin_categorias (categoria_pai_id, empresa_id);

create index if not exists fin_contratos_pessoa_empresa_idx
  on public.fin_contratos (pessoa_id, empresa_id);
