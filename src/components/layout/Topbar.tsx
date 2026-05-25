import { Link, useMatches, useRouterState } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Fragment } from "react";

const MODULE_PREFIXES = ["/nr1", "/rec", "/fin", "/pgr"];

export function Topbar() {
  const matches = useMatches();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const crumbs = matches
    .filter(
      (m): m is typeof m & { staticData: { crumb: string } } =>
        !!(m.staticData as { crumb?: string } | undefined)?.crumb,
    )
    .map((m) => ({ pathname: m.pathname, crumb: m.staticData.crumb }));

  const isModuleRoute = MODULE_PREFIXES.some((p) => pathname.startsWith(p));

  return (
    <header className="sticky top-0 z-40 h-14 px-6 bg-background border-b border-border flex items-center gap-4">
      <nav aria-label="Trilha de navegação" className="flex-1 flex items-center min-w-0">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <Fragment key={c.pathname}>
              {i > 0 && (
                <span className="font-mono text-[11px] text-muted-foreground/40 mx-1">
                  /
                </span>
              )}
              {isLast ? (
                <span className="text-[12px] text-foreground font-medium">
                  {c.crumb}
                </span>
              ) : (
                <Link
                  to={c.pathname}
                  className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {c.crumb}
                </Link>
              )}
            </Fragment>
          );
        })}
      </nav>

      {isModuleRoute && (
        <button
          disabled
          // TODO: vincular a tabela nr1_ciclos quando criar Chunk 4 do backend
          className="hidden md:inline-flex items-center gap-2 h-8 px-3 border border-border rounded-sm font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
        >
          ciclo · 2026-Q2
          <ChevronDown size={12} />
        </button>
      )}

      <ThemeToggle />
    </header>
  );
}