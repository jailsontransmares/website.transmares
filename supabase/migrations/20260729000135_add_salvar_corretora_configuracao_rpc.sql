create or replace function public.salvar_corretora_configuracao(p_payload jsonb)
returns public.corretora_configuracoes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tem_permissao boolean;
  v_id uuid;
  v_status public.status_registro;
  v_updated_by uuid;
  v_record public.corretora_configuracoes;
begin
  select exists (
    select 1
    from public.app_permissoes_efetivas() pe
    where pe.recurso_chave = 'configuracoes.corretora'
      and pe.acao = 'update'
      and pe.permitido = true
  ) or public.is_admin()
  into v_tem_permissao;

  if not coalesce(v_tem_permissao, false) then
    raise exception 'Seu usuário não possui permissão para salvar os dados da corretora.' using errcode = '42501';
  end if;

  v_id := nullif(p_payload ->> 'id', '')::uuid;
  v_updated_by := nullif(p_payload ->> 'updated_by', '')::uuid;

  if nullif(p_payload ->> 'status', '') in ('ativo', 'inativo') then
    v_status := (p_payload ->> 'status')::public.status_registro;
  else
    v_status := 'ativo'::public.status_registro;
  end if;

  if v_id is null then
    select id
      into v_id
    from public.corretora_configuracoes
    where status = 'ativo'
    order by updated_at desc nulls last, created_at desc nulls last
    limit 1;
  end if;

  if v_id is not null and exists (select 1 from public.corretora_configuracoes where id = v_id) then
    update public.corretora_configuracoes
       set razao_social = nullif(p_payload ->> 'razao_social', ''),
           nome_fantasia = nullif(p_payload ->> 'nome_fantasia', ''),
           cnpj = nullif(p_payload ->> 'cnpj', ''),
           inscricao_estadual = nullif(p_payload ->> 'inscricao_estadual', ''),
           inscricao_municipal = nullif(p_payload ->> 'inscricao_municipal', ''),
           susep = nullif(p_payload ->> 'susep', ''),
           email = nullif(p_payload ->> 'email', ''),
           telefone = nullif(p_payload ->> 'telefone', ''),
           whatsapp = nullif(p_payload ->> 'whatsapp', ''),
           site = nullif(p_payload ->> 'site', ''),
           endereco_logradouro = nullif(p_payload ->> 'endereco_logradouro', ''),
           endereco_numero = nullif(p_payload ->> 'endereco_numero', ''),
           endereco_complemento = nullif(p_payload ->> 'endereco_complemento', ''),
           endereco_bairro = nullif(p_payload ->> 'endereco_bairro', ''),
           endereco_cidade = nullif(p_payload ->> 'endereco_cidade', ''),
           endereco_uf = nullif(p_payload ->> 'endereco_uf', ''),
           endereco_cep = nullif(p_payload ->> 'endereco_cep', ''),
           logo_url = nullif(p_payload ->> 'logo_url', ''),
           logo_path = nullif(p_payload ->> 'logo_path', ''),
           status = v_status,
           updated_at = now(),
           updated_by = v_updated_by
     where id = v_id
     returning * into v_record;
  else
    insert into public.corretora_configuracoes (
      razao_social,
      nome_fantasia,
      cnpj,
      inscricao_estadual,
      inscricao_municipal,
      susep,
      email,
      telefone,
      whatsapp,
      site,
      endereco_logradouro,
      endereco_numero,
      endereco_complemento,
      endereco_bairro,
      endereco_cidade,
      endereco_uf,
      endereco_cep,
      logo_url,
      logo_path,
      status,
      updated_at,
      updated_by
    ) values (
      nullif(p_payload ->> 'razao_social', ''),
      nullif(p_payload ->> 'nome_fantasia', ''),
      nullif(p_payload ->> 'cnpj', ''),
      nullif(p_payload ->> 'inscricao_estadual', ''),
      nullif(p_payload ->> 'inscricao_municipal', ''),
      nullif(p_payload ->> 'susep', ''),
      nullif(p_payload ->> 'email', ''),
      nullif(p_payload ->> 'telefone', ''),
      nullif(p_payload ->> 'whatsapp', ''),
      nullif(p_payload ->> 'site', ''),
      nullif(p_payload ->> 'endereco_logradouro', ''),
      nullif(p_payload ->> 'endereco_numero', ''),
      nullif(p_payload ->> 'endereco_complemento', ''),
      nullif(p_payload ->> 'endereco_bairro', ''),
      nullif(p_payload ->> 'endereco_cidade', ''),
      nullif(p_payload ->> 'endereco_uf', ''),
      nullif(p_payload ->> 'endereco_cep', ''),
      nullif(p_payload ->> 'logo_url', ''),
      nullif(p_payload ->> 'logo_path', ''),
      v_status,
      now(),
      v_updated_by
    )
    returning * into v_record;
  end if;

  return v_record;
end;
$$;

grant execute on function public.salvar_corretora_configuracao(jsonb) to authenticated;;
