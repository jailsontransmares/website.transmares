DO $migration$
DECLARE
  v_definition text;
  v_updated text;
  v_values_old text := $old$          nullif(btrim(v_dependente ->> 'parentesco'), '')
        );$old$;
  v_values_new text := $new$          nullif(btrim(v_dependente ->> 'parentesco'), ''),
          nullif(regexp_replace(coalesce(v_dependente ->> 'cpf', ''), '[^0-9]', '', 'g'), '')
        );$new$;
  v_update_old text := $old$            parentesco = nullif(btrim(v_dependente ->> 'parentesco'), ''),
            ativo = true$old$;
  v_update_new text := $new$            parentesco = nullif(btrim(v_dependente ->> 'parentesco'), ''),
            cpf = nullif(regexp_replace(coalesce(v_dependente ->> 'cpf', ''), '[^0-9]', '', 'g'), ''),
            ativo = true$new$;
BEGIN
  v_definition := pg_get_functiondef('public.rh_salvar_cadastro_pessoal(uuid,jsonb,jsonb,jsonb,jsonb)'::regprocedure);
  IF position(v_values_new in v_definition) > 0 AND position(v_update_new in v_definition) > 0 THEN
    RETURN;
  END IF;
  IF position(v_values_old in v_definition) = 0 OR position(v_update_old in v_definition) = 0 THEN
    RAISE EXCEPTION 'Expected dependent persistence snippets were not found';
  END IF;
  v_updated := replace(v_definition, v_values_old, v_values_new);
  v_updated := replace(v_updated, v_update_old, v_update_new);
  IF position(v_values_new in v_updated) = 0 OR position(v_update_new in v_updated) = 0 THEN
    RAISE EXCEPTION 'Dependent CPF persistence patch did not apply';
  END IF;
  EXECUTE v_updated;
END;
$migration$;