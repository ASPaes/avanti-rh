import { supabase } from '@/integrations/supabase/client';
import type { QuestionarioPayload, QuestionarioErro, SociodemoResposta } from './types';

export async function iniciarSessao(linkPublico: string, dispositivo: string, userAgent: string | null) {
  const { data, error } = await supabase.rpc('nr1_iniciar_sessao', {
    p_link_publico: linkPublico,
    p_dispositivo: dispositivo,
    p_user_agent: userAgent ?? undefined,
    p_ip: undefined,
  } as never);
  if (error) throw new Error(error.message);
  return data as unknown as QuestionarioPayload | QuestionarioErro;
}

export async function submeterResposta(
  tokenSessao: string,
  setorId: string,
  sociodemo: SociodemoResposta,
  respostas: { questao_id: string; valor: number }[],
  tempoSegundos: number | null,
) {
  const { data, error } = await supabase.rpc('nr1_submeter_resposta', {
    p_token_sessao: tokenSessao,
    p_setor_id: setorId,
    p_sociodemo: sociodemo,
    p_respostas: respostas,
    p_tempo_resposta_segundos: tempoSegundos ?? undefined,
  } as never);
  if (error) throw new Error(error.message);
  return data as unknown as { success?: boolean; respondente_id?: string; error?: string };
}

export function mapearErro(codigo: string): string {
  const map: Record<string, string> = {
    link_invalido: 'Este link não é válido. Confira o endereço.',
    avaliacao_nao_aberta: 'Esta avaliação ainda não foi liberada ou já foi encerrada.',
    avaliacao_expirada: 'O prazo para responder esta avaliação encerrou.',
    limite_atingido: 'Esta avaliação já recebeu todas as respostas previstas. Obrigado!',
    erro_interno_token: 'Não foi possível iniciar agora. Tente novamente em instantes.',
    sessao_invalida: 'Sua sessão expirou. Recarregue a página para começar novamente.',
    sessao_ja_finalizada: 'Esta sessão já foi enviada anteriormente.',
    avaliacao_encerrada: 'Esta avaliação foi encerrada.',
    setor_invalido: 'Setor selecionado inválido. Escolha outro da lista.',
    sociodemo_incompleto: 'Preencha todos os dados solicitados antes de enviar.',
    respostas_incompletas: 'Você não respondeu todas as questões.',
    respostas_invalidas: 'Algumas respostas não foram aceitas. Revise.',
  };
  return map[codigo] || 'Algo deu errado. Tente novamente.';
}