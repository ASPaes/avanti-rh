import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "./useTenant";

export interface ModuloAtivo {
  codigo: string;
  nome: string;
  ativo: boolean;
}

export function useModulosAtivos() {
  const { tenantId } = useTenant();

  return useQuery<ModuloAtivo[]>({
    queryKey: ["modulos-ativos", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_modulos")
        .select("modulos!inner(codigo, nome, ativo)")
        .eq("tenant_id", tenantId!)
        .is("data_fim", null)
        .eq("modulos.ativo", true);
      if (error) throw error;
      return (data ?? []).map((r: { modulos: ModuloAtivo }) => r.modulos);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!tenantId,
  });
}