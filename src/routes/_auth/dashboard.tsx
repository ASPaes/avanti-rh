import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
} from "@/lib/copsoq-calculo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  valueTone = "foreground",
}: {
  label: string;
  value: string;
  detail?: string;
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

  const avaliacaoDestaque = useMemo(() => {
    if (!avaliacoes) return null;
    return avaliacoes.find((a) => a.respostas_completadas >= 5) ?? null;
  }, [avaliacoes]);

  const analise = useAnaliseNr1(
    avaliacaoDestaque?.id,
    avaliacaoDestaque?.modelo_instrumento_id,
  );

  const kpis = useMemo(() => {
    if (!avaliacoes) return null;
    const total = avaliacoes.length;
    const abertas = avaliacoes.filter((a) => a.status === "aberta").length;
    const totalRespondentes = avaliacoes.reduce(
      (acc, a) => acc + a.respostas_completadas,
      0,
    );

    const resultados = analise.data ?? [];
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
  }, [avaliacoes, analise.data]);

  const topIntoleraveis = useMemo(() => {
    if (!analise.data) return [];
    return analise.data
      .filter((r) => r.classificacao_pgr === "intoleravel")
      .slice(0, 3);
  }, [analise.data]);

  const topRisco = useMemo(() => {
    if (!analise.data) return [];
    return [...analise.data]
      .sort((a, b) => b.pct_risco - a.pct_risco)
      .slice(0, 8);
  }, [analise.data]);

  const dimensaoData = useMemo(() => {
    if (!analise.data) return [];
    const agrupados = agruparPorDimensao(analise.data);
    return Object.entries(agrupados)
      .map(([dim, subs]) => ({
        dimensao: DIMENSAO_LABELS[dim] ?? dim,
        risco: Math.round(
          subs.reduce((acc, s) => acc + s.pct_risco, 0) / subs.length,
        ),
        favoravel: Math.round(
          subs.reduce((acc, s) => acc + s.pct_favoravel, 0) / subs.length,
        ),
      }))
      .sort((a, b) => b.risco - a.risco);
  }, [analise.data]);

  const circumference = 2 * Math.PI * 44;
  const ringOffset =
    kpis && kpis.mediaRiscoGeral
      ? circumference - (kpis.mediaRiscoGeral / 100) * circumference
      : circumference;

  const isLoading = avaliacoesLoading || !kpis;
  const semAvaliacoes = !!avaliacoes && avaliacoes.length === 0;
  const analiseCarregada = !!avaliacaoDestaque && !!analise.data;

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
        ) : !avaliacaoDestaque ? (
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
              {avaliacaoDestaque.empresas_cliente?.nome_fantasia ??
                avaliacaoDestaque.empresas_cliente?.razao_social}{" "}
              · {avaliacaoDestaque.nome} ·{" "}
              {avaliacaoDestaque.respostas_completadas} respondentes
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
                {avaliacaoDestaque?.nome}
              </p>
              <div className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subescala</TableHead>
                      <TableHead className="text-right">% Risco</TableHead>
                      <TableHead>PGR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topRisco.map((r) => {
                      const pgr = PGR_LABELS[r.classificacao_pgr];
                      return (
                        <TableRow key={r.subescala_id}>
                          <TableCell className="font-medium">
                            {r.nome}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {r.pct_risco}%
                          </TableCell>
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
                />
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