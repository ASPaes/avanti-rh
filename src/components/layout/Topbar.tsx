import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";

export function Topbar() {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <header className="flex h-12 items-center justify-between border-b border-border px-4">
      <div className="text-xs text-muted-foreground tracking-wide">
        / nr-1 / painel
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden sm:inline text-xs text-muted-foreground">
          {profile?.email}
        </span>
        <ThemeToggle />
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          Sair
        </Button>
      </div>
    </header>
  );
}