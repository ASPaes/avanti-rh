export type AppRole =
  | "owner"
  | "tenant_admin"
  | "tenant_manager"
  | "rt_psicologo"
  | "operador"
  | "respondente";

export interface Profile {
  id: string;
  tenant_id: string | null;
  email: string;
  nome_completo: string;
  telefone: string | null;
  registro_profissional: string | null;
}

export interface UserRoleRow {
  role: AppRole;
  tenant_id: string | null;
}