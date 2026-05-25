import { createFileRoute } from "@tanstack/react-router";

function ModuloNr1() {
  return (
    <div className="mx-auto max-w-4xl">
      <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
        módulo
      </span>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        NR-1 / Riscos Psicossociais
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Shell do módulo em construção. Próximo passo: empresas-cliente, GHEs,
        instrumento e ciclos de avaliação.
      </p>
    </div>
  );
}

export const Route = createFileRoute("/_auth/nr1")({
  component: ModuloNr1,
  staticData: { crumb: "NR-1 / Psicossociais" },
});