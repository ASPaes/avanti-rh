import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "./useTenant";

export interface AvaliacaoNr1 {
  id: string;
  nome: string;
  status: string;
  link_publico: string | null;
  limite_respostas: number;
  respostas_completadas: number;
  data_inicio: string;
  data_fim: string | null;
  created_at: string;
  permitir_amostra_reduzida: boolean;
  empresa_cliente_id: string;
  empresas_cliente: { id: string; razao_social: string; nome_fantasia: string | null };
  modelo_instrumento_id: string;
  nr1_modelo_instrumento: { id: string; nome: string };
}

export function useAvaliacoesNr1() {
  const { tenantId } = useTenant();

  return useQuery<AvaliacaoNr1[]>({
    queryKey: ["nr1-avaliacoes", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nr1_avaliacao")
        .select(
          "id, nome, status, link_publico, limite_respostas, respostas_completadas, data_inicio, data_fim, created_at, permitir_amostra_reduzida, empresa_cliente_id, empresas_cliente(id, razao_social, nome_fantasia), modelo_instrumento_id, nr1_modelo_instrumento(id, nome)",
        )
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AvaliacaoNr1[];
    },
    enabled: !!tenantId,
  });
}