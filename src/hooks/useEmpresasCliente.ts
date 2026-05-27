import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "./useTenant";

export interface EmpresaCliente {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  cnae: string | null;
  grau_risco: number | null;
  endereco_cidade: string | null;
  endereco_uf: string | null;
  contato_responsavel: string | null;
  contato_email: string | null;
  qtd_colaboradores_estimado: number | null;
  status: string;
  created_at: string;
}

export function useEmpresasCliente() {
  const { tenantId } = useTenant();

  return useQuery<EmpresaCliente[]>({
    queryKey: ["empresas-cliente", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas_cliente")
        .select(
          "id, razao_social, nome_fantasia, cnpj, cnae, grau_risco, endereco_cidade, endereco_uf, contato_responsavel, contato_email, qtd_colaboradores_estimado, status, created_at",
        )
        .eq("tenant_id", tenantId!)
        .is("deleted_at", null)
        .order("razao_social");
      if (error) throw error;
      return (data ?? []) as EmpresaCliente[];
    },
    enabled: !!tenantId,
  });
}