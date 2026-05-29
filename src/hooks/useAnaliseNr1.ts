import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ResultadoSubescala } from "@/lib/copsoq-calculo";

export type AnaliseNr1Result = {
  bloqueado: boolean;
  total_respondentes: number;
  motivo?: string;
  minimo?: number;
  resultados: ResultadoSubescala[];
};

export function useAnaliseNr1(
  avaliacaoId: string | undefined,
  modeloInstrumentoId: string | undefined,
) {
  return useQuery<AnaliseNr1Result>({
    queryKey: ["nr1-analise", avaliacaoId],
    queryFn: async () => {
      if (!avaliacaoId) {
        return { bloqueado: false, total_respondentes: 0, resultados: [] };
      }

      const { data, error } = await supabase.rpc("nr1_resultado_avaliacao", {
        p_avaliacao_id: avaliacaoId,
      });
      if (error) throw error;

      const payload = data as {
        error?: string;
        bloqueado?: boolean;
        total_respondentes?: number;
        motivo?: string;
        minimo?: number;
        resultados?: ResultadoSubescala[];
      } | null;

      if (!payload || payload.error) {
        throw new Error(payload?.error ?? "erro_desconhecido");
      }

      return {
        bloqueado: !!payload.bloqueado,
        total_respondentes: payload.total_respondentes ?? 0,
        motivo: payload.motivo,
        minimo: payload.minimo,
        resultados: payload.resultados ?? [],
      };
    },
    enabled: !!avaliacaoId,
  });
}