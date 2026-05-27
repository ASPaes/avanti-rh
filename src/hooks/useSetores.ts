import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Setor {
  id: string;
  nome: string;
  descricao: string | null;
  qtd_colaboradores_estimado: number | null;
  ordem: number;
  ativo: boolean;
}

export function useSetores(empresaClienteId: string | undefined) {
  return useQuery<Setor[]>({
    queryKey: ["setores", empresaClienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("setores")
        .select("id, nome, descricao, qtd_colaboradores_estimado, ordem, ativo")
        .eq("empresa_cliente_id", empresaClienteId!)
        .order("ordem")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as Setor[];
    },
    enabled: !!empresaClienteId,
  });
}