import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, FileText, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { AnaliseDimensoes } from "@/components/AnaliseDimensoes";

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
  permitir_amostra_reduzida: boolean;
  empresas_cliente: { razao_social: string; nome_fantasia: string | null } | null;
}

interface SetorItem {
  id: string;
  nome: string;
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
  const { tipo } = Route.useSearch();
  const { id: avaliacaoId } = Route.useParams();
  const [carregando, setCarregando] = useState(true);
  const [avaliacao, setAvaliacao] = useState<AvaliacaoResumo | null>(null);
  const [versoes, setVersoes] = useState<VersaoRelatorio[]>([]);
  const [gerando, setGerando] = useState(false);
  const [alertaRiscos, setAlertaRiscos] = useState<
    { subescala_id: string; nome: string; classificacao_pgr: string }[] | null
  >(null);
  const [setores, setSetores] = useState<SetorItem[]>([]);
  const [totalRespondentes, setTotalRespondentes] = useState(0);
  const [versaoDoc, setVersaoDoc] = useState("");

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      setCarregando(true);
      try {
        const { data: av, error: errAv } = await supabase
          .from("nr1_avaliacao")
          .select(
            "id, nome, empresa_cliente_id, tenant_id, permitir_amostra_reduzida, empresas_cliente(razao_social, nome_fantasia)",
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

        const { data: ades } = await supabase.rpc("nr1_adesao_avaliacao", {
          p_avaliacao_id: avaliacaoId,
        });
        if (!cancelado)
          setTotalRespondentes(
            (ades as { total_respondentes?: number } | null)?.total_respondentes ?? 0,
          );

        if (av?.empresa_cliente_id) {
          const { data: sets, error: errSets } = await supabase
            .from("setores")
            .select("id, nome")
            .eq("empresa_cliente_id", av.empresa_cliente_id)
            .eq("ativo", true)
            .order("nome");
          if (errSets) throw errSets;
          if (!cancelado) setSetores((sets ?? []) as SetorItem[]);
        }
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
    return () => {
      cancelado = true;
    };
  }, [avaliacaoId]);

  async function handleGerar() {
    setGerando(true);
    try {
      const { data, error } = await supabase.rpc("nr1_gerar_relatorio", {
        p_avaliacao_id: avaliacaoId,
      });
      if (error) throw error;
      const payload = data as {
        relatorio_id?: string;
        versao?: number;
        riscos_sem_acao?: { subescala_id: string; nome: string; classificacao_pgr: string }[];
        error?: string;
      } | null;
      if (payload?.error) {
        toast.error("Não foi possível gerar o relatório.");
        return;
      }
      if (payload?.versao) {
        toast.success(`Versão ${payload.versao} gerada.`);
      }
      if (payload?.relatorio_id && versaoDoc.trim()) {
        await supabase
          .from("nr1_relatorio")
          .update({ versao_documento: versaoDoc.trim() })
          .eq("id", payload.relatorio_id);
      }
      if (payload?.riscos_sem_acao && payload.riscos_sem_acao.length > 0) {
        setAlertaRiscos(payload.riscos_sem_acao);
      } else {
        setAlertaRiscos(null);
      }
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

  const modoConsolidado =
    (avaliacao?.permitir_amostra_reduzida ?? false) && totalRespondentes < 5;

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
            {tipo === "pgr" ? "relatório para pgr" : "relatório nr-1"}
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

        <div className="flex items-center gap-2">
          <Input
            placeholder="Versão do documento"
            value={versaoDoc}
            onChange={(e) => setVersaoDoc(e.target.value)}
            className="w-44"
          />
          <Button
            onClick={handleGerar}
            disabled={gerando}
            className="bg-[#234A6E] hover:bg-[#1a3a58] text-white"
          >
            {gerando ? <Loader2 className="animate-spin mr-1.5" size={14} /> : <Plus size={14} className="mr-1.5" />}
            Gerar nova versão (rascunho)
          </Button>
        </div>
      </header>

      {alertaRiscos && alertaRiscos.length > 0 && (
        <Alert>
          <AlertDescription>
            Riscos prioritários sem ação no plano: {alertaRiscos.map((r) => r.nome).join(", ")}.
            Trate-os antes de emitir.
          </AlertDescription>
        </Alert>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          {modoConsolidado ? "Análise por dimensão (consolidada)" : "Análise por dimensão"}
        </h2>
        {avaliacao && (
          <AnaliseDimensoes
            avaliacaoId={avaliacaoId}
            tenantId={avaliacao.tenant_id}
            setores={setores}
            apenasConsolidado={modoConsolidado}
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Versões</h2>
        {versoes.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center">
            <p className="text-sm font-medium">Nenhuma versão gerada ainda.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Clique em "Gerar nova versão" para criar o primeiro rascunho.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {versoes.map((v) => (
              <Card key={v.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <FileText size={14} />
                      <span>Versão {v.versao}</span>
                      <Badge variant="outline" className="text-[11px]">
                        {STATUS_LABEL[v.status] ?? v.status}
                      </Badge>
                    </CardTitle>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/relatorio" search={{ r: v.id, tipo }}>
                        Abrir
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Gerado em: {formatDate(v.gerado_em)}
                    {v.observacoes && <span> · {v.observacoes}</span>}
                  </p>
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
  validateSearch: (search: Record<string, unknown>) => ({
    tipo: search.tipo === "pgr" ? ("pgr" as const) : ("laudo" as const),
  }),
  component: RelatorioListPage,
  staticData: { crumb: "Relatório" },
});