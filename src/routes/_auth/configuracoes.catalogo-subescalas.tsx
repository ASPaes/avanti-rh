import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type CatalogoStatus = "pendente" | "parcial" | "completo";
type Severidade = "critica" | "moderada" | "leve";
type Tipo = "positivo" | "negativo";

interface Subescala {
  codigo: string;
  nome: string;
  dimensao_macro: string;
  severidade: Severidade;
  tipo: Tipo;
  descricao_clinica: string | null;
  texto_significado: string | null;
  texto_agravos: string | null;
  texto_acoes_pgr: string | null;
  catalogo_status: CatalogoStatus;
  ordem: number;
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

const STATUS_LABEL: Record<CatalogoStatus, string> = {
  pendente: "Pendente",
  parcial: "Parcial",
  completo: "Completo",
};

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

function statusClass(s: CatalogoStatus) {
  switch (s) {
    case "completo":
      return "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
    case "parcial":
      return "bg-amber-500/15 text-amber-500 border-amber-500/30";
    case "pendente":
      return "bg-muted text-muted-foreground border-border";
  }
}

function deriveStatus(
  significado: string,
  agravos: string,
  acoes: string,
): CatalogoStatus {
  const preenchidos = [significado, agravos, acoes].filter(
    (t) => t.trim().length > 0,
  ).length;
  if (preenchidos === 3) return "completo";
  if (preenchidos === 0) return "pendente";
  return "parcial";
}

function CatalogoSubescalas() {
  const { roles, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = roles.includes("super_admin");
  const queryClient = useQueryClient();

  const [selectedCodigo, setSelectedCodigo] = useState<string | null>(null);
  const [form, setForm] = useState({
    significado: "",
    agravos: "",
    acoes: "",
  });

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [authLoading, isSuperAdmin, navigate]);

  const { data: subescalas, isLoading } = useQuery({
    queryKey: ["catalogo-subescalas"],
    enabled: isSuperAdmin,
    queryFn: async (): Promise<Subescala[]> => {
      const { data, error } = await supabase
        .from("nr1_catalogo_editor")
        .select(
          "codigo, nome, dimensao_macro, severidade, tipo, descricao_clinica, texto_significado, texto_agravos, texto_acoes_pgr, catalogo_status, ordem",
        )
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Subescala[];
    },
  });

  const selected = useMemo(
    () => subescalas?.find((s) => s.codigo === selectedCodigo) ?? null,
    [subescalas, selectedCodigo],
  );

  useEffect(() => {
    if (selected) {
      setForm({
        significado: selected.texto_significado ?? "",
        agravos: selected.texto_agravos ?? "",
        acoes: selected.texto_acoes_pgr ?? "",
      });
    }
  }, [selected]);

  const mutation = useMutation({
    mutationFn: async (vars: {
      codigo: string;
      significado: string;
      agravos: string;
      acoes: string;
    }) => {
      const status = deriveStatus(vars.significado, vars.agravos, vars.acoes);
      const { error } = await supabase
        .from("nr1_catalogo_subescala")
        .update({
          texto_significado: vars.significado || null,
          texto_agravos: vars.agravos || null,
          texto_acoes_pgr: vars.acoes || null,
          catalogo_status: status,
        })
        .eq("codigo", vars.codigo);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subescala atualizada.");
      queryClient.invalidateQueries({ queryKey: ["catalogo-subescalas"] });
      setSelectedCodigo(null);
    },
    onError: (e: Error) => {
      toast.error("Erro ao salvar.", { description: e.message });
    },
  });

  const stats = useMemo(() => {
    const list = subescalas ?? [];
    const completo = list.filter((s) => s.catalogo_status === "completo").length;
    const parcial = list.filter((s) => s.catalogo_status === "parcial").length;
    const pendente = list.filter((s) => s.catalogo_status === "pendente").length;
    return { completo, parcial, pendente, total: list.length };
  }, [subescalas]);

  const grupos = useMemo(() => {
    const map = new Map<string, Subescala[]>();
    (subescalas ?? []).forEach((s) => {
      if (!map.has(s.dimensao_macro)) map.set(s.dimensao_macro, []);
      map.get(s.dimensao_macro)!.push(s);
    });
    return DIMENSAO_ORDEM.filter((d) => map.has(d)).map((d) => ({
      key: d,
      label: DIMENSAO_LABEL[d] ?? d,
      itens: map.get(d)!,
    }));
  }, [subescalas]);

  if (!isSuperAdmin) return null;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Catálogo de subescalas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Textos de significado, agravos e ações usados nos relatórios de NR-1.
        </p>
      </header>

      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4 text-[13px]">
          <span className="text-emerald-500">
            Completo: <strong>{stats.completo}</strong>
          </span>
          <span className="text-amber-500">
            Parcial: <strong>{stats.parcial}</strong>
          </span>
          <span className="text-muted-foreground">
            Pendente: <strong>{stats.pendente}</strong>
          </span>
          <span className="ml-auto text-muted-foreground">
            {stats.completo} de {stats.total}
          </span>
        </div>
        <Progress
          value={stats.total > 0 ? (stats.completo / stats.total) * 100 : 0}
          className="mt-3 h-1.5"
        />
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : (
        <div className="space-y-8">
          {grupos.map((grupo) => (
            <section key={grupo.key}>
              <h2 className="text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground mb-2">
                {grupo.label}
              </h2>
              <div className="space-y-2">
                {grupo.itens.map((s) => (
                  <button
                    key={s.codigo}
                    type="button"
                    onClick={() => setSelectedCodigo(s.codigo)}
                    className="w-full text-left"
                  >
                    <Card className="p-4 hover:border-primary/60 hover:bg-accent/5 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[14px] font-medium text-foreground">
                              {s.nome}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn("text-[10px]", severidadeClass(s.severidade))}
                            >
                              {SEVERIDADE_LABEL[s.severidade]}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn("text-[10px]", statusClass(s.catalogo_status))}
                            >
                              {STATUS_LABEL[s.catalogo_status]}
                            </Badge>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground" />
                      </div>
                    </Card>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Dialog
        open={!!selected}
        onOpenChange={(open: boolean) => {
          if (!open) setSelectedCodigo(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-left">{selected.nome}</DialogTitle>
                <DialogDescription className="text-left">
                  {DIMENSAO_LABEL[selected.dimensao_macro] ?? selected.dimensao_macro}
                </DialogDescription>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Badge
                    variant="outline"
                    className={cn("text-[10px]", severidadeClass(selected.severidade))}
                  >
                    {SEVERIDADE_LABEL[selected.severidade]}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    {selected.tipo === "positivo" ? "Positivo" : "Negativo"}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="mt-6 space-y-5">
                {selected.descricao_clinica && (
                  <div>
                    <Label className="text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
                      Definição
                    </Label>
                    <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">
                      {selected.descricao_clinica}
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="significado">O que significa na prática</Label>
                  <Textarea
                    id="significado"
                    value={form.significado}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, significado: e.target.value }))
                    }
                    rows={5}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="agravos">Possíveis agravos</Label>
                  <Textarea
                    id="agravos"
                    value={form.agravos}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, agravos: e.target.value }))
                    }
                    rows={5}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="acoes">Ações sugeridas (PGR)</Label>
                  <Textarea
                    id="acoes"
                    value={form.acoes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, acoes: e.target.value }))
                    }
                    rows={6}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <DialogFooter className="mt-6 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedCodigo(null)}
                  disabled={mutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() =>
                    mutation.mutate({
                      codigo: selected.codigo,
                      significado: form.significado,
                      agravos: form.agravos,
                      acoes: form.acoes,
                    })
                  }
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    "Salvar"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute("/_auth/configuracoes/catalogo-subescalas")({
  component: CatalogoSubescalas,
  staticData: { crumb: "Catálogo de subescalas" },
});