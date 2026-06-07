import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  UserCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ResponsavelTecnico {
  id: string;
  nome: string;
  tipo_conselho: string;
  uf_conselho: string | null;
  numero_registro: string;
  papel: string | null;
  ativo: boolean;
  ordem: number;
}

const TIPOS_CONSELHO = ["CRP", "CRA", "CREA", "CRM", "CRO", "OUTRO"];

function ResponsaveisTecnicos() {
  const { roles, loading: authLoading } = useAuth();
  const { tenantId, selectedTenantId } = useTenant();
  const navigate = useNavigate();
  const isSuperAdmin = roles.includes("super_admin");
  const isTenantAdmin = roles.includes("tenant_admin");
  const podeVer = isSuperAdmin || isTenantAdmin;

  const [lista, setLista] = useState<ResponsavelTecnico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [excluirId, setExcluirId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState("");
  const [tipoConselho, setTipoConselho] = useState("");
  const [ufConselho, setUfConselho] = useState("");
  const [numeroRegistro, setNumeroRegistro] = useState("");
  const [papel, setPapel] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [ordem, setOrdem] = useState("0");

  useEffect(() => {
    if (!authLoading && !podeVer) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [authLoading, podeVer, navigate]);

  async function carregar() {
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from("responsavel_tecnico")
        .select("id, nome, tipo_conselho, uf_conselho, numero_registro, papel, ativo, ordem")
        .order("ordem", { ascending: true })
        .order("nome", { ascending: true });
      if (error) throw error;
      setLista((data ?? []) as ResponsavelTecnico[]);
    } catch (e) {
      toast.error("Erro ao carregar responsáveis técnicos.", {
        description: e instanceof Error ? e.message : "Tente novamente.",
      });
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (podeVer) {
      carregar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podeVer, tenantId, selectedTenantId]);

  function abrirNovo() {
    setEditandoId(null);
    setNome("");
    setTipoConselho("");
    setUfConselho("");
    setNumeroRegistro("");
    setPapel("");
    setAtivo(true);
    setOrdem("0");
    setDialogAberto(true);
  }

  function abrirEditar(rt: ResponsavelTecnico) {
    setEditandoId(rt.id);
    setNome(rt.nome);
    setTipoConselho(rt.tipo_conselho);
    setUfConselho(rt.uf_conselho ?? "");
    setNumeroRegistro(rt.numero_registro);
    setPapel(rt.papel ?? "");
    setAtivo(rt.ativo);
    setOrdem(String(rt.ordem ?? 0));
    setDialogAberto(true);
  }

  async function handleSalvar() {
    if (!nome.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }
    if (!tipoConselho) {
      toast.error("Tipo de conselho é obrigatório.");
      return;
    }
    if (!numeroRegistro.trim()) {
      toast.error("Número de registro é obrigatório.");
      return;
    }

    type PayloadRT = {
      nome: string;
      tipo_conselho: string;
      uf_conselho: string | null;
      numero_registro: string;
      papel: string | null;
      ativo: boolean;
      ordem: number;
      tenant_id?: string;
    };

    const payload: PayloadRT = {
      nome: nome.trim(),
      tipo_conselho: tipoConselho,
      uf_conselho: ufConselho.trim() || null,
      numero_registro: numeroRegistro.trim(),
      papel: papel.trim() || null,
      ativo,
      ordem: Number(ordem) || 0,
    };

    if (isSuperAdmin && selectedTenantId) {
      payload.tenant_id = selectedTenantId;
    }

    setSalvando(true);
    try {
      if (editandoId) {
        const { error } = await supabase
          .from("responsavel_tecnico")
          .update(payload as never)
          .eq("id", editandoId);
        if (error) throw error;
        toast.success("Responsável técnico atualizado.");
      } else {
        const { error } = await supabase
          .from("responsavel_tecnico")
          .insert(payload as never);
        if (error) throw error;
        toast.success("Responsável técnico salvo.");
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
        .from("responsavel_tecnico")
        .delete()
        .eq("id", excluirId);
      if (error) throw error;
      toast.success("Responsável técnico excluído.");
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
            Responsáveis técnicos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastro de responsáveis técnicos do tenant.
          </p>
        </div>
        <Button
          onClick={abrirNovo}
          className="gap-1.5"
          style={{ backgroundColor: "#234A6E" }}
        >
          <Plus size={16} />
          Novo responsável técnico
        </Button>
      </header>

      <Card className="border-border/60">
        {carregando ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : lista.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            Nenhum responsável técnico cadastrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[12px]">Nome</TableHead>
                  <TableHead className="text-[12px]">Registro</TableHead>
                  <TableHead className="text-[12px]">Papel</TableHead>
                  <TableHead className="text-[12px]">Status</TableHead>
                  <TableHead className="text-[12px] w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((rt) => (
                  <TableRow key={rt.id}>
                    <TableCell className="text-[13px]">
                      <div className="font-medium" style={{ color: "#234A6E" }}>
                        {rt.nome}
                      </div>
                    </TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">
                      {rt.tipo_conselho} {rt.uf_conselho} {rt.numero_registro}
                    </TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">
                      {rt.papel ?? "—"}
                    </TableCell>
                    <TableCell>
                      {rt.ativo ? (
                        <span className="text-[12px] text-emerald-600">Ativo</span>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => abrirEditar(rt)}
                        >
                          <Pencil size={14} style={{ color: "#234A6E" }} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setExcluirId(rt.id)}
                        >
                          <Trash2 size={14} style={{ color: "#ED7D6E" }} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ color: "#234A6E" }}>
              {editandoId ? "Editar responsável técnico" : "Novo responsável técnico"}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div>
              <Label className="text-[12px]">Nome</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome completo"
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-[12px]">Tipo de conselho</Label>
                <Select value={tipoConselho} onValueChange={setTipoConselho}>
                  <SelectTrigger className="mt-1.5 h-9 text-[13px]">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_CONSELHO.map((t) => (
                      <SelectItem key={t} value={t} className="text-[13px]">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12px]">UF do conselho</Label>
                <Input
                  value={ufConselho}
                  onChange={(e) => setUfConselho(e.target.value.toUpperCase())}
                  placeholder="SC"
                  maxLength={2}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-[12px]">Número de registro</Label>
                <Input
                  value={numeroRegistro}
                  onChange={(e) => setNumeroRegistro(e.target.value)}
                  placeholder="12/19.213"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-[12px]">Papel</Label>
                <Input
                  value={papel}
                  onChange={(e) => setPapel(e.target.value)}
                  placeholder="Psicóloga responsável técnica"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-[12px]">Ordem</Label>
                <Input
                  type="number"
                  value={ordem}
                  onChange={(e) => setOrdem(e.target.value)}
                  placeholder="0"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Switch
                checked={ativo}
                onCheckedChange={setAtivo}
              />
              <Label className="text-[12px] cursor-pointer">Ativo</Label>
            </div>
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
              {salvando ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!excluirId} onOpenChange={(open) => { if (!open) setExcluirId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir responsável técnico?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O responsável técnico será removido permanentemente.
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

export const Route = createFileRoute("/_auth/configuracoes/responsaveis-tecnicos")({
  component: ResponsaveisTecnicos,
  staticData: { crumb: "Responsáveis técnicos" },
});
