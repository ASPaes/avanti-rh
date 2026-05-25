import { createFileRoute } from "@tanstack/react-router";

function Perfil() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">Meu perfil</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Página em construção.
      </p>
    </div>
  );
}

export const Route = createFileRoute("/_auth/perfil")({
  component: Perfil,
  staticData: { crumb: "Meu perfil" },
});