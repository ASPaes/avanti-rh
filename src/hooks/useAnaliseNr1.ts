import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  calcularCopsoq,
  type SubescalaConfig,
  type Resposta,
  type ResultadoSubescala,
} from "@/lib/copsoq-calculo";

export function useAnaliseNr1(
  avaliacaoId: string | undefined,
  modeloInstrumentoId: string | undefined,
) {
  return useQuery<ResultadoSubescala[]>({
    queryKey: ["nr1-analise", avaliacaoId],
    queryFn: async () => {
      if (!avaliacaoId || !modeloInstrumentoId) return [];

      const { data: subescalasRaw, error: e1 } = await supabase
        .from("nr1_modelo_subescala")
        .select(
          "id, codigo, nome, tipo, severidade, dimensao_macro, nr1_modelo_subescala_questao(questao_id)",
        )
        .eq("modelo_id", modeloInstrumentoId)
        .order("ordem");
      if (e1) throw e1;

      const subescalas: SubescalaConfig[] = (subescalasRaw ?? []).map(
        (s: {
          id: string;
          codigo: string;
          nome: string;
          tipo: string;
          severidade: string;
          dimensao_macro: string;
          nr1_modelo_subescala_questao: { questao_id: string }[] | null;
        }) => ({
          id: s.id,
          codigo: s.codigo,
          nome: s.nome,
          tipo: s.tipo as "positivo" | "negativo",
          severidade: s.severidade as "critica" | "moderada" | "leve",
          dimensao_macro: s.dimensao_macro,
          questao_ids: (s.nr1_modelo_subescala_questao ?? []).map(
            (q) => q.questao_id,
          ),
        }),
      );

      const { data: respondentes, error: e2 } = await supabase
        .from("nr1_respondente_anonimo")
        .select("id")
        .eq("avaliacao_id", avaliacaoId);
      if (e2) throw e2;

      const respondente_ids = (respondentes ?? []).map((r) => r.id);
      if (respondente_ids.length === 0) return [];

      const { data: respostasRaw, error: e3 } = await supabase
        .from("nr1_resposta")
        .select("respondente_id, questao_id, valor")
        .in("respondente_id", respondente_ids);
      if (e3) throw e3;

      const respostas: Resposta[] = (respostasRaw ?? []).map((r) => ({
        respondente_id: r.respondente_id,
        questao_id: r.questao_id,
        valor: r.valor,
      }));

      return calcularCopsoq(subescalas, respostas, respondente_ids);
    },
    enabled: !!avaliacaoId && !!modeloInstrumentoId,
  });
}