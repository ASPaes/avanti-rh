import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useAvaliacoesNr1 } from "@/hooks/useAvaliacoesNr1";
import { useAnaliseNr1 } from "@/hooks/useAnaliseNr1";
import {
  PGR_LABELS,
  DIMENSAO_LABELS,
  agruparPorDimensao,
  calcularCopsoq,
} from "@/lib/copsoq-calculo";
import type { SubescalaConfig, Resposta } from "@/lib/copsoq-calculo";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function KpiCard({
  label,
  value,
  detail,
  delta,
  valueTone = "foreground",
}: {
  label: string;
  value: string;
  detail?: string;
  delta?: { value: number; label: string } | null;
  valueTone?: "foreground" | "primary" | "muted";
}) {
  const valueColor =
    valueTone === "primary"
      ? "text-primary"
      : valueTone === "muted"
        ? "text-muted-foreground"
        : "text-foreground";

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className="mt-3 flex items-baseline gap-2">
        <span className={`text-3xl font-semibold tracking-tight ${valueColor}`}>
          {value}
        </span>
        {delta && (
          <span
            className={`text-xs font-medium ${
              delta.value > 0
                ? "text-destructive"
                : delta.value < 0
                  ? "text-success"
                  : "text-muted-foreground"
            }`}
          >
            {delta.value > 0 ? "+" : ""}
            {delta.value} {delta.label}
          </span>
        )}
      </div>
      {detail && (
        <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
      )}
    </div>
  );
}

