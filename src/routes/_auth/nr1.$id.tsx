import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  BarChart3,
  Copy,
  Link as LinkIcon,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAnaliseNr1 } from "@/hooks/useAnaliseNr1";
import {
  PGR_LABELS,
  DIMENSAO_LABELS,
  agruparPorDimensao,
} from "@/lib/copsoq-calculo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

interface RespondenteRow {
  id: string;
  setor_id: string;
  setores: { id: string; nome: string } | null;
  sexo: string;
  faixa_etaria: string;
  treinamento_rp: string;
  dispositivo: string;
  tempo_resposta_segundos: number | null;
  submetido_em: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Sem prazo";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
}

function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

function formatTempo(segundos: number | null): string {
  if (segundos == null) return "—";
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function mapSexo(v: string): string {
  if (v === "masculino") return "M";
  if (v === "feminino") return "F";
  return v;
}

function mapFaixa(v: string): string {
  if (v === "ate_38") return "Até 38";
  if (v === "acima_38") return "Acima de 38";
  return v;
}

function mapTreinamento(v: string): string {
  if (v === "sim_compreendi") return "Sim";
  if (v === "nao_recebi") return "Não";
  if (v === "mais_ou_menos") return "Parcial";
  return v;
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

function AvaliacaoNr1DetalhePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [confirmEncerrarOpen, setConfirmEncerrarOpen] = useState(false);

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

  const { data: respondentes, isLoading: respondentesLoading } = useQuery<
    RespondenteRow[]
  >({
    queryKey: ["nr1-respondentes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nr1_respondente_anonimo")
        .select(
          "id, setor_id, setores(id, nome), sexo, faixa_etaria, treinamento_rp, dispositivo, tempo_resposta_segundos, submetido_em",
        )
        .eq("avaliacao_id", id)
        .order("submetido_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RespondenteRow[];
    },
    enabled: !!id,
  });

  const analiseQuery = useAnaliseNr1(
    avaliacao?.id,
    avaliacao?.modelo_instrumento_id,
  );

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
  const adesao = Math.round(pct);
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
            <p className="text-3xl font-semibold font-mono">{adesao}%</p>
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
          <h2 className="text-lg font-semibold tracking-tight">Respondentes</h2>
          <Badge variant="secondary" className="text-muted-foreground">
            {respondentes?.length ?? 0}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Respostas anônimas recebidas.
          </span>
        </div>

        <div className="bg-surface border border-border rounded-md">
          {respondentesLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Setor</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead>Faixa etária</TableHead>
                  <TableHead>Treinamento RP</TableHead>
                  <TableHead>Dispositivo</TableHead>
                  <TableHead>Tempo</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[0, 1, 2].map((i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j} className="py-3 px-4">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : !respondentes || respondentes.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma resposta recebida ainda.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-3 px-4 text-[13px]">Setor</TableHead>
                  <TableHead className="py-3 px-4 text-[13px]">Sexo</TableHead>
                  <TableHead className="py-3 px-4 text-[13px]">
                    Faixa etária
                  </TableHead>
                  <TableHead className="py-3 px-4 text-[13px]">
                    Treinamento RP
                  </TableHead>
                  <TableHead className="py-3 px-4 text-[13px]">
                    Dispositivo
                  </TableHead>
                  <TableHead className="py-3 px-4 text-[13px]">Tempo</TableHead>
                  <TableHead className="py-3 px-4 text-[13px]">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {respondentes.map((r) => (
                  <TableRow key={r.id} className="border-b border-border">
                    <TableCell className="py-3 px-4 text-[13px]">
                      {r.setores?.nome ?? "—"}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-[13px]">
                      {mapSexo(r.sexo)}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-[13px]">
                      {mapFaixa(r.faixa_etaria)}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-[13px]">
                      {mapTreinamento(r.treinamento_rp)}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className="font-mono text-[11px]"
                      >
                        {r.dispositivo}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4 font-mono text-[13px]">
                      {formatTempo(r.tempo_resposta_segundos)}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-[12px] text-muted-foreground">
                      {formatDateTime(r.submetido_em)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      {avaliacao.respostas_completadas >= 5 &&
        analiseQuery.data &&
        analiseQuery.data.length > 0 && (
          <section className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">
                Resultados COPSOQ
              </h2>
              <p className="text-sm text-muted-foreground">
                Análise por subescala com classificação PGR.{" "}
                {analiseQuery.data[0]?.total_respondentes} respondentes válidos.
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
                const count = analiseQuery.data!.filter(
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

            {Object.entries(agruparPorDimensao(analiseQuery.data!)).map(
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
    </div>
  );
}

export const Route = createFileRoute("/_auth/nr1/$id")({
  component: AvaliacaoNr1DetalhePage,
  staticData: { crumb: "Avaliação" },
});