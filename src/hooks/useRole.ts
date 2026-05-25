import { useAuth } from "./useAuth";
import type { AppRole } from "@/types/auth";

const ROLE_HIERARCHY: Record<AppRole, number> = {
  owner: 1,
  tenant_admin: 2,
  tenant_manager: 3,
  rt_psicologo: 4,
  operador: 5,
  respondente: 6,
};

export function useRole() {
  const { roles, tenantId } = useAuth();

  const hasRole = (role: AppRole, scopedTenantId?: string): boolean => {
    if (roles.includes("owner")) return true;
    return roles.includes(role) && (!scopedTenantId || tenantId === scopedTenantId);
  };

  const hasRoleAtLeast = (minRole: AppRole): boolean => {
    const minLevel = ROLE_HIERARCHY[minRole];
    return roles.some((r) => ROLE_HIERARCHY[r] <= minLevel);
  };

  return { hasRole, hasRoleAtLeast, roles };
}