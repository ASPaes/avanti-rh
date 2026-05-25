import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";

function LoginPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  // Sign in form
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [siError, setSiError] = useState<string | null>(null);
  const [siSubmitting, setSiSubmitting] = useState(false);

  // Sign up form
  const [suNome, setSuNome] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suError, setSuError] = useState<string | null>(null);
  const [suSubmitting, setSuSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/_auth/dashboard" as never });
    }
  }, [loading, user, navigate]);

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setSiError(null);
    setSiSubmitting(true);
    const { error } = await signIn(siEmail.trim(), siPassword);
    setSiSubmitting(false);
    if (error) {
      setSiError(error);
      toast.error(error);
      return;
    }
    toast.success("Bem-vindo de volta.");
    navigate({ to: "/_auth/dashboard" as never });
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setSuError(null);
    if (suPassword.length < 6) {
      const msg = "A senha precisa ter ao menos 6 caracteres.";
      setSuError(msg);
      toast.error(msg);
      return;
    }
    if (!suNome.trim()) {
      const msg = "Informe seu nome completo.";
      setSuError(msg);
      toast.error(msg);
      return;
    }
    setSuSubmitting(true);
    const { error } = await signUp(suEmail.trim(), suPassword, suNome.trim());
    setSuSubmitting(false);
    if (error) {
      setSuError(error);
      toast.error(error);
      return;
    }
    toast.success("Conta criada. Verifique seu email.");
    setSuNome("");
    setSuEmail("");
    setSuPassword("");
    setTab("signin");
  };

  return (
    <div className="grid min-h-screen md:grid-cols-[3fr_2fr] bg-background text-foreground">
      {/* Left column */}
      <div className="relative flex flex-col px-6 py-10 md:px-16">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>

        <div className="mb-12">
          <Logo size="md" />
        </div>

        <div className="flex flex-1 items-center">
          <div className="w-full max-w-sm">
            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as "signin" | "signup")}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-6">
                <form className="flex flex-col gap-4" onSubmit={handleSignIn}>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="si-email">Email</Label>
                    <Input
                      id="si-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={siEmail}
                      onChange={(e) => setSiEmail(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="si-password">Senha</Label>
                    <Input
                      id="si-password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={siPassword}
                      onChange={(e) => setSiPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={siSubmitting}>
                    {siSubmitting ? "Entrando..." : "Entrar"}
                  </Button>
                  {siError && (
                    <p className="text-xs text-destructive">{siError}</p>
                  )}
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <form className="flex flex-col gap-4" onSubmit={handleSignUp}>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="su-nome">Nome completo</Label>
                    <Input
                      id="su-nome"
                      type="text"
                      autoComplete="name"
                      required
                      value={suNome}
                      onChange={(e) => setSuNome(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="su-email">Email</Label>
                    <Input
                      id="su-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={suEmail}
                      onChange={(e) => setSuEmail(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="su-password">Senha</Label>
                    <Input
                      id="su-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={6}
                      value={suPassword}
                      onChange={(e) => setSuPassword(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Mínimo 6 caracteres.
                    </p>
                  </div>
                  <Button type="submit" disabled={suSubmitting}>
                    {suSubmitting ? "Criando..." : "Criar conta"}
                  </Button>
                  {suError && (
                    <p className="text-xs text-destructive">{suError}</p>
                  )}
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div>
          <Link
            to="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← voltar
          </Link>
        </div>
      </div>

      {/* Right column */}
      <aside className="hidden md:flex items-center justify-center bg-surface px-10">
        <div className="max-w-[320px]">
          <p className="italic font-normal text-xl leading-[1.5] text-foreground">
            “A saúde mental no trabalho deixou de ser uma agenda de bem-estar
            para se tornar uma questão de gestão de risco.”
          </p>
          <div className="mt-6 h-px w-[60px] bg-border" />
          <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            NR-1 Atualizada · 26.05.2025
          </p>
        </div>
      </aside>
    </div>
  );
}

export const Route = createFileRoute("/login")({
  component: LoginPage,
});