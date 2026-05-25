import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

// TODO: mobile sidebar com Sheet shadcn — implementar quando módulo NR-1 estiver pronto
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen grid md:grid-cols-[240px_1fr] bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}