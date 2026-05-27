import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ChevronUp,
  ClipboardList,
  LayoutGrid,
  ShieldAlert,
  Users,
  Wallet,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Logo } from "./Logo";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useTenantsDisponiveis } from "@/hooks/useTenantsDisponiveis";
import { useModulosAtivos } from "@/hooks/useModulosAtivos";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ModuloMeta {
  icone: LucideIcon;
  label: string;
  path: string;
}

const MODULO_CATALOGO: Record<string, ModuloMeta> = {
  nr1: { icone: ShieldAlert, label: "NR-1 / Psicossociais", path: "/nr1" },
  rec: { icone: Users, label: "Recrutamento", path: "/rec" },
  fin: { icone: Wallet, label: "Financeiro", path: "/fin" },
  pgr: { icone: ClipboardList, label: "PGR", path: "/pgr" },
};

const navItemBase =
  "flex items-center gap-3 px-3 py-2 rounded-sm text-[13px] transition-colors";
const navItemInactive =
  "text-muted-foreground hover:bg-accent/10 hover:text-foreground";
const navItemActive =
  "bg-accent/20 text-foreground border-l-2 border-primary -ml-px";

function NavLinkItem({
  to,
  icon: Icon,
  label,
  active,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(navItemBase, active ? navItemActive : navItemInactive)}
    >
      <Icon size={16} />
      <span>{label}</span>
    </Link>
  );
}

function NavDisabledItem({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <div
      className={cn(
        navItemBase,
        "text-muted-foreground opacity-50 cursor-not-allowed justify-between",
      )}
    >
      <span className="flex items-center gap-3">
        <Icon size={16} />
        <span>{label}</span>
      </span>
      <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border border-border rounded-sm text-muted-foreground">
        em breve
      </span>
    </div>
  );
}

export function Sidebar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { profile, signOut, roles, selectedTenantId } = useAuth();
  const { tenantId, setSelectedTenant } = useTenant();
  const { data: tenants = [] } = useTenantsDisponiveis();
  const { data: modulos = [] } = useModulosAtivos();

  const isOwner = roles.includes("owner");

  useEffect(() => {
    // Auto-seleciona o único tenant disponível pra owners que ainda não escolheram.
    if (isOwner && !selectedTenantId && tenants.length === 1) {
      setSelectedTenant(tenants[0].id);
    }
  }, [isOwner, selectedTenantId, tenants, setSelectedTenant]);

  const contratados = new Set(modulos.map((m) => m.codigo));
  const naoContratados = Object.keys(MODULO_CATALOGO).filter(
    (codigo) => !contratados.has(codigo),
  );

  const handleTenantChange = (id: string) => {
    setSelectedTenant(id);
    queryClient.invalidateQueries({ queryKey: ["modulos-ativos"] });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  const userInitial =
    profile?.nome_completo?.trim().charAt(0).toUpperCase() ||
    profile?.email?.trim().charAt(0).toUpperCase() ||
    "?";

  return (
    <aside
      aria-label="Navegação principal"
      className="hidden md:flex w-60 flex-col border-r border-border bg-surface h-screen sticky top-0"
    >
      {/* Header */}
      <div className="h-16 px-6 flex items-center border-b border-border">
        <Logo size="md" />
      </div>

      {/* Tenant selector */}
      <div className="px-4 py-4 border-b border-border">
        <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-muted-foreground mb-2 block">
          tenant
        </span>
        {tenants.length <= 1 ? (
          <div className="h-9 flex items-center px-3 text-[13px] font-medium text-foreground border border-border rounded-sm bg-transparent">
            {tenants[0]?.nome_fantasia ?? "—"}
          </div>
        ) : (
          <Select
            value={tenantId ?? undefined}
            onValueChange={handleTenantChange}
          >
            <SelectTrigger
              aria-label="Trocar tenant"
              className="bg-transparent border-border h-9 text-[13px] font-medium"
            >
              <SelectValue placeholder="Selecionar tenant" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-[13px]">
                  {t.nome_fantasia}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto flex flex-col gap-1">
        <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-muted-foreground mb-2 ml-3 block">
          navegação
        </span>

        <NavLinkItem
          to="/dashboard"
          icon={LayoutGrid}
          label="Dashboard"
          active={isActive("/dashboard")}
        />

        <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-muted-foreground mt-4 mb-2 ml-3 block">
          cadastros
        </span>

        <NavLinkItem
          to="/empresas"
          icon={Building2}
          label="Empresas-cliente"
          active={isActive("/empresas")}
        />

        <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-muted-foreground mt-4 mb-2 ml-3 block">
          módulos
        </span>

        {modulos.length === 0 && tenantId && (
          <p className="px-3 text-[12px] text-muted-foreground">
            Sem módulos contratados
          </p>
        )}

        {modulos.map((m) => {
          const meta = MODULO_CATALOGO[m.codigo];
          if (!meta) return null;
          return (
            <NavLinkItem
              key={m.codigo}
              to={meta.path}
              icon={meta.icone}
              label={meta.label}
              active={isActive(meta.path)}
            />
          );
        })}

        {naoContratados.map((codigo) => {
          const meta = MODULO_CATALOGO[codigo];
          return (
            <NavDisabledItem
              key={codigo}
              icon={meta.icone}
              label={meta.label}
            />
          );
        })}
      </nav>

      {/* Footer user */}
      <div className="px-3 py-3 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Menu do usuário"
            className="flex items-center gap-3 w-full px-2 py-2 rounded-sm hover:bg-accent/10 transition-colors outline-none"
          >
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-[12px]">{userInitial}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[13px] font-medium text-foreground truncate">
                {profile?.nome_completo ?? "—"}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {profile?.email ?? ""}
              </p>
            </div>
            <ChevronUp size={14} className="text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-52">
            <DropdownMenuItem asChild>
              <Link to="/perfil">Meu perfil</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}