import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Copy,
  SlidersHorizontal,
  Settings2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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

interface PerfilAtividade {
  id: string;
  tenant_id: string | null;
  codigo: string;
  nome: string;
  descricao: string | null;
  grau_risco_ref: number | null;
  origem: string;
  ativo: boolean;
}

function slugify(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "perfil";
}

function gerarCodigoUnico(base: string, existentes: string[]): string {
  const baseSlug = slugify(base);
  if (!existentes.includes(baseSlug)) return baseSlug;
  let i = 2;
  while (existentes.includes(`${baseSlug}_${i}`)) i++;
  return `${baseSlug}_${i}`;
}

function PerfisAtividade() {
  const { roles, loading: authLoading } = useAuth();
  const { tenantId, selectedTenantId } = useTenant();
  const navigate = useNavigate();
  const isSuperAdmin = roles.includes("super_admin");
  const isTenantAdmin = roles.includes("tenant_admin");
  const podeVer = isSuperAdmin || isTenantAdmin;

  const [lista, setLista] = useState<PerfilAtividade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [excluirId, setExcluirId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [grau, setGrau] = useState<string>("2");
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    if (!authLoading && !podeVer) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [authLoading, podeVer, navigate]);

  async function carregar() {
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from("nr1_perfil_atividade")
        .select("id, tenant_id, codigo, nome, descricao, grau_risco_ref, origem, ativo")
        .order("nome", { ascending: true });
      if (error) throw error;
      setLista((data ?? []) as PerfilAtividade[]);
    } catch (e) {
      toast.error("Erro ao carregar perfis de atividade.", {
        description: e instanceof Error ? e.message : "Tente novamente.",
      });
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (podeVer) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podeVer, tenantId, selectedTenantId]);

  const modelos = lista.filter((p) => p.tenant_id === null);
  const meus = lista.filter((p) => p.tenant_id !== null);

  function abrirNovo() {
    setEditandoId(null);
    setNome("");
    setDescricao("");
    setGrau("2");
    setAtivo(true);
    setDialogAberto(true);
  }

  function abrirEditar(p: PerfilAtividade) {
    setEditandoId(p.id);
    setNome(p.nome);
    setDescricao(p.descricao ?? "");
    setGrau(String(p.grau_risco_ref ?? 2));
    setAtivo(p.ativo);
    setDialogAberto(true);
  }

  async function handleDuplicar(modelo: PerfilAtividade) {
    const novoNome = `${modelo.nome} (cópia)`;
    const codigosTenant = meus.map((m) => m.codigo);
    const codigo = gerarCodigoUnico(novoNome, codigosTenant);

    type Payload = {
      codigo: string;
      nome: string;
      descricao: string | null;
      grau_risco_ref: number | null;
      origem: string;
      ativo: boolean;
      tenant_id?: string;
    };
    const payload: Payload = {
      codigo,
      nome: novoNome,
      descricao: modelo.descricao,
      grau_risco_ref: modelo.grau_risco_ref,
      origem: "tenant",
      ativo: true,
    };
    if (isSuperAdmin && selectedTenantId) {
      payload.tenant_id = selectedTenantId;
    }

    try {
      const { error } = await supabase
        .from("nr1_perfil_atividade")
        .insert(payload as never);
      if (error) throw error;
      toast.success("Perfil duplicado.");
      await carregar();
    } catch (e) {
      toast.error("Erro ao duplicar perfil.", {
        description: e instanceof Error ? e.message : "Tente novamente.",
      });
    }
  }

  async function handleSalvar() {
    if (!nome.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }
    const grauNum = Number(grau);
    if (!grauNum || grauNum < 1 || grauNum > 4) {
      toast.error("Grau de risco inválido.");
      return;
    }

    setSalvando(true);
    try {
      if (editandoId) {
        const { error } = await supabase
          .from("nr1_perfil_atividade")
          .update({
            nome: nome.trim(),
            descricao: descricao.trim() || null,
            grau_risco_ref: grauNum,
            ativo,
          } as never)
          .eq("id", editandoId);
        if (error) throw error;
        toast.success("Perfil atualizado.");
      } else {
        const codigosTenant = meus.map((m) => m.codigo);
        const codigo = gerarCodigoUnico(nome.trim(), codigosTenant);
        type Payload = {
          codigo: string;
          nome: string;
          descricao: string | null;
          grau_risco_ref: number;
          origem: string;
          ativo: boolean;
          tenant_id?: string;
        };
        const payload: Payload = {
          codigo,
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          grau_risco_ref: grauNum,
          origem: "tenant",
          ativo,
        };
        if (isSuperAdmin && selectedTenantId) {
          payload.tenant_id = selectedTenantId;
        }
        const { error } = await supabase
          .from("nr1_perfil_atividade")
          .insert(payload as never);
        if (error) throw error;
        toast.success("Perfil criado.");
      }
      setDialogAberto(false);
      await carregar();
    } catch (e) {
      toast.error("Erro ao salvar.", {
        description: e instanceof Error ? e.message : "Tente novamente.",
      });
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir() {
    if (!excluirId) return;
    try {
      const { error } = await supabase
        .from("nr1_perfil_atividade")
        .delete()
        .eq("id", excluirId);
      if (error) throw error;
      toast.success("Perfil excluído.");
      await carregar();
    } catch (e) {
      toast.error("Erro ao excluir.", {
        description: e instanceof Error ? e.message : "Tente novamente.",
      });
    } finally {
      setExcluirId(null);
    }
  }

  if (!podeVer) return null;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#234A6E" }}>
            Perfis de atividade
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Severidade por tipo de atividade do cliente, usada no cálculo do PGR.
          </p>
        </div>
        <Button
          onClick={abrirNovo}
          className="gap-1.5"
          style={{ backgroundColor: "#234A6E" }}
        >
          <Plus size={16} />
          Novo perfil
        </Button>
      </header>

      {carregando ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2
              className="mb-3 text-[13px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              Modelos do sistema
            </h2>
            {modelos.length === 0 ? (
              <Card className="border-border/60 px-6 py-8 text-center text-sm text-muted-foreground">
                Nenhum modelo disponível.
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {modelos.map((m) => (
                  <Card key={m.id} className="border-border/60 p-5">
                    <div className="flex items-start gap-3">
                      <div className="rounded-sm bg-muted p-2 text-muted-foreground">
                        <SlidersHorizontal size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[14px] font-medium" style={{ color: "#234A6E" }}>
                            {m.nome}
                          </h3>
                          <Badge variant="secondary" className="text-[10px]">
                            Modelo
                          </Badge>
                        </div>
                        {m.descricao && (
                          <p className="mt-1 text-[12px] text-muted-foreground">
                            {m.descricao}
                          </p>
                        )}
                        <div className="mt-2">
                          <Badge variant="outline" className="text-[10px]">
                            Grau {m.grau_risco_ref ?? "—"}
                          </Badge>
                        </div>
                        <div className="mt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDuplicar(m)}
                            className="gap-1.5"
                          >
                            <Copy size={14} />
                            Duplicar para personalizar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2
              className="mb-3 text-[13px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              Meus perfis
            </h2>
            {meus.length === 0 ? (
              <Card className="border-border/60 px-6 py-8 text-center text-sm text-muted-foreground">
                Nenhum perfil personalizado ainda. Duplique um modelo do sistema para começar.
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {meus.map((p) => (
                  <Card key={p.id} className="border-border/60 p-5">
                    <div className="flex items-start gap-3">
                      <div className="rounded-sm bg-primary/10 p-2 text-primary">
                        <SlidersHorizontal size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[14px] font-medium" style={{ color: "#234A6E" }}>
                            {p.nome}
                          </h3>
                          {p.ativo ? (
                            <span className="text-[11px] text-emerald-600">Ativo</span>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Inativo
                            </Badge>
                          )}
                        </div>
                        {p.descricao && (
                          <p className="mt-1 text-[12px] text-muted-foreground">
                            {p.descricao}
                          </p>
                        )}
                        <div className="mt-2">
                          <Badge variant="outline" className="text-[10px]">
                            Grau {p.grau_risco_ref ?? "—"}
                          </Badge>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <a href={`/configuracoes/perfis-atividade/${p.id}`}>
                            <Button size="sm" variant="outline" className="gap-1.5">
                              <Settings2 size={14} />
                              Configurar severidades
                            </Button>
                          </a>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => abrirEditar(p)}
                            className="gap-1.5"
                          >
                            <Pencil size={14} style={{ color: "#234A6E" }} />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setExcluirId(p.id)}
                            className="gap-1.5"
                          >
                            <Trash2 size={14} style={{ color: "#ED7D6E" }} />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ color: "#234A6E" }}>
              {editandoId ? "Editar perfil" : "Novo perfil"}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div>
              <Label className="text-[12px]">Nome</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Escritório, Saúde, Indústria"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="text-[12px]">Descrição</Label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva o tipo de atividade…"
                className="mt-1.5"
                rows={3}
              />
            </div>

            <div>
              <Label className="text-[12px]">Grau de risco</Label>
              <Select value={grau} onValueChange={setGrau}>
                <SelectTrigger className="mt-1.5 h-9 text-[13px]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1" className="text-[13px]">Grau 1</SelectItem>
                  <SelectItem value="2" className="text-[13px]">Grau 2</SelectItem>
                  <SelectItem value="3" className="text-[13px]">Grau 3</SelectItem>
                  <SelectItem value="4" className="text-[13px]">Grau 4</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editandoId && (
              <div className="flex items-center gap-3 pt-1">
                <Switch checked={ativo} onCheckedChange={setAtivo} />
                <Label className="text-[12px] cursor-pointer">Ativo</Label>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6 gap-2">
            <Button variant="outline" onClick={() => setDialogAberto(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button
              onClick={handleSalvar}
              disabled={salvando}
              style={{ backgroundColor: "#234A6E" }}
            >
              {salvando ? <Loader2 className="animate-spin" size={14} /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!excluirId} onOpenChange={(open) => { if (!open) setExcluirId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir perfil de atividade?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os overrides de severidade deste perfil também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExcluirId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluir}
              style={{ backgroundColor: "#ED7D6E" }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const Route = createFileRoute("/_auth/configuracoes/perfis-atividade")({
  component: PerfisAtividade,
  staticData: { crumb: "Perfis de atividade" },
});