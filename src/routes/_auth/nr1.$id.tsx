import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  BarChart3,
  Copy,
  FileText,
  Link as LinkIcon,
  Loader2,
  Save,
  Upload,
  ListChecks,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAnaliseNr1 } from "@/hooks/useAnaliseNr1";
import { ImportarRespostasDialog } from "@/components/nr1/ImportarRespostasDialog";
import {
  PGR_LABELS,
  DIMENSAO_LABELS,
  agruparPorDimensao,
} from "@/lib/copsoq-calculo";
import type { ResultadoSubescala } from "@/lib/copsoq-calculo";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar as RechartsRadar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AvaliacaoDetalhe {
  id: string;
  nome: string;
  status: string;
  link_publico: string | null;
  limite_respostas: number;
  respostas_completadas: number;
  data_inicio: string;
  data_fim: string | null;
  encerrada_em: string | null;
  encerrada_por: string | null;
  motivo_encerramento: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  empresa_cliente_id: string;
  empresas_cliente: {
    id: string;
    razao_social: string;
    nome_fantasia: string | null;
  } | null;
  modelo_instrumento_id: string;
  nr1_modelo_instrumento: {
    id: string;
    nome: string;
    versao: string;
  } | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Sem prazo";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "aberta":
      return (
        <Badge className="bg-success/10 text-success hover:bg-success/10 border-transparent">
          aberta
        </Badge>
      );
    case "encerrada":
      return (
        <Badge variant="secondary" className="text-muted-foreground">
          encerrada
        </Badge>
      );
    case "analisada":
      return (
        <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-transparent">
          analisada
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground">
          rascunho
        </Badge>
      );
  }
}

function copiarLink(linkPublico: string | null) {
  if (!linkPublico) return;
  const url = `${window.location.origin}/responder/${linkPublico}`;
  navigator.clipboard.writeText(url);
  toast.success("Link copiado!");
}

