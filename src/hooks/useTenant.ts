import { useAuth } from "./useAuth";

export function useTenant() {
  const { tenantId, selectedTenantId, setSelectedTenant, profile } = useAuth();
  const effective = selectedTenantId ?? tenantId;
  return {
    tenantId: effective,
    rawTenantId: tenantId,
    selectedTenantId,
    setSelectedTenant,
    profile,
  };
}