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
    return avaliacoes.filter((a) => a.respostas_completadas >= 1);
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

  const { data: respondentes } = useQuery<
    Array<{
      id: string;
      sexo: string;
      faixa_etaria: string;
      treinamento_rp: string;
      setor_id: string;
      setores: { id: string; nome: string } | null;
    }>
  >({
    queryKey: ["dashboard-respondentes", avaliacaoSelecionada?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nr1_respondente_anonimo")
        .select(
          "id, sexo, faixa_etaria, treinamento_rp, setor_id, setores(id, nome)",
        )
        .eq("avaliacao_id", avaliacaoSelecionada!.id);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string;
        sexo: string;
        faixa_etaria: string;
        treinamento_rp: string;
        setor_id: string;
        setores: { id: string; nome: string } | null;
      }>;
    },
    enabled: !!avaliacaoSelecionada?.id,
  });

  const { data: respostasRaw } = useQuery<
    Array<{ respondente_id: string; questao_id: string; valor: number }>
  >({
    queryKey: [
      "dashboard-respostas",
      avaliacaoSelecionada?.id,
      respondentes?.length ?? 0,
    ],
    queryFn: async () => {
      const respondentesIds = respondentes?.map((r) => r.id) ?? [];
      if (respondentesIds.length === 0) return [];
      const { data, error } = await supabase
        .from("nr1_resposta")
        .select("respondente_id, questao_id, valor")
        .in("respondente_id", respondentesIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!respondentes && respondentes.length > 0,
  });

  const { data: subescalasConfig } = useQuery<SubescalaConfig[]>({
    queryKey: [
      "dashboard-subescalas",
      avaliacaoSelecionada?.modelo_instrumento_id,
    ],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nr1_modelo_subescala")
        .select(
          "id, codigo, nome, tipo, severidade, dimensao_macro, nr1_modelo_subescala_questao(questao_id)",
        )
        .eq("modelo_id", avaliacaoSelecionada!.modelo_instrumento_id)
        .order("ordem");
      if (error) throw error;
      return (data ?? []).map(
        (s: {
          id: string;
          codigo: string;
          nome: string;
          tipo: string;
          severidade: string;
          dimensao_macro: string;
          nr1_modelo_subescala_questao: { questao_id: string }[] | null;
        }) => ({
          id: s.id,
          codigo: s.codigo,
          nome: s.nome,
          tipo: s.tipo as "positivo" | "negativo",
          severidade: s.severidade as "critica" | "moderada" | "leve",
          dimensao_macro: s.dimensao_macro,
          questao_ids: (s.nr1_modelo_subescala_questao ?? []).map(
            (q) => q.questao_id,
          ),
        }),
      );
    },
    enabled: !!avaliacaoSelecionada?.modelo_instrumento_id,
  });

  const kpis = useMemo(() => {
    if (!avaliacoes) return null;
    const total = avaliacoes.length;
    const abertas = avaliacoes.filter((a) => a.status === "aberta").length;
    const totalRespondentes = avaliacoes.reduce(
      (acc, a) => acc + a.respostas_completadas,
      0,
    );

    const resultados = analisePrincipal.data?.resultados ?? [];
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
  }, [avaliacoes, analisePrincipal.data?.resultados]);

  const kpisComparacao = useMemo(() => {
    if (!analiseComparacao.data?.resultados) return null;
    const resultados = analiseComparacao.data?.resultados;
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
  }, [analiseComparacao.data?.resultados]);

  const topIntoleraveis = useMemo(() => {
    const r = analisePrincipal.data?.resultados;
    if (!r) return [];
    return r.filter((x) => x.classificacao_pgr === "intoleravel").slice(0, 3);
  }, [analisePrincipal.data?.resultados]);

  const topRisco = useMemo(() => {
    const r = analisePrincipal.data?.resultados;
    if (!r) return [];
    return [...r].sort((a, b) => b.pct_risco - a.pct_risco).slice(0, 8);
  }, [analisePrincipal.data?.resultados]);

  const dimensaoData = useMemo(() => {
    if (!analisePrincipal.data?.resultados) return [];
    const agrupados = agruparPorDimensao(analisePrincipal.data?.resultados);
    const agrupadosComp = analiseComparacao.data?.resultados
      ? agruparPorDimensao(analiseComparacao.data?.resultados)
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
  }, [analisePrincipal.data?.resultados, analiseComparacao.data?.resultados]);

  const indiceSaude = useMemo(() => {
    if (!analisePrincipal.data?.resultados) return null;
    const saude = analisePrincipal.data?.resultados.filter(
      (r) => r.dimensao_macro === "saude",
    );
    if (saude.length === 0) return null;
    const mediaRisco = Math.round(
      saude.reduce((acc, s) => acc + s.pct_risco, 0) / saude.length,
    );
    const mediaFavoravel = Math.round(
      saude.reduce((acc, s) => acc + s.pct_favoravel, 0) / saude.length,
    );
    const intoleraveis = saude.filter(
      (s) => s.classificacao_pgr === "intoleravel",
    ).length;
    const substanciais = saude.filter(
      (s) => s.classificacao_pgr === "substancial",
    ).length;
    return {
      mediaRisco,
      mediaFavoravel,
      intoleraveis,
      substanciais,
      total: saude.length,
    };
  }, [analisePrincipal.data?.resultados]);

  const treinamentoStats = useMemo(() => {
    if (!respondentes || respondentes.length === 0) return null;
    const total = respondentes.length;
    const sim = respondentes.filter(
      (r) => r.treinamento_rp === "sim_compreendi",
    ).length;
    const parcial = respondentes.filter(
      (r) => r.treinamento_rp === "mais_ou_menos",
    ).length;
    const nao = respondentes.filter(
      (r) => r.treinamento_rp === "nao_recebi",
    ).length;
    return {
      total,
      sim,
      parcial,
      nao,
      pctSim: Math.round((sim / total) * 100),
      pctParcial: Math.round((parcial / total) * 100),
      pctNao: Math.round((nao / total) * 100),
    };
  }, [respondentes]);

  const socioDemo = useMemo(() => {
    if (!respondentes || respondentes.length === 0) return null;
    const total = respondentes.length;
    const masculino = respondentes.filter((r) => r.sexo === "masculino").length;
    const feminino = respondentes.filter((r) => r.sexo === "feminino").length;
    const ate38 = respondentes.filter((r) => r.faixa_etaria === "ate_38").length;
    const acima38 = respondentes.filter(
      (r) => r.faixa_etaria === "acima_38",
    ).length;
    return {
      total,
      masculino,
      feminino,
      pctMasculino: Math.round((masculino / total) * 100),
      pctFeminino: Math.round((feminino / total) * 100),
      ate38,
      acima38,
      pctAte38: Math.round((ate38 / total) * 100),
      pctAcima38: Math.round((acima38 / total) * 100),
    };
  }, [respondentes]);

  const setoresComparativo = useMemo(() => {
    if (!respondentes || !respostasRaw || !subescalasConfig) return [];
    const setoresMap: Record<
      string,
      { nome: string; respondente_ids: string[] }
    > = {};
    for (const r of respondentes) {
      const nome = r.setores?.nome ?? "Sem setor";
      const sid = r.setor_id;
      if (!setoresMap[sid]) setoresMap[sid] = { nome, respondente_ids: [] };
      setoresMap[sid].respondente_ids.push(r.id);
    }
    return Object.entries(setoresMap)
      .filter(([, s]) => s.respondente_ids.length >= 1)
      .map(([setorId, setor]) => {
        const resultados = calcularCopsoq(
          subescalasConfig,
          respostasRaw as Resposta[],
          setor.respondente_ids,
        );
        const intoleraveis = resultados.filter(
          (r) => r.classificacao_pgr === "intoleravel",
        ).length;
        const substanciais = resultados.filter(
          (r) => r.classificacao_pgr === "substancial",
        ).length;
        const mediaRisco =
          resultados.length > 0
            ? Math.round(
                resultados.reduce((acc, r) => acc + r.pct_risco, 0) /
                  resultados.length,
              )
            : 0;
        return {
          setorId,
          nome: setor.nome,
          n: setor.respondente_ids.length,
          intoleraveis,
          substanciais,
          emRisco: intoleraveis + substanciais,
          mediaRisco,
        };
      })
      .sort((a, b) => b.emRisco - a.emRisco || b.mediaRisco - a.mediaRisco);
  }, [respondentes, respostasRaw, subescalasConfig]);

  const fatorProtetor = useMemo(() => {
    const r = analisePrincipal.data?.resultados;
    if (!r) return null;
    const positivos = [...r]
      .filter((x) => x.tipo === "positivo")
      .sort((a, b) => b.pct_favoravel - a.pct_favoravel);
    return positivos[0] ?? null;
  }, [analisePrincipal.data?.resultados]);

  const circumference = 2 * Math.PI * 44;
  const ringOffset =
    kpis && kpis.mediaRiscoGeral
      ? circumference - (kpis.mediaRiscoGeral / 100) * circumference
      : circumference;

  const isLoading = avaliacoesLoading || !kpis;
  const semAvaliacoes = !!avaliacoes && avaliacoes.length === 0;
  const analiseCarregada = !!avaliacaoSelecionada && !!analisePrincipal.data?.resultados;
  const temComparacao = !!analiseComparacao.data?.resultados;

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

      {/* Bloco 2.5: Indicadores complementares */}
      {analiseCarregada &&
        (indiceSaude || treinamentoStats || socioDemo) && (
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {indiceSaude && (
              <div className="rounded-lg border border-border bg-surface p-5">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Índice saúde e bem-estar
                </p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-semibold tracking-tight text-primary">
                    {indiceSaude.mediaRisco}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    risco médio
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {indiceSaude.intoleraveis + indiceSaude.substanciais > 0
                    ? `${indiceSaude.intoleraveis} intolerável, ${indiceSaude.substanciais} substancial de ${indiceSaude.total} subescalas.`
                    : "Nenhuma subescala de saúde em risco crítico."}
                </p>
                <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${indiceSaude.mediaRisco}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                  <span>Risco {indiceSaude.mediaRisco}%</span>
                  <span>Favorável {indiceSaude.mediaFavoravel}%</span>
                </div>
              </div>
            )}

            {treinamentoStats && (
              <div className="rounded-lg border border-border bg-surface p-5">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Treinamento riscos psicossociais
                </p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-semibold tracking-tight text-foreground">
                    {treinamentoStats.pctSim}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    treinados
                  </span>
                </div>
                <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-success"
                    style={{ width: `${treinamentoStats.pctSim}%` }}
                  />
                  <div
                    className="h-full bg-warning"
                    style={{ width: `${treinamentoStats.pctParcial}%` }}
                  />
                  <div
                    className="h-full bg-destructive"
                    style={{ width: `${treinamentoStats.pctNao}%` }}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    Sim ({treinamentoStats.sim})
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-warning" />
                    Parcial ({treinamentoStats.parcial})
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-destructive" />
                    Não ({treinamentoStats.nao})
                  </span>
                </div>
                {treinamentoStats.pctNao > 30 && (
                  <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
                    Atenção: {treinamentoStats.pctNao}% sem treinamento.
                    Obrigatório pela NR-1 e Lei 14.457/22.
                  </p>
                )}
              </div>
            )}

            {socioDemo && (
              <div className="rounded-lg border border-border bg-surface p-5">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Perfil dos respondentes
                </p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-semibold tracking-tight text-foreground">
                    {socioDemo.total}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    respondentes
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Sexo</span>
                      <span className="tabular-nums text-muted-foreground">
                        {socioDemo.pctMasculino}% M · {socioDemo.pctFeminino}% F
                      </span>
                    </div>
                    <div className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${socioDemo.pctMasculino}%` }}
                      />
                      <div
                        className="h-full bg-primary/40"
                        style={{ width: `${socioDemo.pctFeminino}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">
                        Faixa etária
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {socioDemo.pctAte38}% ≤38 · {socioDemo.pctAcima38}% &gt;38
                      </span>
                    </div>
                    <div className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${socioDemo.pctAte38}%` }}
                      />
                      <div
                        className="h-full bg-primary/40"
                        style={{ width: `${socioDemo.pctAcima38}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

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
                      const comp = analiseComparacao.data?.resultados.find(
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

      {/* Bloco 3.5: Setores em alerta + Fator protetor */}
      {analiseCarregada &&
        (setoresComparativo.length > 0 || fatorProtetor) && (
          <section className="grid gap-4 lg:grid-cols-3">
            {setoresComparativo.length > 0 && (
              <div className="rounded-lg border border-border bg-surface p-6 lg:col-span-2">
                <h3 className="text-sm font-medium text-foreground">
                  Setores em alerta
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Setores com subescalas Intolerável ou Substancial (N≥5).
                </p>
                <div className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Setor</TableHead>
                        <TableHead className="text-right">N</TableHead>
                        <TableHead className="text-right">
                          % Risco médio
                        </TableHead>
                        <TableHead className="text-right">
                          Intoleráveis
                        </TableHead>
                        <TableHead className="text-right">
                          Substanciais
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {setoresComparativo.map((s) => (
                        <TableRow key={s.setorId}>
                          <TableCell className="font-medium">
                            {s.nome}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {s.n}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {s.mediaRisco}%
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {s.intoleraveis > 0 ? (
                              <Badge className="bg-red-600 text-white">
                                {s.intoleraveis}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {s.substanciais > 0 ? (
                              <Badge className="bg-orange-500 text-white">
                                {s.substanciais}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {fatorProtetor && (
              <div className="rounded-lg border border-border bg-surface p-6">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Fator protetor mais forte
                </p>
                <p className="mt-3 text-base font-medium text-foreground">
                  {fatorProtetor.nome}
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-semibold tracking-tight text-success">
                    {fatorProtetor.pct_favoravel}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    favorável
                  </span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                  {fatorProtetor.pct_favoravel >= 70
                    ? "Ponto forte da organização. Manter e reforçar."
                    : fatorProtetor.pct_favoravel >= 50
                      ? "Fator positivo, mas com espaço para fortalecimento."
                      : "Melhor fator protetor, porém abaixo do ideal."}
                </p>
                <Badge
                  className={`mt-4 ${
                    PGR_LABELS[fatorProtetor.classificacao_pgr]?.cor ?? ""
                  }`}
                >
                  {PGR_LABELS[fatorProtetor.classificacao_pgr]?.label ??
                    fatorProtetor.classificacao_pgr}
                </Badge>
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