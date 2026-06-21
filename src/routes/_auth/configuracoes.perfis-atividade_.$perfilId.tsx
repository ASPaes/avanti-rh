import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Severidade = "leve" | "moderada" | "critica";
type ClassificacaoMinima =
  | "trivial"
  | "toleravel"
  | "moderado"
  | "substancial"
  | "intoleravel";

interface Perfil {
  id: string;
  tenant_id: string | null;
  nome: string;
  descricao: string | null;
  origem: string;
}

interface CatalogoItem {
  codigo: string;
  nome: string;
  dimensao_macro: string;
  severidade: Severidade;
  tipo: string;
  ordem: number;
}

interface Override {
  id: string;
  subescala_codigo: string;
  severidade: Severidade;
  classificacao_minima: ClassificacaoMinima | null;
  permitir_rebaixar: boolean;
  justificativa: string | null;
  responsavel_tecnico_id: string | null;
}

interface RT {
  id: string;
  nome: string;
  tipo_conselho: string;
  uf_conselho: string | null;
  numero_registro: string;
}

const DIMENSAO_LABEL: Record<string, string> = {
  demandas: "Exigências laborais",
  organizacao: "Organização e conteúdo do trabalho",
  relacoes: "Relações sociais e liderança",
  valores: "Valores no local de trabalho",
  personalidade: "Fatores de personalidade",
  interface: "Interface trabalho-indivíduo",
  saude: "Saúde e bem-estar",
  comportamentos: "Comportamentos ofensivos",
};

const DIMENSAO_ORDEM = [
  "demandas",
  "organizacao",
  "relacoes",
  "valores",
  "personalidade",
  "interface",
  "saude",
  "comportamentos",
];

const SEVERIDADE_LABEL: Record<Severidade, string> = {
  critica: "Crítica",
  moderada: "Moderada",
  leve: "Leve",
};

const SEV_ORD: Record<Severidade, number> = { leve: 1, moderada: 2, critica: 3 };

function severidadeClass(s: Severidade) {
  switch (s) {
    case "critica":
      return "bg-destructive/15 text-destructive border-destructive/30";
    case "moderada":
      return "bg-amber-500/15 text-amber-500 border-amber-500/30";
    case "leve":
      return "bg-muted text-muted-foreground border-border";
  }
}

const CLASSIF_LABEL: Record<ClassificacaoMinima, string> = {
  trivial: "Trivial",
  toleravel: "Tolerável",
  moderado: "Moderado",
  substancial: "Substancial",
  intoleravel: "Intolerável",
};

