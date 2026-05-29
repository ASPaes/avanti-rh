import { useEffect, useMemo, useState } from "react";
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ShieldAlert,
  Plus,
  MoreHorizontal,
  Copy,
  Loader2,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import {
  useAvaliacoesNr1,
  type AvaliacaoNr1,
} from "@/hooks/useAvaliacoesNr1";
import { useEmpresasCliente } from "@/hooks/useEmpresasCliente";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "sem prazo";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
}

function gerarLinkPublico(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from(
    { length: 12 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

function copiarLink(linkPublico: string | null) {
  if (!linkPublico) return;
  const url = `${window.location.origin}/responder/${linkPublico}`;
  navigator.clipboard.writeText(url);
  toast.success("Link copiado!");
}

function AvaliacaoStatusBadge({ status }: { status: string }) {
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

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  const done = current >= total && total > 0;
  return (
    <div className="flex flex-col gap-1 min-w-[100px]">
      <span className="text-[11px] font-mono text-muted-foreground">
        {current} / {total}
      </span>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${done ? "bg-success" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const avaliacaoSchema = z.object({
  empresa_cliente_id: z.string().uuid("Selecione uma empresa"),
  nome: z
    .string()
    .trim()
    .min(3, "Nome obrigatório (mín. 3 caracteres)")
    .max(255),
  data_fim: z.string().optional().or(z.literal("")),
});

type AvaliacaoFormValues = z.infer<typeof avaliacaoSchema>;

function ModuloNr1() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useAvaliacoesNr1();
  const { data: empresas } = useEmpresasCliente();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>("todas");
  const [filtroBusca, setFiltroBusca] = useState<string>("");

  const { data: modelo } = useQuery<{ id: string; nome: string } | null>({
    queryKey: ["nr1-modelos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nr1_modelo_instrumento")
        .select("id, nome")
        .eq("publicado", true)
        .eq("ativo", true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const kpis = useMemo(() => {
    if (!data) return null;
    const total = data.length;
    const abertas = data.filter((a) => a.status === "aberta").length;
    const encerradas = data.filter((a) => a.status === "encerrada").length;
    const totalRespondentes = data.reduce(
      (acc, a) => acc + a.respostas_completadas,
      0,
    );
    const comLimite = data.filter((a) => a.limite_respostas > 0);
    const taxaMedia =
      comLimite.length > 0
        ? Math.round(
            comLimite.reduce(
              (acc, a) =>
                acc + (a.respostas_completadas / a.limite_respostas) * 100,
              0,
            ) / comLimite.length,
          )
        : 0;
    return { total, abertas, encerradas, totalRespondentes, taxaMedia };
  }, [data]);

  const avaliacoesFiltradas = useMemo(() => {
    if (!data) return [];
    return data.filter((a) => {
      if (filtroStatus !== "todos" && a.status !== filtroStatus) return false;
      if (
        filtroEmpresa !== "todas" &&
        a.empresa_cliente_id !== filtroEmpresa
      )
        return false;
      if (filtroBusca.trim()) {
        const termo = filtroBusca.toLowerCase().trim();
        const nomeMatch = a.nome.toLowerCase().includes(termo);
        const empresaMatch =
          a.empresas_cliente?.nome_fantasia
            ?.toLowerCase()
            .includes(termo) ||
          a.empresas_cliente?.razao_social
            ?.toLowerCase()
            .includes(termo);
        if (!nomeMatch && !empresaMatch) return false;
      }
      return true;
    });
  }, [data, filtroStatus, filtroEmpresa, filtroBusca]);

  function limparFiltros() {
    setFiltroStatus("todos");
    setFiltroEmpresa("todas");
    setFiltroBusca("");
  }

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AvaliacaoFormValues>({
    resolver: zodResolver(avaliacaoSchema),
    defaultValues: { empresa_cliente_id: "", nome: "", data_fim: "" },
  });

  const empresaSelecionadaId = watch("empresa_cliente_id");
  const empresaSelecionada = empresas?.find(
    (e) => e.id === empresaSelecionadaId,
  );

  useEffect(() => {
    if (dialogOpen) {
      reset({ empresa_cliente_id: "", nome: "", data_fim: "" });
    }
  }, [dialogOpen, reset]);

  const criarMutation = useMutation({
    mutationFn: async (values: AvaliacaoFormValues) => {
      if (!tenantId) throw new Error("Tenant não selecionado.");
      if (!modelo) throw new Error("Nenhum modelo de instrumento disponível.");
      const empresa = empresas?.find((e) => e.id === values.empresa_cliente_id);
      const { data, error } = await supabase
        .from("nr1_avaliacao")
        .insert({
          tenant_id: tenantId,
          empresa_cliente_id: values.empresa_cliente_id,
          modelo_instrumento_id: modelo.id,
          nome: values.nome.trim(),
          data_fim: values.data_fim
            ? new Date(values.data_fim).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          limite_respostas: empresa?.qtd_colaboradores_estimado ?? 0,
          link_publico: gerarLinkPublico(),
          status: "rascunho",
          created_by: user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Avaliação criada com sucesso.");
      refetch();
      setDialogOpen(false);
      reset();
    },
    onError: (err: Error) =>
      toast.error(err.message || "Erro ao criar avaliação."),
  });

  if (pathname !== "/nr1") {
    return <Outlet />;
  }

  const verDetalhes = (id: string) => {
    navigate({ to: "/nr1/$id", params: { id } });
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
            módulo
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            NR-1 / Riscos psicossociais
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Ciclos de avaliação aplicados às empresas-cliente.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus />
          Nova avaliação
        </Button>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading || !kpis ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-surface p-5"
            >
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-16 mt-3" />
            </div>
          ))
        ) : (
          <>
            <KpiCard
              label="Total de avaliações"
              value={String(kpis.total)}
              detail={`${kpis.abertas} abertas`}
            />
            <KpiCard
              label="Respondentes"
              value={String(kpis.totalRespondentes)}
            />
            <KpiCard
              label="Taxa média de adesão"
              value={`${kpis.taxaMedia}%`}
            />
            <KpiCard label="Encerradas" value={String(kpis.encerradas)} />
          </>
        )}
      </div>

      <div className="bg-surface border border-border rounded-md">
        {data && data.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap px-4 py-3 border-b border-border">
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar avaliação ou empresa..."
                value={filtroBusca}
                onChange={(e) => setFiltroBusca(e.target.value)}
                className="pl-9 h-9 text-[13px]"
              />
            </div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-[150px] h-9 text-[13px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="aberta">Aberta</SelectItem>
                <SelectItem value="encerrada">Encerrada</SelectItem>
                <SelectItem value="analisada">Analisada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroEmpresa} onValueChange={setFiltroEmpresa}>
              <SelectTrigger className="w-[200px] h-9 text-[13px]">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as empresas</SelectItem>
                {(empresas ?? [])
                  .filter((e) => e.status === "ativa")
                  .map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome_fantasia || e.razao_social}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <span className="text-[11px] text-muted-foreground ml-auto">
              {avaliacoesFiltradas.length} de {data.length} avaliações
            </span>
          </div>
        )}
        {error ? (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertTitle>Erro ao carregar avaliações</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          </div>
        ) : isLoading ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Respostas</TableHead>
                <TableHead>Período</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {[0, 1, 2].map((i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j} className="py-3 px-4">
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : !data || data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <ShieldAlert
              size={36}
              className="text-muted-foreground/50 mb-3"
              strokeWidth={1.5}
            />
            <p className="text-sm text-muted-foreground mb-4">
              Nenhuma avaliação criada.
            </p>
            <Button variant="ghost" onClick={() => setDialogOpen(true)}>
              <Plus />
              Criar primeira avaliação
            </Button>
          </div>
        ) : avaliacoesFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <Search
              size={32}
              className="text-muted-foreground/50 mb-3"
              strokeWidth={1.5}
            />
            <p className="text-sm text-muted-foreground mb-4">
              Nenhuma avaliação encontrada com os filtros aplicados.
            </p>
            <Button variant="ghost" onClick={limparFiltros}>
              Limpar filtros
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-3 px-4 text-[13px]">Nome</TableHead>
                <TableHead className="py-3 px-4 text-[13px]">Modelo</TableHead>
                <TableHead className="py-3 px-4 text-[13px]">Status</TableHead>
                <TableHead className="py-3 px-4 text-[13px]">
                  Respostas
                </TableHead>
                <TableHead className="py-3 px-4 text-[13px]">Período</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {avaliacoesFiltradas.map((a: AvaliacaoNr1) => (
                <TableRow key={a.id} className="border-b border-border">
                  <TableCell className="py-3 px-4 text-[13px] font-medium">
                    <div className="flex flex-col">
                      <Link
                        to="/nr1/$id"
                        params={{ id: a.id }}
                        className="text-foreground hover:underline"
                      >
                        {a.nome}
                      </Link>
                      <span className="text-[11px] text-muted-foreground">
                        {a.empresas_cliente?.nome_fantasia ??
                          a.empresas_cliente?.razao_social}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-4 text-[12px] text-muted-foreground">
                    {a.nr1_modelo_instrumento?.nome ?? "—"}
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <AvaliacaoStatusBadge status={a.status} />
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <ProgressBar
                      current={a.respostas_completadas}
                      total={a.limite_respostas}
                    />
                  </TableCell>
                  <TableCell className="py-3 px-4 text-[12px] text-muted-foreground">
                    {formatDate(a.data_inicio)} → {formatDate(a.data_fim)}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Ações"
                          className="h-8 w-8"
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => verDetalhes(a.id)}>
                          Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => copiarLink(a.link_publico)}
                          disabled={!a.link_publico}
                        >
                          <Copy />
                          Copiar link
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova avaliação NR-1</DialogTitle>
            <DialogDescription>
              Crie um novo ciclo de avaliação de riscos psicossociais.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((v) => criarMutation.mutate(v))}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="empresa_cliente_id">Empresa-cliente *</Label>
              <Select
                value={empresaSelecionadaId}
                onValueChange={(v) =>
                  setValue("empresa_cliente_id", v, { shouldValidate: true })
                }
              >
                <SelectTrigger id="empresa_cliente_id">
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  {(empresas ?? [])
                    .filter((e) => e.status === "ativa")
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.razao_social}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.empresa_cliente_id && (
                <span className="text-[12px] text-destructive">
                  {errors.empresa_cliente_id.message}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                placeholder="Ex: Ciclo 2026-Q3"
                {...register("nome")}
              />
              {errors.nome && (
                <span className="text-[12px] text-destructive">
                  {errors.nome.message}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="data_fim">Data limite (opcional)</Label>
              <Input id="data_fim" type="date" {...register("data_fim")} />
            </div>

            <div className="flex flex-col gap-1 pt-2 border-t border-border/30">
              <span className="text-[12px] text-muted-foreground">
                Instrumento: {modelo?.nome ?? "—"}
              </span>
              <span className="text-[12px] text-muted-foreground">
                {empresaSelecionada?.qtd_colaboradores_estimado
                  ? `Limite de respostas: ${empresaSelecionada.qtd_colaboradores_estimado}`
                  : empresaSelecionada
                    ? "Atualize a qtd. de colaboradores na empresa"
                    : "Limite de respostas: —"}
              </span>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={criarMutation.isPending}>
                {criarMutation.isPending && (
                  <Loader2 className="animate-spin" />
                )}
                Criar avaliação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute("/_auth/nr1")({
  component: ModuloNr1,
  staticData: { crumb: "NR-1 / Psicossociais" },
});