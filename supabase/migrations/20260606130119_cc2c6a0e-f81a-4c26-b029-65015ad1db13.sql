
-- Revoke execute from PUBLIC on all security-definer / app functions
REVOKE EXECUTE ON FUNCTION public.nr1_iniciar_sessao(text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.nr1_submeter_resposta(text, uuid, jsonb, jsonb, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.nr1_resultado_avaliacao(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.nr1_adesao_avaliacao(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.nr1_importar_respostas(uuid, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_gerar_token_curto(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_nr1_avaliacao_ativar() FROM PUBLIC;

-- Public responder flow needs anon + authenticated
GRANT EXECUTE ON FUNCTION public.nr1_iniciar_sessao(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nr1_submeter_resposta(text, uuid, jsonb, jsonb, integer) TO anon, authenticated;

-- Authenticated-only RPCs
GRANT EXECUTE ON FUNCTION public.nr1_resultado_avaliacao(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nr1_adesao_avaliacao(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nr1_importar_respostas(uuid, jsonb) TO authenticated;
