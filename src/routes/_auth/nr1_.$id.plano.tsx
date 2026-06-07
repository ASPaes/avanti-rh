import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ShieldAlert,
  Calendar,
  User as UserIcon,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type Status = "pendente" | "em_andamento" | "concluida" | "cancelada";

type ClassificacaoPgr =
  | "intoleravel"
  | "substancial"
  | "moderado"
  | "toleravel"
  | "trivial";

interface ResultadoItem {
  subescala_id: string;
  codigo: string;
  nome: string;
  severidade: string;
  dimensao_macro: string;
  classificacao_pgr: ClassificacaoPgr;
}

interface CatalogoItem {
  id: string;
  codigo: string;
  nome: string;
  severidade: string;
  texto_significado: string | null;
  texto_agravos: string | null;
  texto_acoes_pgr: string | null;
  catalogo_status: string | null;
}

interface Setor {
  id: string;
  nome: string;
}

interface Avaliacao {
  id: string;
  nome: string;
  empresa_cliente_id: string;
  tenant_id: string;
  modelo_instrumento_id: string;
  empresas_cliente: { razao_social: string; nome_fantasia: string | null } | null;
}

interface Acao {
  id: string;
  setor_id: string | null;
  subescala_id: string;
  nivel_risco_origem: string;
  o_que: string | null;
  por_que: string | null;
  onde: string | null;
  quando: string | null;
  quem: string | null;
  como: string | null;
  quanto: string | null;
  status: string;
  prazo: string | null;
  responsavel: string | null;
  ordem: number;
  created_at: string;
  gerado_por_ia: boolean | null;
}

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const STATUS_FILTROS: Array<{ value: "todos" | Status; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "pendente", label: "Pendente" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "cancelada", label: "Cancelada" },
];

const PGR_BADGE: Record<string, { label: string; cor: string }> = {
  intoleravel: { label: "Intolerável", cor: "bg-red-600 text-white" },
  substancial: { label: "Substancial", cor: "bg-orange-500 text-white" },
  moderado: { label: "Moderado", cor: "bg-amber-500 text-white" },
  toleravel: { label: "Tolerável", cor: "bg-emerald-600 text-white" },
  trivial: { label: "Trivial", cor: "bg-slate-500 text-white" },
};

const CAMPOS_5W2H: Array<{ key: keyof Acao; label: string }> = [
  { key: "o_que", label: "O quê" },
  { key: "por_que", label: "Por quê" },
  { key: "onde", label: "Onde" },
  { key: "quando", label: "Quando" },
  { key: "quem", label: "Quem" },
  { key: "como", label: "Como" },
  { key: "quanto", label: "Quanto" },
];

function camposFaltantes(a: Acao): string[] {
  const out: string[] = [];
  for (const c of CAMPOS_5W2H) {
    const v = a[c.key];
    if (typeof v !== "string" || !v.trim()) out.push(c.label);
  }
  return out;
}

