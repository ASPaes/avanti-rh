import { Logo } from "./Logo";

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-[148px] shrink-0 flex-col border-r border-border bg-surface px-4 py-5">
      <Logo size="sm" />
      <p className="mt-8 text-[10px] uppercase tracking-widest text-muted-foreground leading-relaxed">
        Parte 3 — sidebar completa virá aqui
      </p>
    </aside>
  );
}