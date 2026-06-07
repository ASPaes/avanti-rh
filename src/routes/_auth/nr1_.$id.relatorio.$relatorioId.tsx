import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

function RelatorioVisualizarPage() {
  const { id: avaliacaoId, relatorioId } = Route.useParams();

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <Link
        to="/nr1/$id/relatorio"
        params={{ id: avaliacaoId }}
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Voltar para versões
      </Link>

      <header className="space-y-2">
        <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
          relatório nr-1
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Visualizador de relatório
        </h1>
        <p className="text-sm text-muted-foreground">
          Versão {relatorioId.slice(0, 8)}… — em construção.
        </p>
      </header>

      <div className="bg-surface border border-border rounded-md p-8 text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          O visualizador de relatório está em desenvolvimento.
        </p>
        <Button asChild variant="outline">
          <Link
            to="/nr1/$id/relatorio"
            params={{ id: avaliacaoId }}
          >
            Voltar para versões
          </Link>
        </Button>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_auth/nr1_/$id/relatorio/$relatorioId")({
  component: RelatorioVisualizarPage,
  staticData: { crumb: "Visualizar" },
});
