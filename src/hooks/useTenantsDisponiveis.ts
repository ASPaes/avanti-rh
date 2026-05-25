import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useTenant } from "./useTenant";

export interface TenantOption {
  id: string;
  slug: string;
  nome_fantasia: string;
}

export function useTenantsDisponiveis() {
  const { roles, user } = useAuth();
  const { tenantId } = useTenant();
  const isOwner = roles.includes("owner");

  return useQuery<TenantOption[]>({
    queryKey: ["tenants-disponiveis", isOwner, tenantId],
    queryFn: async () => {
      if (isOwner) {
        const { data, error } = await supabase
          .from("tenants")
          .select("id, slug, nome_fantasia")
          .in("status", ["active", "trial"])
          .is("deleted_at", null)
          .order("nome_fantasia");
        if (error) throw error;
        return data ?? [];
      }
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("tenants")
        .select("id, slug, nome_fantasia")
        .eq("id", tenantId)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data ? [data] : [];
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!user,
  });
}