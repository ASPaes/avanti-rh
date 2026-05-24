import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

function Index() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Logo size="lg" />
      <p className="text-sm text-muted-foreground">Setup carregado.</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="default">Botão primário</Button>
        <Button variant="secondary">Botão secundário</Button>
        <Button variant="outline">Botão contorno</Button>
      </div>
      <div className="mt-6 flex flex-col items-center gap-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">tokens semânticos</p>
        <div className="flex items-center gap-2">
          <span className="bg-success text-success-foreground px-3 py-1 rounded-md text-xs font-medium">success</span>
          <span className="bg-warning text-warning-foreground px-3 py-1 rounded-md text-xs font-medium">warning</span>
          <span className="bg-destructive text-destructive-foreground px-3 py-1 rounded-md text-xs font-medium">destructive</span>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: Index,
});

