import { useAuth } from "./useAuth";

export function useTenant() {
  const { tenantId, profile } = useAuth();
  return { tenantId, profile };
}