function CopsoqHeatmap({ resultados }: { resultados: ResultadoSubescala[] }) {
  function corCelula(classificacao: string): string {
    switch (classificacao) {
      case "intoleravel": return "bg-red-600 text-white";
      case "substancial": return "bg-orange-500 text-white";
      case "moderado": return "bg-amber-400 text-black";
      case "toleravel": return "bg-emerald-500 text-white";
      case "trivial": return "bg-emerald-700 text-white";
      default: return "bg-muted text-muted-foreground";
    }
  }

  function labelPgr(classificacao: string): string {
    switch (classificacao) {
      case "intoleravel": return "Intolerável";
      case "substancial": return "Substancial";
      case "moderado": return "Moderado";
      case "toleravel": return "Tolerável";
      case "trivial": return "Trivial";
      default: return classificacao;
    }
  }

  const agrupados = agruparPorDimensao(resultados);

  return (
    <div className="bg-surface border border-border rounded-md p-6 space-y-5">
      <div className="space-y-1">
        <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
          mapa de calor — classificação pgr
        </p>
        <p className="text-sm text-muted-foreground">
          Classificação PGR por subescala (matriz 3×3: probabilidade × severidade).
        </p>
      </div>

      {Object.entries(agrupados).map(([dimensao, subs]) => (
        <div key={dimensao} className="space-y-2">
          <h4 className="text-[11px] font-mono uppercase tracking-[0.10em] text-muted-foreground">
            {DIMENSAO_LABELS[dimensao] ?? dimensao}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {subs.map((r) => (
              <div
                key={r.subescala_id}
                className={`rounded-md px-3 py-2.5 flex items-center justify-between gap-2 ${corCelula(r.classificacao_pgr)}`}
              >
                <span className="text-[12px] font-medium truncate">
                  {r.nome}
                </span>
                <span className="font-mono text-[11px] shrink-0">
                  {labelPgr(r.classificacao_pgr)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border">
        <span className="text-[11px] font-mono uppercase tracking-[0.10em] text-muted-foreground">
          Legenda:
        </span>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-emerald-700" />
          <span className="text-[11px] text-muted-foreground">Trivial</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-emerald-500" />
          <span className="text-[11px] text-muted-foreground">Tolerável</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-amber-400" />
          <span className="text-[11px] text-muted-foreground">Moderado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-orange-500" />
          <span className="text-[11px] text-muted-foreground">Substancial</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-red-600" />
          <span className="text-[11px] text-muted-foreground">Intolerável</span>
        </div>
      </div>
    </div>
  );
}

function DimensoesRadar({ resultados }: { resultados: ResultadoSubescala[] }) {
  const agrupados = agruparPorDimensao(resultados);

  const labelCurta: Record<string, string> = {
    demandas: "Demandas",
    organizacao: "Organização",
    relacoes: "Relações",
    valores: "Valores",
    personalidade: "Personalidade",
    interface: "Interface",
    saude: "Saúde",
    comportamentos: "Comportamentos",
  };

  const radarData = Object.entries(agrupados).map(([dimensao, subs]) => {
    const mediaRisco = Math.round(
      subs.reduce((acc, s) => acc + s.pct_risco, 0) / subs.length,
    );
    const mediaFavoravel = Math.round(
      subs.reduce((acc, s) => acc + s.pct_favoravel, 0) / subs.length,
    );
    return {
      dimensao: labelCurta[dimensao] ?? dimensao,
      risco: mediaRisco,
      favoravel: mediaFavoravel,
    };
  });

  return (
    <div className="bg-surface border border-border rounded-md p-6 space-y-4">
      <div className="space-y-1">
        <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
          visão por dimensão
        </p>
        <p className="text-[12px] text-muted-foreground">
          Percentual médio de risco vs. favorável nas 8 dimensões COPSOQ.
          Hover para detalhes.
        </p>
      </div>

      <div className="w-full h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} outerRadius="75%">
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="dimensao"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--surface-elevated))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                fontSize: "12px",
                fontFamily: "Geist Mono, monospace",
              }}
              formatter={(value: number, name: string) => [`${value}%`, name]}
            />
            <RechartsRadar
              name="% Risco"
              dataKey="risco"
              stroke="hsl(7 78% 68%)"
              fill="hsl(7 78% 68%)"
              fillOpacity={0.2}
              strokeWidth={2}
              dot={{ r: 4, fill: "hsl(7 78% 68%)", strokeWidth: 0 }}
              label={{
                fontSize: 11,
                fill: "hsl(7 78% 68%)",
                fontFamily: "Geist Mono",
                formatter: (v: number) => `${v}%`,
              }}
            />
            <RechartsRadar
              name="% Favorável"
              dataKey="favoravel"
              stroke="hsl(160 84% 39%)"
              fill="hsl(160 84% 39%)"
              fillOpacity={0.1}
              strokeWidth={2}
              dot={{ r: 4, fill: "hsl(160 84% 39%)", strokeWidth: 0 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-4 border-t border-border/30">
        {radarData.map((d) => (
          <div
            key={d.dimensao}
            className="flex items-center justify-between gap-2 px-3 py-2 bg-background/30 rounded-sm"
          >
            <span className="text-[11px] text-muted-foreground">
              {d.dimensao}
            </span>
            <div className="flex gap-3">
              <span className="text-[11px] font-mono text-primary">
                {d.risco}%
              </span>
              <span className="text-[11px] font-mono text-success">
                {d.favoravel}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-6 pt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
          <span className="text-[11px] text-muted-foreground">
            % risco (média da dimensão)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-success" />
          <span className="text-[11px] text-muted-foreground">
            % favorável (média da dimensão)
          </span>
        </div>
      </div>
    </div>
  );
}

function IndicadoresSection({ avaliacaoId }: { avaliacaoId: string }) {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [numEmpregados, setNumEmpregados] = useState("");
  const [fap, setFap] = useState("");
  const [afastB31, setAfastB31] = useState("");
  const [afastB91, setAfastB91] = useState("");
  const [taxaTurnover, setTaxaTurnover] = useState("");
  const [taxaAbsenteismo, setTaxaAbsenteismo] = useState("");
  const [numAcidentes, setNumAcidentes] = useState("");
  const [parecer, setParecer] = useState("");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      const { data, error } = await supabase
        .from("nr1_indicador_epidemiologico")
        .select("*")
        .eq("avaliacao_id", avaliacaoId)
        .maybeSingle();
      if (cancelado) return;
      if (error) {
        toast.error("Erro ao carregar indicadores: " + error.message);
      } else if (data) {
        setPeriodoInicio(data.periodo_inicio ? data.periodo_inicio.split("T")[0] : "");
        setPeriodoFim(data.periodo_fim ? data.periodo_fim.split("T")[0] : "");
        setNumEmpregados(data.num_empregados_referencia != null ? String(data.num_empregados_referencia) : "");
        setFap(data.fap != null ? String(data.fap) : "");
        setAfastB31(data.afastamentos_b31 != null ? String(data.afastamentos_b31) : "");
        setAfastB91(data.afastamentos_b91 != null ? String(data.afastamentos_b91) : "");
        setTaxaTurnover(data.taxa_turnover != null ? String(data.taxa_turnover) : "");
        setTaxaAbsenteismo(data.taxa_absenteismo != null ? String(data.taxa_absenteismo) : "");
        setNumAcidentes(data.num_acidentes != null ? String(data.num_acidentes) : "");
        setParecer(data.parecer_indicadores ?? "");
        setObservacoes(data.observacoes ?? "");
      }
      setCarregando(false);
    }
    carregar();
    return () => { cancelado = true; };
  }, [avaliacaoId]);

  function parseNum(str: string): number | null {
    const v = str.trim();
    if (v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  async function handleSalvar() {
    setSalvando(true);
    const payload = {
      avaliacao_id: avaliacaoId,
      periodo_inicio: periodoInicio || null,
      periodo_fim: periodoFim || null,
      num_empregados_referencia: parseNum(numEmpregados),
      fap: parseNum(fap),
      afastamentos_b31: parseNum(afastB31),
      afastamentos_b91: parseNum(afastB91),
      taxa_turnover: parseNum(taxaTurnover),
      taxa_absenteismo: parseNum(taxaAbsenteismo),
      num_acidentes: parseNum(numAcidentes),
      parecer_indicadores: parecer.trim() || null,
      observacoes: observacoes.trim() || null,
    };

    const { error } = await supabase
      .from("nr1_indicador_epidemiologico")
      .upsert(payload as never, { onConflict: "avaliacao_id" });

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Indicadores salvos");
    }
    setSalvando(false);
  }

  if (carregando) {
    return (
      <section className="space-y-4">
        <Skeleton className="h-6 w-56" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Indicadores epidemiológicos (12 meses)</h2>
          <p className="text-sm text-muted-foreground">
            Dados complementares para o laudo técnico. Preencha o que tiver disponível.
          </p>
        </div>
        <Button
          onClick={handleSalvar}
          disabled={salvando}
          className="bg-[#234A6E] hover:bg-[#1a3a58] text-white"
        >
          {salvando && <Loader2 className="animate-spin mr-1.5" size={16} />}
          <Save size={16} className="mr-1.5" />
          Salvar
        </Button>
      </div>

      <div className="bg-surface border border-border rounded-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-2">
            <Label className="text-[13px] text-[#234A6E]">Período início</Label>
            <Input
              type="date"
              value={periodoInicio}
              onChange={(e) => setPeriodoInicio(e.target.value)}
              className="text-[13px]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[13px] text-[#234A6E]">Período fim</Label>
            <Input
              type="date"
              value={periodoFim}
              onChange={(e) => setPeriodoFim(e.target.value)}
              className="text-[13px]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[13px] text-[#234A6E]">Empregados na referência</Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={numEmpregados}
              onChange={(e) => setNumEmpregados(e.target.value)}
              className="text-[13px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-2">
            <Label className="text-[13px] text-[#234A6E]">FAP</Label>
            <Input
              type="number"
              min={0.5}
              max={2.0}
              step={0.0001}
              value={fap}
              onChange={(e) => setFap(e.target.value)}
              className="text-[13px]"
            />
            <p className="text-[11px] text-muted-foreground">Faixa: 0,5 a 2,0</p>
          </div>
          <div className="space-y-2">
            <Label className="text-[13px] text-[#234A6E]">Afastamentos B31 (previdenciário)</Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={afastB31}
              onChange={(e) => setAfastB31(e.target.value)}
              className="text-[13px]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[13px] text-[#234A6E]">Afastamentos B91 (acidentário)</Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={afastB91}
              onChange={(e) => setAfastB91(e.target.value)}
              className="text-[13px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-2">
            <Label className="text-[13px] text-[#234A6E]">Taxa de turnover</Label>
            <div className="relative">
              <Input
                type="number"
                min={0}
                step={0.01}
                value={taxaTurnover}
                onChange={(e) => setTaxaTurnover(e.target.value)}
                className="text-[13px] pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground pointer-events-none">
                %
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[13px] text-[#234A6E]">Taxa de absenteísmo</Label>
            <div className="relative">
              <Input
                type="number"
                min={0}
                step={0.01}
                value={taxaAbsenteismo}
                onChange={(e) => setTaxaAbsenteismo(e.target.value)}
                className="text-[13px] pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground pointer-events-none">
                %
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[13px] text-[#234A6E]">Número de acidentes</Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={numAcidentes}
              onChange={(e) => setNumAcidentes(e.target.value)}
              className="text-[13px]"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[13px] text-[#234A6E]">Parecer técnico</Label>
          <Textarea
            value={parecer}
            onChange={(e) => setParecer(e.target.value)}
            rows={4}
            className="text-[13px] resize-y"
          />
          <p className="text-[11px] text-muted-foreground">
            Revisado pelo responsável técnico antes de emitir o laudo.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-[13px] text-[#234A6E]">Observações</Label>
          <Textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={3}
            className="text-[13px] resize-y"
          />
        </div>
      </div>
    </section>
  );
}

function AvaliacaoNr1DetalhePage() {
  // helper renderer reused for "Geral" e cada setor (mesmos componentes).
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [confirmEncerrarOpen, setConfirmEncerrarOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [setorTab, setSetorTab] = useState<string>("geral");
  const queryClient = useQueryClient();

  const {
    data: avaliacao,
    isLoading,
    refetch,
  } = useQuery<AvaliacaoDetalhe | null>({
    queryKey: ["nr1-avaliacao", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nr1_avaliacao")
        .select(
          "id, nome, status, link_publico, limite_respostas, respostas_completadas, data_inicio, data_fim, encerrada_em, encerrada_por, motivo_encerramento, metadata, created_at, updated_at, empresa_cliente_id, empresas_cliente(id, razao_social, nome_fantasia), modelo_instrumento_id, nr1_modelo_instrumento(id, nome, versao)",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as AvaliacaoDetalhe | null;
    },
  });

  type AdesaoResult = {
    error?: string;
    bloqueado?: boolean;
    total_respondentes?: number;
    minimo?: number;
    distribuicao_setor?: {
      disponivel: boolean;
      fatias?: { rotulo: string; n: number }[];
    };
  };

  const { data: adesaoData, isLoading: adesaoLoading } = useQuery<AdesaoResult>({
    queryKey: ["nr1-adesao", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("nr1_adesao_avaliacao", {
        p_avaliacao_id: id,
      });
      if (error) throw error;
      return (data ?? {}) as AdesaoResult;
    },
    enabled: !!id,
  });

  const analiseQuery = useAnaliseNr1(
    avaliacao?.id,
    avaliacao?.modelo_instrumento_id,
  );

  // Setores ativos da empresa para abas segmentadas.
  const setoresQuery = useQuery<{ id: string; nome: string }[]>({
    queryKey: ["nr1-setores-empresa", avaliacao?.empresa_cliente_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("setores")
        .select("id, nome")
        .eq("empresa_cliente_id", avaliacao!.empresa_cliente_id)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as { id: string; nome: string }[];
    },
    enabled: !!avaliacao?.empresa_cliente_id,
  });

  const setores = setoresQuery.data ?? [];
  const setorAnaliseQueries = useQueries({
    queries: setores.map((s) => ({
      queryKey: ["nr1-analise", avaliacao?.id, s.id],
      enabled: !!avaliacao?.id,
      queryFn: async () => {
        const { data, error } = await supabase.rpc("nr1_resultado_avaliacao", {
          p_avaliacao_id: avaliacao!.id,
          p_setor_id: s.id,
        });
        if (error) throw error;
        const payload = data as {
          error?: string;
          bloqueado?: boolean;
          total_respondentes?: number;
          motivo?: string;
          minimo?: number;
          resultados?: ResultadoSubescala[];
        } | null;
        if (!payload || payload.error) throw new Error(payload?.error ?? "erro_desconhecido");
        return {
          bloqueado: !!payload.bloqueado,
          total_respondentes: payload.total_respondentes ?? 0,
          motivo: payload.motivo,
          minimo: payload.minimo,
          resultados: payload.resultados ?? [],
        };
      },
    })),
  });

  const setoresExibiveis = setores
    .map((s, i) => ({ setor: s, analise: setorAnaliseQueries[i]?.data }))
    .filter((x) => x.analise && !x.analise.bloqueado);

  const abrirMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("nr1_avaliacao")
        .update({ status: "aberta" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avaliação aberta. O link público já aceita respostas.");
      refetch();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const encerrarMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("nr1_avaliacao")
        .update({
          status: "encerrada",
          encerrada_em: new Date().toISOString(),
          encerrada_por: user?.id ?? null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avaliação encerrada.");
      setConfirmEncerrarOpen(false);
      refetch();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!avaliacao) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-4">
        <Link
          to="/nr1"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Avaliações NR-1
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Avaliação não encontrada
        </h1>
        <p className="text-sm text-muted-foreground">
          A avaliação solicitada não existe ou foi removida.
        </p>
      </div>
    );
  }

  const pct =
    avaliacao.limite_respostas > 0
      ? Math.min(
          (avaliacao.respostas_completadas / avaliacao.limite_respostas) * 100,
          100,
        )
      : 0;
  const adesaoPct = Math.round(pct);
  const linkUrl = avaliacao.link_publico
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/responder/${avaliacao.link_publico}`
    : "";

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <Link
        to="/nr1"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Avaliações NR-1
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
            avaliação nr-1
          </p>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {avaliacao.nome}
            </h1>
            <StatusBadge status={avaliacao.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {avaliacao.empresas_cliente?.razao_social ?? "—"}
            {avaliacao.nr1_modelo_instrumento?.nome && (
              <> · {avaliacao.nr1_modelo_instrumento.nome}</>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {avaliacao.status === "rascunho" && (
            <Button
              onClick={() => abrirMutation.mutate()}
              disabled={abrirMutation.isPending}
            >
              {abrirMutation.isPending && (
                <Loader2 className="animate-spin" />
              )}
              Abrir avaliação
            </Button>
          )}
          {avaliacao.status === "aberta" && (
            <>
              <Button
                variant="outline"
                className="text-warning hover:text-warning"
                onClick={() => setConfirmEncerrarOpen(true)}
              >
                Encerrar
              </Button>
              <Button
                variant="outline"
                onClick={() => copiarLink(avaliacao.link_publico)}
              >
                <Copy />
                Copiar link
              </Button>
            </>
          )}
          {(avaliacao.status === "aberta" ||
            avaliacao.status === "encerrada") && (
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(true)}
            >
              <Upload />
              Importar respostas
            </Button>
          )}
          {(avaliacao.status === "encerrada" ||
            avaliacao.status === "analisada") && (
            <Button
              onClick={() =>
                toast("Análise em construção — próximo passo.")
              }
            >
              <BarChart3 />
              Ver análise
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to="/nr1/$id/relatorio" params={{ id: avaliacao.id }}>
              <FileText />
              Relatório
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/nr1/$id/plano" params={{ id: avaliacao.id }}>
              <ListChecks />
              Plano de ação
            </Link>
          </Button>
        </div>
      </header>

      <div className="bg-surface border border-border rounded-md p-6">
        <div className="grid grid-cols-4 gap-6">
          <div className="space-y-2">
            <p className="text-[11px] font-mono uppercase tracking-[0.10em] text-muted-foreground">
              Respostas
            </p>
            <p className="text-3xl font-semibold font-mono">
              {avaliacao.respostas_completadas}
              <span className="text-muted-foreground">
                {" / "}
                {avaliacao.limite_respostas}
              </span>
            </p>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-mono uppercase tracking-[0.10em] text-muted-foreground">
              Adesão
            </p>
            <p className="text-3xl font-semibold font-mono">{adesaoPct}%</p>
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-mono uppercase tracking-[0.10em] text-muted-foreground">
              Início
            </p>
            <p className="text-sm">{formatDate(avaliacao.data_inicio)}</p>
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-mono uppercase tracking-[0.10em] text-muted-foreground">
              Prazo
            </p>
            <p className="text-sm">{formatDate(avaliacao.data_fim)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="bg-surface border border-border rounded-md p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <LinkIcon
              size={16}
              className="text-muted-foreground shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-mono uppercase tracking-[0.10em] text-muted-foreground">
                Link para respondentes
              </span>
              <span className="font-mono text-[12px] truncate">
                {linkUrl || "—"}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copiarLink(avaliacao.link_publico)}
            disabled={!avaliacao.link_publico}
          >
            <Copy />
            Copiar
          </Button>
        </div>
        {avaliacao.status === "rascunho" && (
          <Alert>
            <AlertDescription className="text-[12px] text-muted-foreground">
              A avaliação precisa ser aberta para aceitar respostas.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Participação</h2>
          <Badge variant="secondary" className="text-muted-foreground">
            {avaliacao.respostas_completadas}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Respostas anônimas recebidas.
          </span>
        </div>

        <div className="bg-surface border border-border rounded-md p-6 space-y-4">
          {adesaoLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : adesaoData?.error ? (
            <p className="text-sm text-muted-foreground">
              Não foi possível carregar a participação.
            </p>
          ) : adesaoData?.bloqueado ? (
            <p className="text-sm text-muted-foreground">
              Resultados indisponíveis: são necessários ao menos{" "}
              {adesaoData.minimo ?? 5} respondentes para preservar o anonimato
              (atual: {adesaoData.total_respondentes ?? 0}).
            </p>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold font-mono">
                  {adesaoData?.total_respondentes ?? 0}
                </span>
                <span className="text-[12px] text-muted-foreground">
                  respondentes válidos
                </span>
              </div>

              {adesaoData?.distribuicao_setor?.disponivel ? (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <p className="text-[11px] font-mono uppercase tracking-[0.10em] text-muted-foreground">
                    Adesão por setor
                  </p>
                  {(() => {
                    const fatias =
                      adesaoData.distribuicao_setor?.fatias ?? [];
                    const max = fatias.reduce(
                      (m, f) => (f.n > m ? f.n : m),
                      0,
                    );
                    return (
                      <div className="space-y-2">
                        {fatias.map((f) => {
                          const pct = max > 0 ? (f.n / max) * 100 : 0;
                          return (
                            <div
                              key={f.rotulo}
                              className="flex items-center gap-3"
                            >
                              <span className="text-[13px] w-40 truncate">
                                {f.rotulo}
                              </span>
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-[12px] font-mono w-8 text-right text-muted-foreground">
                                {f.n}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-[12px] text-muted-foreground pt-2 border-t border-border/50">
                  Distribuição por setor indisponível: grupos com menos de 5
                  respondentes não são segmentados para preservar o anonimato.
                </p>
              )}
            </>
          )}
        </div>
      </section>

      {analiseQuery.data?.bloqueado && (
        <section className="bg-surface border border-border rounded-md p-6">
          <h2 className="text-lg font-semibold tracking-tight mb-2">
            Resultados COPSOQ
          </h2>
          <p className="text-sm text-muted-foreground">
            Resultados indisponíveis: são necessários ao menos{" "}
            {analiseQuery.data.minimo ?? 5} respondentes para preservar o
            anonimato (atual: {analiseQuery.data.total_respondentes}).
          </p>
        </section>
      )}

      {analiseQuery.data &&
        !analiseQuery.data.bloqueado &&
        analiseQuery.data.resultados.length > 0 && (
          <section className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">
                Resultados COPSOQ
              </h2>
              <p className="text-sm text-muted-foreground">
                Análise por subescala com classificação PGR.{" "}
                {analiseQuery.data.total_respondentes} respondentes válidos.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {(
                [
                  "intoleravel",
                  "substancial",
                  "moderado",
                  "toleravel",
                  "trivial",
                ] as const
              ).map((nivel) => {
                const count = analiseQuery.data!.resultados.filter(
                  (r) => r.classificacao_pgr === nivel,
                ).length;
                const meta = PGR_LABELS[nivel];
                return (
                  <div
                    key={nivel}
                    className="bg-surface border border-border rounded-md p-4 space-y-2"
                  >
                    <p className="text-3xl font-semibold font-mono">{count}</p>
                    <div
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${meta.cor}`}
                    >
                      {meta.label}
                    </div>
                  </div>
                );
              })}
            </div>

            <DimensoesRadar resultados={analiseQuery.data!.resultados} />
            <CopsoqHeatmap resultados={analiseQuery.data!.resultados} />

            {Object.entries(agruparPorDimensao(analiseQuery.data!.resultados)).map(
              ([dimensao, resultados]) => (
                <div key={dimensao} className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {DIMENSAO_LABELS[dimensao] ?? dimensao}
                  </h3>
                  <div className="bg-surface border border-border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="py-3 px-4 text-[13px]">
                            Subescala
                          </TableHead>
                          <TableHead className="py-3 px-4 text-[13px]">
                            Média
                          </TableHead>
                          <TableHead className="py-3 px-4 text-[13px]">
                            Risco
                          </TableHead>
                          <TableHead className="py-3 px-4 text-[13px]">
                            Atenção
                          </TableHead>
                          <TableHead className="py-3 px-4 text-[13px]">
                            Favorável
                          </TableHead>
                          <TableHead className="py-3 px-4 text-[13px]">
                            Severidade
                          </TableHead>
                          <TableHead className="py-3 px-4 text-[13px]">
                            Prob.
                          </TableHead>
                          <TableHead className="py-3 px-4 text-[13px]">
                            Classif. PGR
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resultados.map((r) => {
                          const pgr = PGR_LABELS[r.classificacao_pgr];
                          return (
                            <TableRow
                              key={r.subescala_id}
                              className="border-b border-border"
                            >
                              <TableCell className="py-3 px-4 text-[13px]">
                                <div className="flex flex-col">
                                  <span className="font-medium">{r.nome}</span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {r.tipo}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="py-3 px-4 font-mono text-[13px]">
                                {r.media_geral.toFixed(2)}
                              </TableCell>
                              <TableCell className="py-3 px-4 font-mono text-[13px]">
                                {r.pct_risco}%
                              </TableCell>
                              <TableCell className="py-3 px-4 font-mono text-[13px]">
                                {r.pct_atencao}%
                              </TableCell>
                              <TableCell className="py-3 px-4 font-mono text-[13px]">
                                {r.pct_favoravel}%
                              </TableCell>
                              <TableCell className="py-3 px-4 text-[12px] text-muted-foreground">
                                {r.severidade}
                              </TableCell>
                              <TableCell className="py-3 px-4 text-[12px] text-muted-foreground">
                                {r.probabilidade}
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                {pgr && (
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${pgr.cor}`}
                                  >
                                    {pgr.label}
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ),
            )}

            <Alert>
              <AlertDescription className="text-[12px] text-muted-foreground">
                Análise agregada com N≥5 respondentes conforme LGPD art. 11.
                Dados individuais não são exibidos. Instrumento COPSOQ-II
                adaptado (Empodhera). Severidade fixa por subescala — decisão
                organizacional NR-1 §1.5.4.4.2.2.
              </AlertDescription>
            </Alert>
          </section>
        )}

      {avaliacao.respostas_completadas > 0 &&
        avaliacao.respostas_completadas < 5 && (
          <Alert>
            <AlertDescription className="text-[12px] text-muted-foreground">
              Análise indisponível — mínimo de 5 respondentes necessário
              (LGPD). Atual: {avaliacao.respostas_completadas}.
            </AlertDescription>
          </Alert>
        )}

      <IndicadoresSection avaliacaoId={avaliacao.id} />

      <AlertDialog
        open={confirmEncerrarOpen}
        onOpenChange={setConfirmEncerrarOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar avaliação?</AlertDialogTitle>
            <AlertDialogDescription>
              Novas respostas não serão aceitas após o encerramento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={encerrarMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                encerrarMutation.mutate();
              }}
              disabled={encerrarMutation.isPending}
            >
              {encerrarMutation.isPending && (
                <Loader2 className="animate-spin" />
              )}
              Encerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportarRespostasDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        avaliacao={{
          id: avaliacao.id,
          empresa_cliente_id: avaliacao.empresa_cliente_id,
          modelo_instrumento_id: avaliacao.modelo_instrumento_id,
        }}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ["nr1-adesao", id] });
          queryClient.invalidateQueries({ queryKey: ["nr1-analise", id] });
        }}
      />
    </div>
  );
}

export const Route = createFileRoute("/_auth/nr1/$id")({
  component: AvaliacaoNr1DetalhePage,
  staticData: { crumb: "Avaliação" },
});