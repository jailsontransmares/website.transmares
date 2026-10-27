alter table public.crm_oportunidades_pj_temporarios
  add column if not exists porte text not null default '';

drop function if exists public.crm_salvar_cnpj_temporario(text, text, text, text, text, text, text, text, text, text, text, text, text, timestamptz, boolean);

create function public.crm_salvar_cnpj_temporario(
  p_oportunidade_id text,
  p_produto_id text,
  p_cnpj text,
  p_razao_social text default '',
  p_situacao text default '',
  p_endereco text default '',
  p_numero text default '',
  p_complemento text default '',
  p_cep text default '',
  p_bairro text default '',
  p_municipio text default '',
  p_uf text default '',
  p_porte text default '',
  p_fonte text default 'manual',
  p_consultado_em timestamptz default null,
  p_reconsultar boolean default false
)
returns public.crm_oportunidades_pj_temporarios
language plpgsql
set search_path = public
as $$
declare
  v_cnpj text := regexp_replace(coalesce(p_cnpj, ''), '\D', '', 'g');
  v_temporario public.crm_oportunidades_pj_temporarios;
  v_old_id uuid;
  v_versao integer;
begin
  if not public.app_tem_permissao('painel_ar', 'update') then
    raise exception 'Usuário sem permissão para salvar o PJ temporário.' using errcode = '42501';
  end if;
  if nullif(trim(p_oportunidade_id), '') is null or nullif(trim(p_produto_id), '') is null then
    raise exception 'Oportunidade e produto são obrigatórios.' using errcode = '22023';
  end if;
  if v_cnpj !~ '^[0-9]{14}$' then
    raise exception 'CNPJ inválido.' using errcode = '22023';
  end if;
  if coalesce(p_fonte, '') not in ('api', 'manual') then
    raise exception 'Fonte inválida.' using errcode = '22023';
  end if;

  select * into v_temporario
    from public.crm_oportunidades_pj_temporarios
   where oportunidade_id = trim(p_oportunidade_id)
     and cnpj = v_cnpj
     and status = 'ativo'
   for update;

  if v_temporario.id is not null and not p_reconsultar then
    insert into public.crm_oportunidades_pj_temporarios_produtos (temporario_id, oportunidade_id, produto_id)
    values (v_temporario.id, trim(p_oportunidade_id), trim(p_produto_id))
    on conflict (oportunidade_id, produto_id) do update
      set temporario_id = excluded.temporario_id;
    return v_temporario;
  end if;

  if v_temporario.id is not null then
    v_old_id := v_temporario.id;
    update public.crm_oportunidades_pj_temporarios
       set status = 'substituido', expira_em = now() + interval '2 years', updated_at = now(), updated_by = public.app_usuario_atual_id()
     where id = v_temporario.id;
    select coalesce(max(versao), 0) + 1 into v_versao
      from public.crm_oportunidades_pj_temporarios
     where oportunidade_id = trim(p_oportunidade_id) and cnpj = v_cnpj;
  else
    select coalesce(max(versao), 0) + 1 into v_versao
      from public.crm_oportunidades_pj_temporarios
     where oportunidade_id = trim(p_oportunidade_id) and cnpj = v_cnpj;
  end if;

  insert into public.crm_oportunidades_pj_temporarios (
    oportunidade_id, versao, cnpj, razao_social, situacao, porte, endereco, numero,
    complemento, cep, bairro, municipio, uf, fonte, consultado_em,
    created_by, updated_by
  ) values (
    trim(p_oportunidade_id), v_versao, v_cnpj, coalesce(trim(p_razao_social), ''),
    coalesce(trim(p_situacao), ''), coalesce(trim(p_porte), ''), coalesce(trim(p_endereco), ''),
    coalesce(trim(p_numero), ''), coalesce(trim(p_complemento), ''),
    coalesce(trim(p_cep), ''), coalesce(trim(p_bairro), ''),
    coalesce(trim(p_municipio), ''), upper(coalesce(trim(p_uf), '')),
    coalesce(p_fonte, 'manual'), p_consultado_em,
    public.app_usuario_atual_id(), public.app_usuario_atual_id()
  ) returning * into v_temporario;

  update public.crm_oportunidades_pj_temporarios_produtos
     set temporario_id = v_temporario.id
   where temporario_id = v_old_id;
  update public.crm_oportunidades_pj_temporarios_produtos
     set temporario_id = v_temporario.id
   where oportunidade_id = trim(p_oportunidade_id)
     and produto_id = trim(p_produto_id);
  insert into public.crm_oportunidades_pj_temporarios_produtos (temporario_id, oportunidade_id, produto_id)
  values (v_temporario.id, trim(p_oportunidade_id), trim(p_produto_id))
  on conflict (oportunidade_id, produto_id) do update
    set temporario_id = excluded.temporario_id;

  return v_temporario;
end;
$$;

revoke execute on function public.crm_salvar_cnpj_temporario(text, text, text, text, text, text, text, text, text, text, text, text, text, text, timestamptz, boolean) from public;
grant execute on function public.crm_salvar_cnpj_temporario(text, text, text, text, text, text, text, text, text, text, text, text, text, text, timestamptz, boolean) to authenticated;
