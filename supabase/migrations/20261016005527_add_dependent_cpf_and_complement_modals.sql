alter table public.rh_dependentes
  add column if not exists cpf text;

alter table public.rh_dependentes
  drop constraint if exists rh_dependentes_cpf_check;

alter table public.rh_dependentes
  add constraint rh_dependentes_cpf_check
  check (
    cpf is null
    or (cpf ~ '^[0-9]{11}$' and cpf !~ '^([0-9])\1{10}$')
  );

comment on column public.rh_dependentes.cpf is
  'CPF do dependente, armazenado somente com dígitos.';

do $migration$
declare
  v_definition text;
  v_updated_definition text;
begin
  select pg_get_functiondef(
    'public.rh_salvar_cadastro_pessoal(uuid,jsonb,jsonb,jsonb,jsonb)'::regprocedure
  )
  into v_definition;

  v_updated_definition := replace(
    v_definition,
    $old$          data_nascimento,
          parentesco
        )$old$,
    $new$          data_nascimento,
          parentesco,
          cpf
        )$new$
  );

  v_updated_definition := replace(
    v_updated_definition,
    $old$          nullif(p_dependente ->> 'data_nascimento', '')::date,
          nullif(btrim(p_dependente ->> 'parentesco'), '')
        );$old$,
    $new$          nullif(p_dependente ->> 'data_nascimento', '')::date,
          nullif(btrim(p_dependente ->> 'parentesco'), ''),
          nullif(regexp_replace(coalesce(p_dependente ->> 'cpf', ''), '[^0-9]', '', 'g'), '')
        );$new$
  );

  v_updated_definition := replace(
    v_updated_definition,
    $old$            parentesco = nullif(btrim(p_dependente ->> 'parentesco'), ''),
            ativo = true$old$,
    $new$            parentesco = nullif(btrim(p_dependente ->> 'parentesco'), ''),
            cpf = nullif(regexp_replace(coalesce(p_dependente ->> 'cpf', ''), '[^0-9]', '', 'g'), ''),
            ativo = true$new$
  );

  if v_updated_definition = v_definition
    or position($needle$          parentesco
        )$needle$ in v_updated_definition) > 0
    or position($needle$nullif(btrim(p_dependente ->> 'parentesco'), '')
        );$needle$ in v_updated_definition) > 0
    or position($needle$parentesco = nullif(btrim(p_dependente ->> 'parentesco'), ''),
            ativo = true$needle$ in v_updated_definition) > 0 then
    raise exception 'Could not add CPF persistence to rh_salvar_cadastro_pessoal.';
  end if;

  execute v_updated_definition;
end;
$migration$;
