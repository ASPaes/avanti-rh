ALTER TABLE public.nr1_avaliacao DROP CONSTRAINT IF EXISTS chk_amostra_reduzida;

CREATE OR REPLACE FUNCTION public.nr1_definir_amostra_reduzida(
  p_avaliacao_id uuid, p_permitir boolean, p_justificativa text DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'public','auth_helpers'
AS $function$
declare v_tenant uuid; v_uid uuid := (select auth.uid());
begin
  select tenant_id into v_tenant from nr1_avaliacao where id = p_avaliacao_id;
  if v_tenant is null then return jsonb_build_object('error','avaliacao_inexistente'); end if;
  if not (auth_helpers.has_role(v_uid,'owner',null)
          or v_tenant = auth_helpers.current_tenant_id()) then
    return jsonb_build_object('error','nao_autorizado');
  end if;
  if p_permitir then
    update nr1_avaliacao set permitir_amostra_reduzida=true,
      amostra_reduzida_justificativa=nullif(btrim(coalesce(p_justificativa,'')),''),
      amostra_reduzida_por=v_uid, amostra_reduzida_em=now()
    where id=p_avaliacao_id;
  else
    update nr1_avaliacao set permitir_amostra_reduzida=false where id=p_avaliacao_id;
  end if;
  insert into audit_log (tenant_id, user_id, acao, recurso, recurso_id, payload)
  values (v_tenant, v_uid,
    case when p_permitir then 'nr1_amostra_reduzida_ativada' else 'nr1_amostra_reduzida_desativada' end,
    'nr1_avaliacao', p_avaliacao_id,
    jsonb_build_object('justificativa', case when p_permitir then nullif(btrim(coalesce(p_justificativa,'')),'') end));
  return jsonb_build_object('ok',true,'permitir_amostra_reduzida',p_permitir);
end $function$;