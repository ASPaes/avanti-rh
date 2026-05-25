export type Dispositivo = 'mobile' | 'tablet' | 'desktop' | 'desconhecido';

export interface OpcaoEscala { valor: number; rotulo: string; }
export interface Escala { id: string; nome: string; opcoes: OpcaoEscala[]; }
export interface SociodemoOpcao { valor: string; rotulo: string; free_text?: boolean; }
export interface QuestaoSociodemo {
  id: string; codigo: string; texto: string;
  tipo: 'sociodemo_select' | 'sociodemo_select_outro';
  opcoes: SociodemoOpcao[]; obrigatoria: boolean;
}
export interface QuestaoLikert {
  id: string; numero: number; codigo: string; texto: string; escala_codigo: string;
}
export interface Setor { id: string; nome: string; }
export interface QuestionarioPayload {
  success: true;
  token_sessao: string;
  avaliacao: { id: string; nome: string; empresa_nome: string; empresa_razao_social: string; data_fim: string; };
  setores: Setor[];
  escalas: Record<string, Escala>;
  sociodemo: QuestaoSociodemo[];
  questoes: QuestaoLikert[];
}
export interface QuestionarioErro { error: string; status?: string; data_fim?: string; }
export interface SociodemoResposta {
  sexo?: 'masculino' | 'feminino';
  faixa_etaria?: 'ate_38' | 'acima_38' | 'outro';
  faixa_etaria_outro?: string;
  treinamento_rp?: 'sim_compreendi' | 'nao_recebi' | 'mais_ou_menos';
}
export interface ProgressoSalvo {
  token_sessao: string;
  passo_atual: string;
  setor_id?: string;
  sociodemo: SociodemoResposta;
  respostas: Record<string, number>;
  iniciado_em: number;
}