import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole, Profile } from "@/types/auth";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  tenantId: string | null;
  selectedTenantId: string | null;
  setSelectedTenant: (id: string | null) => void;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    nomeCompleto: string,
  ) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapAuthError(message: string | undefined): string {
  if (!message) return "Algo deu errado. Tente novamente.";
  const m = message.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials"))
    return "Email ou senha incorretos.";
  if (m.includes("already registered") || m.includes("user already"))
    return "Este email já está cadastrado.";
  if (m.includes("weak") || m.includes("password should"))
    return "Senha muito fraca. Use ao menos 6 caracteres.";
  if (m.includes("email not confirmed"))
    return "Confirme seu email antes de entrar.";
  if (m.includes("rate limit"))
    return "Muitas tentativas. Aguarde alguns instantes.";
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [selectedTenantId, setSelectedTenantIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const currentUserId = useRef<string | null>(null);

  const loadProfileAndRoles = useCallback(async (uid: string) => {
    const [profileRes, rolesRes] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, tenant_id, email, nome_completo, telefone, registro_profissional",
        )
        .eq("id", uid)
        .maybeSingle(),
      supabase
        .from("user_roles")
        .select("role, tenant_id")
        .eq("user_id", uid),
    ]);

    if (profileRes.error) {
      console.error("[Auth] profile fetch error", profileRes.error);
    }
    if (rolesRes.error) {
      console.error("[Auth] roles fetch error", rolesRes.error);
    }

    const nextProfile = (profileRes.data as Profile | null) ?? null;
    const nextRoles = (rolesRes.data ?? []).map((r) => r.role as AppRole);
    setProfile(nextProfile);
    setRoles(nextRoles);
    setTenantId(nextProfile?.tenant_id ?? null);
  }, []);

  const applySession = useCallback(
    async (session: Session | null) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      currentUserId.current = nextUser?.id ?? null;
      if (nextUser) {
        await loadProfileAndRoles(nextUser.id);
      } else {
        setProfile(null);
        setRoles([]);
        setTenantId(null);
      }
    },
    [loadProfileAndRoles],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    let mounted = true;

    try {
      const stored = window.localStorage.getItem("avanti.tenant_selected");
      if (stored) setSelectedTenantIdState(stored);
    } catch {
      /* ignore */
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      // Defer heavy work to avoid deadlocks inside the listener
      setTimeout(() => {
        if (!mounted) return;
        void applySession(session);
      }, 0);
    });

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      await applySession(data.session);
      if (mounted) setLoading(false);
    })();

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [applySession]);

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: mapAuthError(error.message) };
    return {};
  };

  const signUp: AuthContextValue["signUp"] = async (
    email,
    password,
    nomeCompleto,
  ) => {
    const redirectTo =
      typeof window !== "undefined" ? window.location.origin : undefined;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome_completo: nomeCompleto },
        emailRedirectTo: redirectTo,
      },
    });
    if (error) return { error: mapAuthError(error.message) };
    return {};
  };

  const signOut = async () => {
    try {
      window.localStorage.removeItem("avanti.tenant_selected");
    } catch {
      /* ignore */
    }
    setSelectedTenantIdState(null);
    await supabase.auth.signOut();
  };

  const setSelectedTenant = (id: string | null) => {
    try {
      if (id) window.localStorage.setItem("avanti.tenant_selected", id);
      else window.localStorage.removeItem("avanti.tenant_selected");
    } catch {
      /* ignore */
    }
    setSelectedTenantIdState(id);
  };

  const refreshProfile = async () => {
    if (currentUserId.current) {
      await loadProfileAndRoles(currentUserId.current);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        roles,
        tenantId,
        selectedTenantId,
        setSelectedTenant,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}