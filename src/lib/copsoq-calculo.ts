// ===== TIPOS =====

export interface SubescalaConfig {
  id: string;
  codigo: string;
  nome: string;
  tipo: "positivo" | "negativo";
  severidade: "critica" | "moderada" | "leve";
  dimensao_macro: string;
  questao_ids: string[];
}

export interface Resposta {
  respondente_id: string;
  questao_id: string;
  valor: number;
}

export interface ResultadoSubescala {
  subescala_id: string;
  codigo: string;
  nome: string;
  tipo: "positivo" | "negativo";
  severidade: "critica" | "moderada" | "leve";
  dimensao_macro: string;
  media_geral: number;
  total_respondentes: number;
  pct_baixo: number;
  pct_medio: number;
  pct_alto: number;
  pct_risco: number;
  pct_atencao: number;
  pct_favoravel: number;
  probabilidade: "alta" | "media" | "baixa";
  classificacao_pgr: string;
}

// ===== CONSTANTES =====

const CORTE_BAIXO = 2.33;
const CORTE_ALTO = 3.66;

const MATRIZ_PGR: Record<string, Record<string, string>> = {
  alta: { critica: "intoleravel", moderada: "substancial", leve: "moderado" },
  media: { critica: "substancial", moderada: "moderado", leve: "toleravel" },
  baixa: { critica: "moderado", moderada: "toleravel", leve: "trivial" },
};

// ===== FUNÇÕES =====

function mediaRespondente(
  respondente_id: string,
  questao_ids: string[],
  respostas: Resposta[],
): number | null {
  const vals = respostas
    .filter(
      (r) =>
        r.respondente_id === respondente_id &&
        questao_ids.includes(r.questao_id),
    )
    .map((r) => r.valor);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function tercil(media: number): "baixo" | "medio" | "alto" {
  if (media <= CORTE_BAIXO) return "baixo";
  if (media <= CORTE_ALTO) return "medio";
  return "alto";
}

function converterRisco(
  pct_baixo: number,
  pct_medio: number,
  pct_alto: number,
  tipo: "positivo" | "negativo",
): { pct_risco: number; pct_atencao: number; pct_favoravel: number } {
  if (tipo === "negativo") {
    return {
      pct_risco: pct_alto,
      pct_atencao: pct_medio,
      pct_favoravel: pct_baixo,
    };
  }
  return {
    pct_risco: pct_baixo,
    pct_atencao: pct_medio,
    pct_favoravel: pct_alto,
  };
}

function determinarProbabilidade(
  pct_risco: number,
  pct_atencao: number,
  pct_favoravel: number,
): "alta" | "media" | "baixa" {
  if (pct_risco >= pct_atencao && pct_risco >= pct_favoravel) return "alta";
  if (pct_atencao >= pct_risco && pct_atencao >= pct_favoravel) return "media";
  return "baixa";
}

export function calcularCopsoq(
  subescalas: SubescalaConfig[],
  respostas: Resposta[],
  respondente_ids: string[],
): ResultadoSubescala[] {
  return subescalas.map((sub) => {
    const medias: number[] = [];
    for (const rid of respondente_ids) {
      const m = mediaRespondente(rid, sub.questao_ids, respostas);
      if (m !== null) medias.push(m);
    }

    const total = medias.length;
    const media_geral =
      total > 0 ? medias.reduce((a, b) => a + b, 0) / total : 0;

    let n_baixo = 0,
      n_medio = 0,
      n_alto = 0;
    for (const m of medias) {
      const t = tercil(m);
      if (t === "baixo") n_baixo++;
      else if (t === "medio") n_medio++;
      else n_alto++;
    }

    const pct_baixo = total > 0 ? Math.round((n_baixo / total) * 100) : 0;
    const pct_medio = total > 0 ? Math.round((n_medio / total) * 100) : 0;
    const pct_alto = total > 0 ? 100 - pct_baixo - pct_medio : 0;

    const { pct_risco, pct_atencao, pct_favoravel } = converterRisco(
      pct_baixo,
      pct_medio,
      pct_alto,
      sub.tipo,
    );

    const probabilidade = determinarProbabilidade(
      pct_risco,
      pct_atencao,
      pct_favoravel,
    );

    const classificacao_pgr = MATRIZ_PGR[probabilidade][sub.severidade];

    return {
      subescala_id: sub.id,
      codigo: sub.codigo,
      nome: sub.nome,
      tipo: sub.tipo,
      severidade: sub.severidade,
      dimensao_macro: sub.dimensao_macro,
      media_geral: Math.round(media_geral * 100) / 100,
      total_respondentes: total,
      pct_baixo,
      pct_medio,
      pct_alto,
      pct_risco,
      pct_atencao,
      pct_favoravel,
      probabilidade,
      classificacao_pgr,
    };
  });
}

export const PGR_LABELS: Record<string, { label: string; cor: string }> = {
  intoleravel: { label: "Intolerável", cor: "bg-red-600 text-white" },
  substancial: { label: "Substancial", cor: "bg-orange-500 text-white" },
  moderado: { label: "Moderado", cor: "bg-amber-400 text-black" },
  toleravel: { label: "Tolerável", cor: "bg-emerald-500 text-white" },
  trivial: { label: "Trivial", cor: "bg-emerald-700 text-white" },
};

export function agruparPorDimensao(
  resultados: ResultadoSubescala[],
): Record<string, ResultadoSubescala[]> {
  const grupos: Record<string, ResultadoSubescala[]> = {};
  for (const r of resultados) {
    if (!grupos[r.dimensao_macro]) grupos[r.dimensao_macro] = [];
    grupos[r.dimensao_macro].push(r);
  }
  return grupos;
}

export const DIMENSAO_LABELS: Record<string, string> = {
  demandas: "Exigências laborais",
  organizacao: "Organização do trabalho e conteúdo",
  relacoes: "Relações sociais e liderança",
  valores: "Valores no local de trabalho",
  personalidade: "Personalidade",
  interface: "Interface trabalho-indivíduo",
  saude: "Saúde e bem-estar",
  comportamentos: "Comportamentos ofensivos",
};