function PerfilSeveridades() {
  const { perfilId } = Route.useParams();
  const { roles, user, loading: authLoading } = useAuth();
  const { tenantId, selectedTenantId } = useTenant();
  const navigate = useNavigate();
  const isSuperAdmin = roles.includes("super_admin");
  const isTenantAdmin = roles.includes("tenant_admin");
  const podeVer = isSuperAdmin || isTenantAdmin;

  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [rts, setRts] = useState<RT[]>([]);

  const [selecionada, setSelecionada] = useState<CatalogoItem | null>(null);
  const [salvando, setSalvando] = useState(false);

  // form state
  const [fSeveridade, setFSeveridade] = useState<Severidade>("leve");
  const [fClassMin, setFClassMin] = useState<string>("nenhum");
  const [fPermitirRebaixar, setFPermitirRebaixar] = useState(false);
  const [fJustificativa, setFJustificativa] = useState("");
  const [fRtId, setFRtId] = useState<string>("nenhum");

  useEffect(() => {
    if (!authLoading && !podeVer) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [authLoading, podeVer, navigate]);

  async function carregar() {
    setCarregando(true);
    try {
      const [perfilRes, catRes, ovRes, rtRes] = await Promise.all([
        supabase
          .from("nr1_perfil_atividade")
          .select("id, tenant_id, nome, descricao, origem")
          .eq("id", perfilId)
          .single(),
        supabase
          .from("nr1_catalogo_editor")
          .select("codigo, nome, dimensao_macro, severidade, tipo, ordem")
          .order("ordem"),
        supabase
          .from("nr1_severidade_override")
          .select(
            "id, subescala_codigo, severidade, classificacao_minima, permitir_rebaixar, justificativa, responsavel_tecnico_id",
          )
          .eq("escopo", "perfil")
          .eq("perfil_id", perfilId),
        supabase
          .from("responsavel_tecnico")
          .select("id, nome, tipo_conselho, uf_conselho, numero_registro")
          .eq("ativo", true)
          .order("nome"),
      ]);
      if (perfilRes.error) throw perfilRes.error;
      if (catRes.error) throw catRes.error;
      if (ovRes.error) throw ovRes.error;
      if (rtRes.error) throw rtRes.error;
      setPerfil(perfilRes.data as Perfil);
      setCatalogo((catRes.data ?? []) as CatalogoItem[]);
      setOverrides((ovRes.data ?? []) as Override[]);
      setRts((rtRes.data ?? []) as RT[]);
    } catch (e) {
      toast.error("Erro ao carregar perfil.", {
        description: e instanceof Error ? e.message : "Tente novamente.",
      });
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (podeVer) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podeVer, perfilId, tenantId, selectedTenantId]);

  const overrideByCodigo = useMemo(() => {
    const m = new Map<string, Override>();
    overrides.forEach((o) => m.set(o.subescala_codigo, o));
    return m;
  }, [overrides]);

  const grupos = useMemo(() => {
    const map = new Map<string, CatalogoItem[]>();
    catalogo.forEach((c) => {
      const arr = map.get(c.dimensao_macro) ?? [];
      arr.push(c);
      map.set(c.dimensao_macro, arr);
    });
    return DIMENSAO_ORDEM.filter((d) => map.has(d)).map((d) => ({
      dimensao: d,
      label: DIMENSAO_LABEL[d] ?? d,
      itens: (map.get(d) ?? []).sort((a, b) => a.ordem - b.ordem),
    }));
  }, [catalogo]);

  const somenteLeitura = perfil?.tenant_id === null;

  function abrirDialog(item: CatalogoItem) {
    if (somenteLeitura) return;
    setSelecionada(item);
    const ov = overrideByCodigo.get(item.codigo);
    setFSeveridade(ov?.severidade ?? item.severidade);
    setFClassMin(ov?.classificacao_minima ?? "nenhum");
    setFPermitirRebaixar(ov?.permitir_rebaixar ?? false);
    setFJustificativa(ov?.justificativa ?? "");
    setFRtId(ov?.responsavel_tecnico_id ?? "nenhum");
  }

  function fecharDialog() {
    setSelecionada(null);
  }

  const estaRebaixando = useMemo(() => {
    if (!selecionada) return false;
    return SEV_ORD[fSeveridade] < SEV_ORD[selecionada.severidade];
  }, [selecionada, fSeveridade]);

  const podeSalvar = useMemo(() => {
    if (!estaRebaixando) return true;
    return fPermitirRebaixar && fJustificativa.trim().length > 0;
  }, [estaRebaixando, fPermitirRebaixar, fJustificativa]);

  function traduzirErro(msg: string): string {
    if (msg.includes("rebaixar_bloqueado")) {
      return "Para reduzir a severidade abaixo do padrão, ative 'Permitir rebaixar'.";
    }
    if (msg.includes("rebaixar_sem_justificativa")) {
      return "Rebaixar a severidade exige justificativa.";
    }
    if (msg.includes("override_em_perfil_nao_proprio")) {
      return "Este é um modelo do sistema. Duplique-o antes de personalizar.";
    }
    return msg;
  }

  async function handleSalvar() {
    if (!selecionada || !perfil) return;
    const ov = overrideByCodigo.get(selecionada.codigo);
    const payload = {
      escopo: "perfil" as const,
      perfil_id: perfilId,
      empresa_cliente_id: null,
      subescala_codigo: selecionada.codigo,
      severidade: fSeveridade,
      classificacao_minima:
        fClassMin === "nenhum" ? null : (fClassMin as ClassificacaoMinima),
      permitir_rebaixar: estaRebaixando ? fPermitirRebaixar : false,
      justificativa: estaRebaixando
        ? fJustificativa.trim() || null
        : fJustificativa.trim() || null,
      responsavel_tecnico_id: fRtId === "nenhum" ? null : fRtId,
    };

    setSalvando(true);
    try {
      if (ov) {
        const { error } = await supabase
          .from("nr1_severidade_override")
          .update(payload as never)
          .eq("id", ov.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("nr1_severidade_override")
          .insert(payload as never);
        if (error) throw error;
      }
      toast.success("Severidade salva.");
      fecharDialog();
      await carregar();
    } catch (e) {
      toast.error("Erro ao salvar.", {
        description: traduzirErro(
          e instanceof Error ? e.message : "Tente novamente.",
        ),
      });
    } finally {
      setSalvando(false);
    }
  }

  async function handleRemover() {
    if (!selecionada) return;
    const ov = overrideByCodigo.get(selecionada.codigo);
    if (!ov) return;
    setSalvando(true);
    try {
      const { error } = await supabase
        .from("nr1_severidade_override")
        .delete()
        .eq("id", ov.id);
      if (error) throw error;
      toast.success("Personalização removida.");
      fecharDialog();
      await carregar();
    } catch (e) {
      toast.error("Erro ao remover.", {
        description: e instanceof Error ? e.message : "Tente novamente.",
      });
    } finally {
      setSalvando(false);
    }
  }

  if (!podeVer) return null;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <Link
          to="/configuracoes/perfis-atividade"
          className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Perfis de atividade
        </Link>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <h1
              className="text-2xl font-semibold tracking-tight"
              style={{ color: "#234A6E" }}
            >
              {perfil?.nome ?? "Severidades do perfil"}
            </h1>
            {perfil?.descricao && (
              <p className="mt-1 text-sm text-muted-foreground">
                {perfil.descricao}
              </p>
            )}
          </div>
        </div>
      </header>

      {somenteLeitura && (
        <Card className="mb-6 border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-2 text-[13px] text-amber-700 dark:text-amber-400">
            <AlertTriangle size={16} className="mt-0.5" />
            <span>
              Modelos do sistema são somente leitura. Duplique o modelo para
              personalizar.
            </span>
          </div>
        </Card>
      )}

      {carregando ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : (
        <div className="space-y-8">
          {grupos.map((g) => (
            <section key={g.dimensao}>
              <h2 className="mb-3 text-[13px] font-medium uppercase tracking-wide text-muted-foreground">
                {g.label}
              </h2>
              <div className="grid gap-2 md:grid-cols-2">
                {g.itens.map((s) => {
                  const ov = overrideByCodigo.get(s.codigo);
                  return (
                    <Card
                      key={s.codigo}
                      onClick={() => abrirDialog(s)}
                      className={cn(
                        "border-border/60 p-4 transition-colors",
                        somenteLeitura
                          ? "cursor-not-allowed opacity-80"
                          : "cursor-pointer hover:border-primary/60 hover:bg-accent/5",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3
                            className="text-[13px] font-medium"
                            style={{ color: "#234A6E" }}
                          >
                            {s.nome}
                          </h3>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {s.codigo}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            variant="outline"
                            className={cn("text-[10px]", severidadeClass(s.severidade))}
                          >
                            Padrão: {SEVERIDADE_LABEL[s.severidade]}
                          </Badge>
                          {ov && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                severidadeClass(ov.severidade),
                              )}
                            >
                              Personalizado: {SEVERIDADE_LABEL[ov.severidade]}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <Dialog open={!!selecionada} onOpenChange={(o) => !o && fecharDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ color: "#234A6E" }}>
              {selecionada?.nome}
            </DialogTitle>
          </DialogHeader>

          {selecionada && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                <span className="text-[12px] text-muted-foreground">
                  Severidade padrão do documento
                </span>
                <Badge
                  variant="outline"
                  className={cn("text-[10px]", severidadeClass(selecionada.severidade))}
                >
                  {SEVERIDADE_LABEL[selecionada.severidade]}
                </Badge>
              </div>

              <div>
                <Label className="text-[12px]">Severidade neste perfil</Label>
                <Select
                  value={fSeveridade}
                  onValueChange={(v) => setFSeveridade(v as Severidade)}
                >
                  <SelectTrigger className="mt-1.5 h-9 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leve" className="text-[13px]">Leve</SelectItem>
                    <SelectItem value="moderada" className="text-[13px]">Moderada</SelectItem>
                    <SelectItem value="critica" className="text-[13px]">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[12px]">Piso de classificação (opcional)</Label>
                <Select value={fClassMin} onValueChange={setFClassMin}>
                  <SelectTrigger className="mt-1.5 h-9 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum" className="text-[13px]">Sem piso</SelectItem>
                    {(Object.keys(CLASSIF_LABEL) as ClassificacaoMinima[]).map((k) => (
                      <SelectItem key={k} value={k} className="text-[13px]">
                        {CLASSIF_LABEL[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Garante uma classificação mínima no PGR mesmo com exposição baixa.
                </p>
              </div>

              {estaRebaixando && (
                <div className="space-y-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                  <div className="flex items-start gap-2 text-[12px] text-amber-700 dark:text-amber-400">
                    <AlertTriangle size={14} className="mt-0.5" />
                    <span>
                      Você está reduzindo a severidade abaixo do padrão do
                      documento. Isso rebaixa a classificação de risco no PGR.
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={fPermitirRebaixar}
                      onCheckedChange={setFPermitirRebaixar}
                    />
                    <Label className="cursor-pointer text-[12px]">
                      Permitir rebaixar
                    </Label>
                  </div>
                  <div>
                    <Label className="text-[12px]">Justificativa</Label>
                    <Textarea
                      value={fJustificativa}
                      onChange={(e) => setFJustificativa(e.target.value)}
                      placeholder="Explique por que essa subescala tem severidade menor neste perfil…"
                      className="mt-1.5"
                      rows={3}
                    />
                  </div>
                </div>
              )}

              <div>
                <Label className="text-[12px]">Responsável técnico (opcional)</Label>
                <Select value={fRtId} onValueChange={setFRtId}>
                  <SelectTrigger className="mt-1.5 h-9 text-[13px]">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum" className="text-[13px]">Nenhum</SelectItem>
                    {rts.map((r) => (
                      <SelectItem key={r.id} value={r.id} className="text-[13px]">
                        {r.nome} — {r.tipo_conselho}{" "}
                        {r.uf_conselho ?? ""} {r.numero_registro}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="mt-6 gap-2 sm:justify-between">
            <div>
              {selecionada && overrideByCodigo.get(selecionada.codigo) && (
                <Button
                  variant="ghost"
                  onClick={handleRemover}
                  disabled={salvando}
                  className="gap-1.5"
                >
                  <Trash2 size={14} style={{ color: "#ED7D6E" }} />
                  Remover personalização
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={fecharDialog}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSalvar}
                disabled={salvando || !podeSalvar}
                style={{ backgroundColor: "#234A6E" }}
              >
                {salvando ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute(
  "/_auth/configuracoes/perfis-atividade_/$perfilId",
)({
  component: PerfilSeveridades,
  staticData: { crumb: "Severidades do perfil" },
});