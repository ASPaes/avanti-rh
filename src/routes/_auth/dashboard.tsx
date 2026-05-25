import { createFileRoute } from "@tanstack/react-router";

function KpiCard({
  label,
  value,
  delta,
  deltaTone = "muted",
  valueTone = "foreground",
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "success" | "warning" | "muted";
  valueTone?: "foreground" | "primary";
}) {
  const valueColor =
    valueTone === "primary" ? "text-primary" : "text-foreground";
  const deltaColor =
    deltaTone === "success"
      ? "text-success"
      : deltaTone === "warning"
      ? "text-warning"
      : "text-muted-foreground";

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className="mt-3 flex items-baseline gap-2">
        <span className={`text-3xl font-semibold tracking-tight ${valueColor}`}>
          {value}
        </span>
        {delta && <span className={`text-xs ${deltaColor}`}>{delta}</span>}
      </div>
    </div>
  );
}

function PlaceholderCard({
  title,
  subtitle,
  className = "",
}: {
  title: string;
  subtitle: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-dashed border-border bg-surface/40 p-6 ${className}`}
    >
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      <div className="mt-8 flex h-32 items-center justify-center rounded-md bg-muted/30 text-[10px] uppercase tracking-widest text-muted-foreground">
        Aguardando dados do módulo NR-1
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-10">
      {/* Bloco 1: Hero narrativo */}
      <section className="grid gap-8 md:grid-cols-[1fr_auto] items-end">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Saúde psicossocial · Empodhera · 247 respondentes
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight tracking-tight">
            27% dos colaboradores
            <br />
            <span className="text-primary">sinalizam risco crítico.</span>
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground leading-relaxed">
            Subescalas Burnout, Stress e Sintomas Depressivos com tercil
            desfavorável acima do esperado em 3 dos 4 GHEs avaliados neste
            ciclo.
          </p>
        </div>

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
              strokeDasharray="276.46"
              strokeDashoffset="88.47"
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="flex flex-col items-center">
            <span className="text-2xl font-semibold tracking-tight">3.4</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              / 5.0
            </span>
          </div>
          <p className="absolute -bottom-5 text-[10px] uppercase tracking-widest text-muted-foreground">
            Índice geral
          </p>
        </div>
      </section>

      {/* Bloco 2: 4 KPI cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Risco crítico"
          value="27%"
          delta="+4 vs ciclo anterior"
          deltaTone="warning"
          valueTone="primary"
        />
        <KpiCard
          label="Respondentes"
          value="247"
          delta="89% de adesão"
          deltaTone="success"
        />
        <KpiCard
          label="GHEs avaliados"
          value="4"
          delta="3 com alerta"
          deltaTone="warning"
        />
        <KpiCard
          label="Plano de ação"
          value="12"
          delta="ações abertas"
          deltaTone="muted"
        />
      </section>

      {/* Bloco 3: Placeholders */}
      <section className="grid gap-4 lg:grid-cols-3">
        <PlaceholderCard
          title="Distribuição por subescala"
          subtitle="Burnout, Stress, Sintomas depressivos"
          className="lg:col-span-2"
        />
        <PlaceholderCard
          title="GHEs em alerta"
          subtitle="Tercil desfavorável"
        />
      </section>

      <section>
        <PlaceholderCard
          title="Linha do tempo do ciclo"
          subtitle="Aplicação, análise e devolutiva"
        />
      </section>
    </div>
  );
}

export const Route = createFileRoute("/_auth/dashboard")({
  component: Dashboard,
  staticData: { crumb: "Dashboard" },
});