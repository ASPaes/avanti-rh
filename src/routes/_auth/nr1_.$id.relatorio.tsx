import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileText,
  Loader2,
  Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface VersaoRelatorio {
  id: string;
  versao: number;
  status: string;
  gerado_em: string;
  observacoes: string | null;
}

interface AvaliacaoResumo {
  id: string;
  nome: string;
  empresa_cliente_id: string;
  tenant_id: string;
  empresas_cliente: { razao_social: string; nome_fantasia: string | null } | null;
}

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  emitido: "Emitido",
  cancelado: "Cancelado",
};

function formatDate(d: string | null): string {
  if (!d) return "—";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return d;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function RelatorioListPage() {
  const { id: avaliacaoId } = Route.useParams();
  const [carregando, setCarregando] = useState(true);
  const [avaliacao, setAvaliacao] = useState<AvaliacaoResumo | null>(null);
  const [versoes, setVersoes] = useState<VersaoRelatorio[]>([]);
  const [gerando, setGerando] = useState(false);
  const [alertaRiscos, setAlertaRiscos] = useState<{ subescala_id: string; nome: string; classificacao_pgr: string }[] | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      setCarregando(true);
      try {
        const { data: av, error: errAv } = await supabase
          .from("nr1_avaliacao")
          .select(
            "id, nome, empresa_cliente_id, tenant_id, empresas_cliente(razao_social, nome_fantasia)",
          )
          .eq("id", avaliacaoId)
          .maybeSingle();
        if (errAv) throw errAv;
        if (!cancelado) setAvaliacao((av as unknown as AvaliacaoResumo) ?? null);

        const { data: vers, error: errVers } = await supabase
          .from("nr1_relatorio")
          .select("id, versao, status, gerado_em, observacoes")
          .eq("avaliacao_id", avaliacaoId)
          .order("versao", { ascending: false });
        if (errVers) throw errVers;
        if (!cancelado) setVersoes((vers ?? []) as unknown as VersaoRelatorio[]);
      } catch (e) {
        if (!cancelado) {
          toast.error("Erro ao carregar versões do relatório.", {
            description: e instanceof Error ? e.message : "Tente novamente.",
          });
        }
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }
    carregar();
    return () => { cancelado = true; };
  }, [avaliacaoId]);

  async function handleGerar() {
    setGerando(true);
    try {
      const { data, error } = await supabase.rpc("nr1_gerar_relatorio", {
        p_avaliacao_id: avaliacaoId,
      });
      if (error) throw error;

      const payload = data as {
        versao?: number;
        riscos_sem_acao?: { subescala_id: string; nome: string; classificacao_pgr: string }[];
        error?: string;
      } | null;

      if (payload?.error) {
        if (payload.error === "n_insuficiente") {
          toast.error("Mínimo de 5 respondentes para gerar o laudo (LGPD).");
        } else {
          toast.error("Não foi possível gerar o relatório.");
        }
        return;
      }

      if (payload?.versao) {
        toast.success(`Versão ${payload.versao} gerada.`);
      }

      if (payload?.riscos_sem_acao && payload.riscos_sem_acao.length > 0) {
        setAlertaRiscos(payload.riscos_sem_acao);
      } else {
        setAlertaRiscos(null);
      }

      // Recarrega lista
      const { data: vers, error: errVers } = await supabase
        .from("nr1_relatorio")
        .select("id, versao, status, gerado_em, observacoes")
        .eq("avaliacao_id", avaliacaoId)
        .order("versao", { ascending: false });
      if (errVers) throw errVers;
      setVersoes((vers ?? []) as unknown as VersaoRelatorio[]);
    } catch (e) {
      toast.error("Erro ao gerar relatório.", {
        description: e instanceof Error ? e.message : "Tente novamente.",
      });
    } finally {
      setGerando(false);
    }
  }

  if (carregando) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <Link
        to="/nr1/$id"
        params={{ id: avaliacaoId }}
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Voltar para a avaliação
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
            relatório nr-1
          </p>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {avaliacao?.nome ?? "Avaliação"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {avaliacao?.empresas_cliente?.razao_social ?? "—"}
          </p>
        </div>

        <Button
          onClick={handleGerar}
          disabled={gerando}
          className="bg-[#234A6E] hover:bg-[#1a3a58] text-white"
        >
          {gerando && <Loader2 className="animate-spin mr-1.5" size={16} />}
          <Plus size={16} className="mr-1.5" />
          Gerar nova versão (rascunho)
        </Button>
      </header>

      {alertaRiscos && alertaRiscos.length > 0 && (
        <Alert className="border-amber-400 bg-amber-50/50">
          <AlertDescription className="text-[13px] text-amber-900">
            Riscos prioritários sem ação no plano: {alertaRiscos.map((r) => r.nome).join(", ")}. Trate-os antes de emitir.
          </AlertDescription>
        </Alert>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Versões</h2>

        {versoes.length === 0 ? (
          <div className="bg-surface border border-border rounded-md p-8 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Nenhuma versão gerada ainda.
            </p>
            <p className="text-[12px] text-muted-foreground">
              Clique em "Gerar nova versão" para criar o primeiro rascunho.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {versoes.map((v) => (
              <Card key={v.id} className="border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <FileText size={18} className="text-[#234A6E]" />
                      <CardTitle className="text-base font-semibold tracking-tight">
                        Versão {v.versao}
                      </CardTitle>
                      <Badge
                        variant={v.status === "rascunho" ? "secondary" : "default"}
                        className={
                          v.status === "emitido"
                            ? "bg-[#234A6E] text-white hover:bg-[#234A6E]"
                            : v.status === "cancelado"
                              ? "bg-muted text-muted-foreground"
                              : ""
                        }
                      >
                        {STATUS_LABEL[v.status] ?? v.status}
                      </Badge>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link
                        to="/nr1/$id/relatorio/$relatorioId"
                        params={{ id: avaliacaoId, relatorioId: v.id }}
                      >
                        Abrir
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-[13px] text-muted-foreground">
                    <span>Gerado em: {formatDate(v.gerado_em)}</span>
                    {v.observacoes && (
                      <span className="truncate max-w-md">
                        · {v.observacoes}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export const Route = createFileRoute("/_auth/nr1_/$id/relatorio")({
  component: RelatorioListPage,
  staticData: { crumb: "Relatório" },
});
