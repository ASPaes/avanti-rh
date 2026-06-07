import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  Save,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";

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

interface SetorItem {
  id: string;
  nome: string;
}

interface AnaliseSetorState {
  id: string | null;
  texto: string;
  gerado_por_ia: boolean;
  carregandoIA: boolean;
  salvando: boolean;
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
  const [setores, setSetores] = useState<SetorItem[]>([]);
  const [analises, setAnalises] = useState<Record<string, AnaliseSetorState>>({});

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

        if (av?.empresa_cliente_id) {
          const { data: sets, error: errSets } = await supabase
            .from("setores")
            .select("id, nome")
            .eq("empresa_cliente_id", av.empresa_cliente_id)
            .eq("ativo", true)
            .order("nome");
          if (errSets) throw errSets;

          const { data: ans, error: errAns } = await supabase
            .from("nr1_analise_setor")
            .select("id, setor_id, texto, gerado_por_ia")
            .eq("avaliacao_id", avaliacaoId);
          if (errAns) throw errAns;

          if (!cancelado) {
            setSetores((sets ?? []) as SetorItem[]);
            const map: Record<string, AnaliseSetorState> = {};
            for (const s of (sets ?? []) as SetorItem[]) {
              const existente = (ans ?? []).find((a) => a.setor_id === s.id);
              map[s.id] = {
                id: existente?.id ?? null,
                texto: existente?.texto ?? "",
                gerado_por_ia: existente?.gerado_por_ia ?? false,
                carregandoIA: false,
                salvando: false,
              };
            }
            setAnalises(map);
          }
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

  function updateAnalise(setorId: string, patch: Partial<AnaliseSetorState>) {
    setAnalises((prev) => ({
      ...prev,
      [setorId]: { ...prev[setorId], ...patch },
    }));
  }

  async function handleGerarIA(setor: SetorItem) {
    if (!avaliacao) return;
    updateAnalise(setor.id, { carregandoIA: true });
    try {
      const { data: resultado, error: errRpc } = await supabase.rpc(
        "nr1_resultado_avaliacao",
        { p_avaliacao_id: avaliacaoId, p_setor_id: setor.id },
      );
      if (errRpc) throw errRpc;

      const res = resultado as {
        bloqueado?: boolean;
        total_respondentes?: number;
        resultados?: { nome: string; classificacao_pgr: string }[];
      } | null;

      if (res?.bloqueado) {
        toast.error("Setor com menos de 5 respondentes (LGPD).");
        return;
      }

      const fatores = (res?.resultados ?? [])
        .map((r) => `${r.nome}: ${r.classificacao_pgr}`)
        .join("\n");

      const { data: iaData, error: iaErr } = await supabase.functions.invoke(
        "ia-executar",
        {
          body: {
            caso_uso: "nr1_analise_setor",
            tenant_id: avaliacao.tenant_id,
            contexto: {
              setor: setor.nome,
              n_respondentes: res?.total_respondentes ?? 0,
              fatores,
            },
          },
        },
      );
      if (iaErr) {
        toast.error("Erro ao gerar análise com IA.", {
          description: iaErr.message,
        });
        return;
      }
      const payload = iaData as { texto?: string; error?: string } | null;
      if (payload?.error) {
        toast.error("Erro ao gerar análise com IA.", { description: payload.error });
        return;
      }
      if (!payload?.texto) {
        toast.error("Resposta vazia da IA.");
        return;
      }
      updateAnalise(setor.id, { texto: payload.texto, gerado_por_ia: true });
      toast.success("Análise gerada — revise antes de salvar.");
    } catch (e) {
      toast.error("Erro ao gerar análise com IA.", {
        description: e instanceof Error ? e.message : "Tente novamente.",
      });
    } finally {
      updateAnalise(setor.id, { carregandoIA: false });
    }
  }

  async function handleSalvarAnalise(setor: SetorItem) {
    if (!avaliacao) return;
    const atual = analises[setor.id];
    if (!atual) return;
    updateAnalise(setor.id, { salvando: true });
    try {
      if (atual.id) {
        const { error } = await supabase
          .from("nr1_analise_setor")
          .update({ texto: atual.texto, gerado_por_ia: atual.gerado_por_ia })
          .eq("id", atual.id);
        if (error) throw error;
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const { data: inserted, error } = await supabase
          .from("nr1_analise_setor")
          .insert({
            tenant_id: avaliacao.tenant_id,
            avaliacao_id: avaliacaoId,
            setor_id: setor.id,
            texto: atual.texto,
            gerado_por_ia: atual.gerado_por_ia,
            created_by: userData.user?.id ?? null,
          })
          .select("id")
          .maybeSingle();
        if (error) throw error;
        updateAnalise(setor.id, { id: inserted?.id ?? null });
      }
      toast.success("Análise salva.");
    } catch (e) {
      toast.error("Erro ao salvar análise.", {
        description: e instanceof Error ? e.message : "Tente novamente.",
      });
    } finally {
      updateAnalise(setor.id, { salvando: false });
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
        <h2 className="text-lg font-semibold tracking-tight">Análise por setor</h2>
        {setores.length === 0 ? (
          <div className="bg-surface border border-border rounded-md p-6 text-center">
            <p className="text-[13px] text-muted-foreground">
              Nenhum setor ativo cadastrado para esta empresa.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {setores.map((s) => {
              const a = analises[s.id];
              if (!a) return null;
              return (
                <Card key={s.id} className="border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-base font-semibold tracking-tight">
                        {s.nome}
                      </CardTitle>
                      {a.gerado_por_ia && (
                        <Badge className="bg-[#ED7D6E] hover:bg-[#ED7D6E] text-white">
                          Gerado por IA — revisar
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      value={a.texto}
                      onChange={(e) =>
                        updateAnalise(s.id, {
                          texto: e.target.value,
                          gerado_por_ia: false,
                        })
                      }
                      placeholder="Descreva a análise do setor…"
                      className="min-h-32 text-[13px]"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleGerarIA(s)}
                        disabled={a.carregandoIA || a.salvando}
                      >
                        {a.carregandoIA ? (
                          <Loader2 className="animate-spin mr-1.5" size={14} />
                        ) : (
                          <Sparkles size={14} className="mr-1.5" />
                        )}
                        Gerar com IA
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSalvarAnalise(s)}
                        disabled={a.salvando || a.carregandoIA}
                        className="bg-[#234A6E] hover:bg-[#1a3a58] text-white"
                      >
                        {a.salvando ? (
                          <Loader2 className="animate-spin mr-1.5" size={14} />
                        ) : (
                          <Save size={14} className="mr-1.5" />
                        )}
                        Salvar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

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