function formatDate(d: string | null): string {
  if (!d) return "";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return d;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function PlanoAcaoPage() {
  const { id: avaliacaoId } = Route.useParams();
  const { user } = useAuth();

  const [carregando, setCarregando] = useState(true);
  const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(null);
  const [bloqueado, setBloqueado] = useState(false);
  const [resultados, setResultados] = useState<ResultadoItem[]>([]);
  const [todosResultados, setTodosResultados] = useState<ResultadoItem[]>([]);
  const [catalogo, setCatalogo] = useState<Record<string, CatalogoItem>>({});
  const [setores, setSetores] = useState<Setor[]>([]);
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<"todos" | Status>("todos");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [subescalaAtual, setSubescalaAtual] = useState<ResultadoItem | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluirId, setExcluirId] = useState<string | null>(null);
  const [gerandoIa, setGerandoIa] = useState(false);
  const [progressoIa, setProgressoIa] = useState<{ atual: number; total: number } | null>(null);
  const [atualizandoIaId, setAtualizandoIaId] = useState<string | null>(null);
  const [outraOpen, setOutraOpen] = useState(false);

  const [oQue, setOQue] = useState("");
  const [porQue, setPorQue] = useState("");
  const [onde, setOnde] = useState("");
  const [quando, setQuando] = useState("");
  const [quem, setQuem] = useState("");
  const [como, setComo] = useState("");
  const [quanto, setQuanto] = useState("");
  const [setorId, setSetorId] = useState<string>("__null");
  const [prazo, setPrazo] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [status, setStatus] = useState<Status>("pendente");

  async function carregarAcoes(avId: string) {
    const { data, error } = await supabase
      .from("nr1_plano_acao")
      .select(
        "id, setor_id, subescala_id, nivel_risco_origem, o_que, por_que, onde, quando, quem, como, quanto, status, prazo, responsavel, ordem, created_at, gerado_por_ia",
      )
      .eq("avaliacao_id", avId)
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    setAcoes((data ?? []) as Acao[]);
  }

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      setCarregando(true);
      try {
        const { data: av, error: errAv } = await supabase
          .from("nr1_avaliacao")
          .select(
            "id, nome, empresa_cliente_id, tenant_id, modelo_instrumento_id, empresas_cliente(razao_social, nome_fantasia)",
          )
          .eq("id", avaliacaoId)
          .maybeSingle();
        if (errAv) throw errAv;
        if (!av) {
          if (!cancelado) setAvaliacao(null);
          return;
        }
        if (!cancelado) setAvaliacao(av as unknown as Avaliacao);

        const { data: rpc, error: errRpc } = await supabase.rpc(
          "nr1_resultado_avaliacao",
          { p_avaliacao_id: avaliacaoId },
        );
        if (errRpc) throw errRpc;
        const payload = rpc as {
          bloqueado?: boolean;
          resultados?: ResultadoItem[];
          error?: string;
        } | null;
        if (payload?.error) throw new Error(payload.error);
        if (payload?.bloqueado) {
          if (!cancelado) {
            setBloqueado(true);
            setResultados([]);
            setTodosResultados([]);
          }
        } else {
          const todos = payload?.resultados ?? [];
          const prioritarios = todos.filter(
            (r) =>
              r.classificacao_pgr === "intoleravel" ||
              r.classificacao_pgr === "substancial",
          );
          const ordemSev: Record<string, number> = {
            intoleravel: 0,
            substancial: 1,
          };
          prioritarios.sort(
            (a, b) =>
              (ordemSev[a.classificacao_pgr] ?? 9) -
              (ordemSev[b.classificacao_pgr] ?? 9),
          );
          if (!cancelado) {
            setBloqueado(false);
            setResultados(prioritarios);
            setTodosResultados(todos);
          }

          const { data: cat, error: errCat } = await supabase
            .from("nr1_modelo_subescala")
            .select(
              "id, codigo, nome, severidade, texto_significado, texto_agravos, texto_acoes_pgr, catalogo_status",
            )
            .eq("modelo_id", (av as { modelo_instrumento_id: string }).modelo_instrumento_id);
          if (errCat) throw errCat;
          const map: Record<string, CatalogoItem> = {};
          for (const c of (cat ?? []) as CatalogoItem[]) map[c.id] = c;
          if (!cancelado) setCatalogo(map);
        }

        const { data: sets, error: errSet } = await supabase
          .from("setores")
          .select("id, nome")
          .eq("empresa_cliente_id", (av as { empresa_cliente_id: string }).empresa_cliente_id)
          .eq("ativo", true)
          .order("nome", { ascending: true });
        if (errSet) throw errSet;
        if (!cancelado) setSetores((sets ?? []) as Setor[]);

        await carregarAcoes(avaliacaoId);
      } catch (e) {
        if (!cancelado) {
          toast.error("Erro ao carregar plano de ação.", {
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

  const acoesPorSubescala = useMemo(() => {
    const map: Record<string, Acao[]> = {};
    for (const a of acoes) {
      const list = map[a.subescala_id] ?? [];
      if (filtroStatus === "todos" || a.status === filtroStatus) list.push(a);
      map[a.subescala_id] = list;
    }
    return map;
  }, [acoes, filtroStatus]);

  function abrirNova(sub: ResultadoItem) {
    setEditandoId(null);
    setSubescalaAtual(sub);
    const cat = catalogo[sub.subescala_id];
    setOQue(cat?.texto_acoes_pgr ?? "");
    setPorQue("");
    setOnde("");
    setQuando("");
    setQuem("");
    setComo("");
    setQuanto("");
    setSetorId("__null");
    setPrazo("");
    setResponsavel("");
    setStatus("pendente");
    setDialogOpen(true);
  }

  function abrirEditar(a: Acao) {
    const sub = resultados.find((r) => r.subescala_id === a.subescala_id) ?? null;
    setSubescalaAtual(sub);
    setEditandoId(a.id);
    setOQue(a.o_que ?? "");
    setPorQue(a.por_que ?? "");
    setOnde(a.onde ?? "");
    setQuando(a.quando ?? "");
    setQuem(a.quem ?? "");
    setComo(a.como ?? "");
    setQuanto(a.quanto ?? "");
    setSetorId(a.setor_id ?? "__null");
    setPrazo(a.prazo ?? "");
    setResponsavel(a.responsavel ?? "");
    setStatus((a.status as Status) ?? "pendente");
    setDialogOpen(true);
  }

  async function handleSalvar() {
    if (!oQue.trim()) {
      toast.error("O campo \"O quê\" é obrigatório.");
      return;
    }
    if (!avaliacao) return;

    setSalvando(true);
    try {
      if (editandoId) {
        const { error } = await supabase
          .from("nr1_plano_acao")
          .update({
            o_que: oQue.trim(),
            por_que: porQue.trim() || null,
            onde: onde.trim() || null,
            quando: quando.trim() || null,
            quem: quem.trim() || null,
            como: como.trim() || null,
            quanto: quanto.trim() || null,
            setor_id: setorId === "__null" ? null : setorId,
            prazo: prazo || null,
            responsavel: responsavel.trim() || null,
            status,
          })
          .eq("id", editandoId);
        if (error) throw error;
        toast.success("Ação atualizada.");
      } else {
        if (!subescalaAtual) return;
        const { error } = await supabase.from("nr1_plano_acao").insert({
          avaliacao_id: avaliacao.id,
          subescala_id: subescalaAtual.subescala_id,
          tenant_id: avaliacao.tenant_id,
          nivel_risco_origem: subescalaAtual.classificacao_pgr,
          created_by: user?.id ?? null,
          o_que: oQue.trim(),
          por_que: porQue.trim() || null,
          onde: onde.trim() || null,
          quando: quando.trim() || null,
          quem: quem.trim() || null,
          como: como.trim() || null,
          quanto: quanto.trim() || null,
          setor_id: setorId === "__null" ? null : setorId,
          prazo: prazo || null,
          responsavel: responsavel.trim() || null,
          status,
        });
        if (error) throw error;
        toast.success("Ação criada.");
      }
      setDialogOpen(false);
      await carregarAcoes(avaliacao.id);
    } catch (e) {
      toast.error("Erro ao salvar ação.", {
        description: e instanceof Error ? e.message : "Tente novamente.",
      });
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir() {
    if (!excluirId || !avaliacao) return;
    try {
      const { error } = await supabase
        .from("nr1_plano_acao")
        .delete()
        .eq("id", excluirId);
      if (error) throw error;
      toast.success("Ação excluída.");
      await carregarAcoes(avaliacao.id);
    } catch (e) {
      toast.error("Erro ao excluir.", {
        description: e instanceof Error ? e.message : "Tente novamente.",
      });
    } finally {
      setExcluirId(null);
    }
  }

  if (carregando) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!avaliacao) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-4">
        <Link to="/nr1" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} />
          Avaliações NR-1
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Avaliação não encontrada</h1>
      </div>
    );
  }

  const empresaNome =
    avaliacao.empresas_cliente?.nome_fantasia ??
    avaliacao.empresas_cliente?.razao_social ??
    "—";

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

      <header className="space-y-2">
        <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
          plano de ação 5w2h
        </p>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#234A6E" }}>
          {avaliacao.nome}
        </h1>
        <p className="text-sm text-muted-foreground">{empresaNome}</p>
      </header>

      {bloqueado ? (
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            Resultado indisponível: menos de 5 respondentes (proteção LGPD).
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_FILTROS.map((f) => {
              const ativo = filtroStatus === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFiltroStatus(f.value)}
                  className="px-3 py-1.5 rounded-full text-[12px] border transition-colors"
                  style={
                    ativo
                      ? { backgroundColor: "#234A6E", color: "white", borderColor: "#234A6E" }
                      : { borderColor: "rgba(0,0,0,0.12)" }
                  }
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {resultados.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Nenhum risco prioritário (substancial ou intolerável) identificado nesta avaliação.
            </Card>
          ) : (
            <div className="space-y-4">
              {resultados.map((sub) => {
                const cat = catalogo[sub.subescala_id];
                const lista = acoesPorSubescala[sub.subescala_id] ?? [];
                const totalSub = acoes.filter((a) => a.subescala_id === sub.subescala_id).length;
                const badge = PGR_BADGE[sub.classificacao_pgr];
                return (
                  <Card key={sub.subescala_id} className="p-5 space-y-4 border-border/60">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-semibold" style={{ color: "#234A6E" }}>
                            {sub.nome}
                          </h2>
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {sub.codigo}
                          </span>
                          {badge && (
                            <Badge className={`${badge.cor} text-[10px]`}>{badge.label}</Badge>
                          )}
                          <span className="text-[11px] text-muted-foreground">
                            {totalSub} {totalSub === 1 ? "ação" : "ações"}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => abrirNova(sub)}
                        style={{ backgroundColor: "#234A6E" }}
                      >
                        <Plus size={14} />
                        Adicionar ação
                      </Button>
                    </div>

                    {lista.length === 0 ? (
                      <p className="text-[12px] text-muted-foreground italic">
                        {filtroStatus === "todos"
                          ? "Nenhuma ação cadastrada para este risco."
                          : "Nenhuma ação com este status."}
                      </p>
                    ) : (
                      <ul className="divide-y divide-border/60">
                        {lista.map((a) => {
                          const setor = setores.find((s) => s.id === a.setor_id);
                          return (
                            <li key={a.id} className="py-3 flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1 space-y-1.5">
                                <p className="text-[13px] text-foreground line-clamp-2">
                                  {a.o_que ?? "(sem descrição)"}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                  <Badge variant="outline" className="text-[10px]">
                                    {STATUS_LABEL[a.status] ?? a.status}
                                  </Badge>
                                  {setor && <span>· {setor.nome}</span>}
                                  {a.prazo && (
                                    <span className="inline-flex items-center gap-1">
                                      <Calendar size={11} /> {formatDate(a.prazo)}
                                    </span>
                                  )}
                                  {a.responsavel && (
                                    <span className="inline-flex items-center gap-1">
                                      <UserIcon size={11} /> {a.responsavel}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => abrirEditar(a)}
                                >
                                  <Pencil size={14} style={{ color: "#234A6E" }} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setExcluirId(a.id)}
                                >
                                  <Trash2 size={14} style={{ color: "#ED7D6E" }} />
                                </Button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {cat && (
                      <p className="text-[11px] text-muted-foreground border-t border-border/40 pt-2">
                        Sugestão de ação do catálogo · severidade {cat.severidade}
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ color: "#234A6E" }}>
              {editandoId ? "Editar ação" : "Nova ação"}
            </DialogTitle>
            {subescalaAtual && (
              <p className="text-[12px] text-muted-foreground">
                {subescalaAtual.nome} · {subescalaAtual.codigo}
              </p>
            )}
          </DialogHeader>

          <div className="mt-2 space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <Label className="text-[12px]">O quê *</Label>
                {subescalaAtual && catalogo[subescalaAtual.subescala_id]?.catalogo_status === "parcial" && (
                  <Badge variant="outline" className="text-[10px]" style={{ color: "#ED7D6E", borderColor: "#ED7D6E" }}>
                    Rascunho não validado
                  </Badge>
                )}
              </div>
              <Textarea
                value={oQue}
                onChange={(e) => setOQue(e.target.value)}
                rows={4}
                className="mt-1.5"
                placeholder="Descreva a ação a executar"
              />
            </div>

            <div>
              <Label className="text-[12px]">Por quê</Label>
              <Textarea
                value={porQue}
                onChange={(e) => setPorQue(e.target.value)}
                rows={3}
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-[12px]">Onde</Label>
                <Input value={onde} onChange={(e) => setOnde(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-[12px]">Quando</Label>
                <Input value={quando} onChange={(e) => setQuando(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-[12px]">Quem</Label>
                <Input value={quem} onChange={(e) => setQuem(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-[12px]">Quanto</Label>
                <Input value={quanto} onChange={(e) => setQuanto(e.target.value)} className="mt-1.5" />
              </div>
            </div>

            <div>
              <Label className="text-[12px]">Como</Label>
              <Textarea
                value={como}
                onChange={(e) => setComo(e.target.value)}
                rows={3}
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-[12px]">Setor</Label>
                <Select value={setorId} onValueChange={setSetorId}>
                  <SelectTrigger className="mt-1.5 h-9 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__null" className="text-[13px]">Geral (sem setor)</SelectItem>
                    {setores.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-[13px]">
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12px]">Prazo</Label>
                <Input
                  type="date"
                  value={prazo}
                  onChange={(e) => setPrazo(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-[12px]">Responsável</Label>
                <Input
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label className="text-[12px]">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger className="mt-1.5 h-9 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente" className="text-[13px]">Pendente</SelectItem>
                  <SelectItem value="em_andamento" className="text-[13px]">Em andamento</SelectItem>
                  <SelectItem value="concluida" className="text-[13px]">Concluída</SelectItem>
                  <SelectItem value="cancelada" className="text-[13px]">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-6 gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar} disabled={salvando} style={{ backgroundColor: "#234A6E" }}>
              {salvando ? <Loader2 className="animate-spin" size={14} /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!excluirId} onOpenChange={(o) => { if (!o) setExcluirId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExcluirId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir} style={{ backgroundColor: "#ED7D6E" }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const Route = createFileRoute("/_auth/nr1_/$id/plano")({
  component: PlanoAcaoPage,
  staticData: { crumb: "Plano de ação" },
});