function Dashboard() {
  const { data: avaliacoes, isLoading: avaliacoesLoading } =
    useAvaliacoesNr1();

  const [filtroAvaliacaoId, setFiltroAvaliacaoId] = useState("auto");
  const [filtroCompararCom, setFiltroCompararCom] = useState("nenhum");

  const avaliacoesComDados = useMemo(() => {
    if (!avaliacoes) return [];
    return avaliacoes.filter((a) => a.respostas_completadas >= 5);
  }, [avaliacoes]);

  const avaliacaoSelecionada = useMemo(() => {
    if (!avaliacoesComDados.length) return null;
    if (filtroAvaliacaoId === "auto") return avaliacoesComDados[0];
    return (
      avaliacoesComDados.find((a) => a.id === filtroAvaliacaoId) ??
      avaliacoesComDados[0]
    );
  }, [avaliacoesComDados, filtroAvaliacaoId]);

  const avaliacaoComparacao = useMemo(() => {
    if (filtroCompararCom === "nenhum" || !avaliacoesComDados.length)
      return null;
    return (
      avaliacoesComDados.find((a) => a.id === filtroCompararCom) ?? null
    );
  }, [avaliacoesComDados, filtroCompararCom]);

  const analisePrincipal = useAnaliseNr1(
    avaliacaoSelecionada?.id,
    avaliacaoSelecionada?.modelo_instrumento_id,
  );

  const analiseComparacao = useAnaliseNr1(
    avaliacaoComparacao?.id,
    avaliacaoComparacao?.modelo_instrumento_id,
  );

  const kpis = useMemo(() => {
    if (!avaliacoes) return null;
    const total = avaliacoes.length;
    const abertas = avaliacoes.filter((a) => a.status === "aberta").length;
    const totalRespondentes = avaliacoes.reduce(
      (acc, a) => acc + a.respostas_completadas,
      0,
    );

    const resultados = analisePrincipal.data ?? [];
    const intoleraveis = resultados.filter(
      (r) => r.classificacao_pgr === "intoleravel",
    ).length;
    const substanciais = resultados.filter(
      (r) => r.classificacao_pgr === "substancial",
    ).length;
    const emRiscoCritico = intoleraveis + substanciais;

    const mediaRiscoGeral =
      resultados.length > 0
        ? Math.round(
            resultados.reduce((acc, r) => acc + r.pct_risco, 0) /
              resultados.length,
          )
        : 0;

    return {
      total,
      abertas,
      totalRespondentes,
      emRiscoCritico,
      intoleraveis,
      substanciais,
      mediaRiscoGeral,
    };
  }, [avaliacoes, analisePrincipal.data]);

  const kpisComparacao = useMemo(() => {
    if (!analiseComparacao.data) return null;
    const resultados = analiseComparacao.data;
    const intoleraveis = resultados.filter(
      (r) => r.classificacao_pgr === "intoleravel",
    ).length;
    const substanciais = resultados.filter(
      (r) => r.classificacao_pgr === "substancial",
    ).length;
    const emRiscoCritico = intoleraveis + substanciais;
    const mediaRiscoGeral =
      resultados.length > 0
        ? Math.round(
            resultados.reduce((acc, r) => acc + r.pct_risco, 0) /
              resultados.length,
          )
        : 0;
    return { emRiscoCritico, intoleraveis, mediaRiscoGeral };
  }, [analiseComparacao.data]);

  const topIntoleraveis = useMemo(() => {
    if (!analisePrincipal.data) return [];
    return analisePrincipal.data
      .filter((r) => r.classificacao_pgr === "intoleravel")
      .slice(0, 3);
  }, [analisePrincipal.data]);

  const topRisco = useMemo(() => {
    if (!analisePrincipal.data) return [];
    return [...analisePrincipal.data]
      .sort((a, b) => b.pct_risco - a.pct_risco)
      .slice(0, 8);
  }, [analisePrincipal.data]);

  const dimensaoData = useMemo(() => {
    if (!analisePrincipal.data) return [];
    const agrupados = agruparPorDimensao(analisePrincipal.data);
    const agrupadosComp = analiseComparacao.data
      ? agruparPorDimensao(analiseComparacao.data)
      : null;
    return Object.entries(agrupados)
      .map(([dim, subs]) => {
        const subsComp = agrupadosComp?.[dim];
        return {
          dimensao: DIMENSAO_LABELS[dim] ?? dim,
          risco: Math.round(
            subs.reduce((acc, s) => acc + s.pct_risco, 0) / subs.length,
          ),
          favoravel: Math.round(
            subs.reduce((acc, s) => acc + s.pct_favoravel, 0) / subs.length,
          ),
          ...(subsComp
            ? {
                riscoComp: Math.round(
                  subsComp.reduce((acc, s) => acc + s.pct_risco, 0) /
                    subsComp.length,
                ),
              }
            : {}),
        };
      })
      .sort((a, b) => b.risco - a.risco);
  }, [analisePrincipal.data, analiseComparacao.data]);

  const circumference = 2 * Math.PI * 44;
  const ringOffset =
    kpis && kpis.mediaRiscoGeral
      ? circumference - (kpis.mediaRiscoGeral / 100) * circumference
      : circumference;

  const isLoading = avaliacoesLoading || !kpis;
  const semAvaliacoes = !!avaliacoes && avaliacoes.length === 0;
  const analiseCarregada = !!avaliacaoSelecionada && !!analisePrincipal.data;
  const temComparacao = !!analiseComparacao.data;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-10">
      {/* Bloco 1: Hero */}
      <section className="grid gap-8 md:grid-cols-[1fr_auto] items-end">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-12 w-96" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
        ) : semAvaliacoes ? (
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Saúde psicossocial
            </p>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight tracking-tight">
              Nenhuma avaliação criada.
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground leading-relaxed">
              Crie uma avaliação no módulo NR-1 para começar a coletar
              respostas e visualizar o panorama psicossocial da sua equipe.
            </p>
            <Button asChild>
              <Link to="/nr1">Ir para NR-1</Link>
            </Button>
          </div>
        ) : !avaliacaoSelecionada ? (
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Saúde psicossocial
            </p>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight tracking-tight">
              Nenhuma avaliação com
              <br />
              <span className="text-primary">dados suficientes.</span>
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground leading-relaxed">
              Colete pelo menos 5 respostas em uma avaliação para ver o
              panorama.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Saúde psicossocial ·{" "}
              {avaliacaoSelecionada.empresas_cliente?.nome_fantasia ??
                avaliacaoSelecionada.empresas_cliente?.razao_social}{" "}
              · {avaliacaoSelecionada.nome} ·{" "}
              {avaliacaoSelecionada.respostas_completadas} respondentes
              {avaliacaoComparacao && (
                <> · comparando com {avaliacaoComparacao.nome}</>
              )}
            </p>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight tracking-tight">
              {kpis.emRiscoCritico} subescalas
              <br />
              <span className="text-primary">em risco crítico.</span>
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground leading-relaxed">
              {topIntoleraveis.length > 0
                ? `Subescalas ${topIntoleraveis.map((r) => r.nome).join(", ")} classificadas como Intolerável na avaliação mais recente.`
                : kpis.substanciais > 0
                  ? `${kpis.substanciais} subescalas classificadas como Substancial requerem atenção.`
                  : "Nenhuma subescala em risco crítico na avaliação mais recente."}
            </p>
          </div>
        )}

        {analiseCarregada && kpis && (
          <div className="relative flex h-32 w-32 items-center justify-center">
            <svg className="absolute inset-0" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth="4"
              />
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="4"
                strokeDasharray={circumference}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-semibold tracking-tight">
                {kpis.mediaRiscoGeral}%
              </span>
            </div>
            <p className="absolute -bottom-5 text-[10px] uppercase tracking-widest text-muted-foreground">
              Risco médio
            </p>
          </div>
        )}
      </section>

      {/* Barra de filtros */}
      {avaliacoesComDados.length > 0 && (
        <section className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-surface p-4">
          <div className="flex flex-col gap-1.5 min-w-[240px] flex-1">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Avaliação
            </label>
            <Select
              value={filtroAvaliacaoId}
              onValueChange={setFiltroAvaliacaoId}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Mais recente</SelectItem>
                {avaliacoesComDados.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.empresas_cliente?.nome_fantasia ??
                      a.empresas_cliente?.razao_social}{" "}
                    — {a.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5 min-w-[240px] flex-1">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Comparar com
            </label>
            <Select
              value={filtroCompararCom}
              onValueChange={setFiltroCompararCom}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">Sem comparação</SelectItem>
                {avaliacoesComDados
                  .filter((a) => a.id !== avaliacaoSelecionada?.id)
                  .map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.empresas_cliente?.nome_fantasia ??
                        a.empresas_cliente?.razao_social}{" "}
                      — {a.nome}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {filtroCompararCom !== "nenhum" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFiltroCompararCom("nenhum")}
            >
              Limpar comparação
            </Button>
          )}
        </section>
      )}

      {/* Bloco 2: KPI cards */}
      <section className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))
        ) : (
          <>
            <KpiCard
              label="Risco crítico"
              value={`${kpis.emRiscoCritico} de 29`}
              detail={`${kpis.intoleraveis} intoleráveis`}
              valueTone="primary"
              delta={
                kpisComparacao
                  ? {
                      value: kpis.emRiscoCritico - kpisComparacao.emRiscoCritico,
                      label: "vs. comp.",
                    }
                  : null
              }
            />
            <KpiCard
              label="Respondentes"
              value={String(kpis.totalRespondentes)}
              detail={`${kpis.abertas} avaliações abertas`}
            />
            <KpiCard
              label="Avaliações"
              value={String(kpis.total)}
            />
            <KpiCard
              label="Plano de ação"
              value="—"
              detail="Em breve"
              valueTone="muted"
            />
          </>
        )}
      </section>

      {/* Bloco 3: Top subescalas + avaliações recentes */}
      {(analiseCarregada || (avaliacoes && avaliacoes.length > 0)) && (
        <section className="grid gap-4 lg:grid-cols-3">
          {analiseCarregada && (
            <div className="rounded-lg border border-border bg-surface p-6 lg:col-span-2">
              <h3 className="text-sm font-medium text-foreground">
                Subescalas com maior risco
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Top 8 por percentual de respondentes em risco —{" "}
                {avaliacaoSelecionada?.nome}
              </p>
              <div className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subescala</TableHead>
                      <TableHead className="text-right">% Risco</TableHead>
                      {temComparacao && (
                        <TableHead className="text-right">% Comp.</TableHead>
                      )}
                      <TableHead>PGR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topRisco.map((r) => {
                      const pgr = PGR_LABELS[r.classificacao_pgr];
                      const comp = analiseComparacao.data?.find(
                        (c) => c.subescala_id === r.subescala_id,
                      );
                      const deltaRisco = comp
                        ? r.pct_risco - comp.pct_risco
                        : null;
                      return (
                        <TableRow key={r.subescala_id}>
                          <TableCell className="font-medium">
                            {r.nome}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {r.pct_risco}%
                          </TableCell>
                          {temComparacao && (
                            <TableCell className="text-right tabular-nums">
                              {comp ? (
                                <span className="inline-flex items-baseline gap-1">
                                  <span>{comp.pct_risco}%</span>
                                  {deltaRisco !== null && deltaRisco !== 0 && (
                                    <span
                                      className={`text-[10px] ${
                                        deltaRisco > 0
                                          ? "text-destructive"
                                          : "text-success"
                                      }`}
                                    >
                                      ({deltaRisco > 0 ? "+" : ""}
                                      {deltaRisco})
                                    </span>
                                  )}
                                </span>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                          )}
                          <TableCell>
                            <Badge className={pgr.cor}>{pgr.label}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {avaliacoes && avaliacoes.length > 0 && (
            <div
              className={`rounded-lg border border-border bg-surface p-6 ${analiseCarregada ? "" : "lg:col-span-3"}`}
            >
              <h3 className="text-sm font-medium text-foreground">
                Avaliações recentes
              </h3>
              <ul className="mt-4 space-y-3">
                {avaliacoes.slice(0, 5).map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.empresas_cliente?.nome_fantasia ??
                          a.empresas_cliente?.razao_social}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {a.respostas_completadas}/{a.limite_respostas}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {a.status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Bloco 4: Distribuição por dimensão */}
      {analiseCarregada && dimensaoData.length > 0 && (
        <section className="rounded-lg border border-border bg-surface p-6">
          <h3 className="text-sm font-medium text-foreground">
            Risco por dimensão COPSOQ
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Percentual médio de respondentes em risco por dimensão.
          </p>
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dimensaoData}
                layout="vertical"
                margin={{ left: 20, right: 20 }}
              >
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  fontSize={11}
                />
                <YAxis
                  type="category"
                  dataKey="dimensao"
                  width={180}
                  fontSize={11}
                />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, "Risco"]}
                  cursor={{ fill: "hsl(var(--muted))" }}
                />
                <Bar
                  dataKey="risco"
                  fill="hsl(var(--primary))"
                  radius={[0, 4, 4, 0]}
                  name={avaliacaoSelecionada?.nome ?? "Principal"}
                />
                {temComparacao && (
                  <Bar
                    dataKey="riscoComp"
                    fill="hsl(var(--muted-foreground))"
                    radius={[0, 4, 4, 0]}
                    name={avaliacaoComparacao?.nome ?? "Comparação"}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_auth/dashboard")({
  component: Dashboard,
  staticData: { crumb: "Dashboard" },
});