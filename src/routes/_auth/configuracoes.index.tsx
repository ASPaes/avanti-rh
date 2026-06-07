import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BookText, Settings, Sparkles, UserCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";

function ConfiguracoesIndex() {
  const { roles, loading } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = roles.includes("super_admin");
  const isTenantAdmin = roles.includes("tenant_admin");
  const podeVer = isSuperAdmin || isTenantAdmin;

  useEffect(() => {
    if (!loading && !podeVer) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, podeVer, navigate]);

  if (!podeVer) return null;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8 flex items-start gap-3">
        <div className="mt-1 text-muted-foreground">
          <Settings size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajustes do sistema disponíveis apenas para super admin.
          </p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {isSuperAdmin && (
        <Link
          to="/configuracoes/catalogo-subescalas"
          className="group"
        >
          <Card className="p-5 transition-colors hover:border-primary/60 hover:bg-accent/5 h-full">
            <div className="flex items-start gap-3">
              <div className="rounded-sm bg-primary/10 p-2 text-primary">
                <BookText size={18} />
              </div>
              <div className="min-w-0">
                <h2 className="text-[15px] font-medium text-foreground">
                  Catálogo de subescalas
                </h2>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Textos de significado, agravos e ações por subescala usados nos relatórios de NR-1.
                </p>
              </div>
            </div>
          </Card>
        </Link>
        )}

        <Link to="/configuracoes/ia" className="group">
          <Card className="p-5 transition-colors hover:border-primary/60 hover:bg-accent/5 h-full">
            <div className="flex items-start gap-3">
              <div className="rounded-sm bg-primary/10 p-2 text-primary">
                <Sparkles size={18} />
              </div>
              <div className="min-w-0">
                <h2 className="text-[15px] font-medium text-foreground">
                  Configurações de IA
                </h2>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Provedor, modelo e chave de API usados pelos recursos de inteligência artificial.
                </p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_auth/configuracoes/")({
  component: ConfiguracoesIndex,
});