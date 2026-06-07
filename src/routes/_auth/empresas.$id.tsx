import { useEffect, useState } from "react";
import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2, MoreHorizontal, Pencil, Plus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useSetores, type Setor } from "@/hooks/useSetores";
import type { EmpresaCliente } from "@/hooks/useEmpresasCliente";
import { EmpresaFormDialog } from "@/features/empresas/EmpresaFormDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type EmpresaDetalhe = EmpresaCliente & {
  updated_at: string;
  tenant_id: string;
};

function formatCnpj(cnpj: string): string {
  const digits = (cnpj ?? "").replace(/\D/g, "");
  if (digits.length !== 14) return cnpj;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

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
  navigator.clipboard.writeText(
    `${window.location.origin}/responder/${linkPublico}`,
  );
  toast.success("Link copiado!");
}

function AvaliacaoStatusBadge({ status }: { status: string }) {
  if (status === "aberta")
    return (
      <Badge className="bg-success/10 text-success hover:bg-success/10 border-transparent">
        aberta
      </Badge>
    );
  if (status === "encerrada")
    return (
      <Badge className="bg-warning/10 text-warning hover:bg-warning/10 border-transparent">
        encerrada
      </Badge>
    );
  if (status === "analisada")
    return (
      <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-transparent">
        analisada
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-muted-foreground">
      {status}
    </Badge>
  );
}

interface AvaliacaoEmpresa {
  id: string;
  nome: string;
  status: string;
  link_publico: string | null;
  limite_respostas: number;
  respostas_completadas: number;
  data_inicio: string;
  data_fim: string | null;
  data_realizacao: string | null;
  qtd_colaboradores_epoca: number | null;
  instrumento_descricao: string | null;
  observacao_contextual: string | null;
  created_at: string;
}

const avaliacaoEmpresaSchema = z.object({
  nome: z.string().trim().min(3, "Nome obrigatório").max(255),
  data_fim: z.string().optional().or(z.literal("")),
  data_realizacao: z.string().optional().or(z.literal("")),
  qtd_colaboradores_epoca: z
    .union([z.coerce.number().int().positive("Deve ser maior que zero"), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : (v as number))),
  instrumento_descricao: z.string().trim().max(255).optional().or(z.literal("")),
  observacao_contextual: z.string().trim().max(2000).optional().or(z.literal("")),
});

type AvaliacaoEmpresaInput = z.input<typeof avaliacaoEmpresaSchema>;
type AvaliacaoEmpresaOutput = z.output<typeof avaliacaoEmpresaSchema>;

function StatusBadge({ status }: { status: string }) {
  if (status === "ativa") {
    return (
      <Badge className="bg-success/10 text-success hover:bg-success/10 border-transparent">
        ativa
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-muted-foreground">
      {status}
    </Badge>
  );
}

function SetorAtivoBadge({ ativo }: { ativo: boolean }) {
  if (ativo) {
    return (
      <Badge className="bg-success/10 text-success hover:bg-success/10 border-transparent">
        ativo
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-muted-foreground">
      inativo
    </Badge>
  );
}

function DataItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
}) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div>
      <p className="text-[11px] font-mono uppercase tracking-[0.10em] text-muted-foreground mb-1">
        {label}
      </p>
      <p
        className={`text-[14px] ${empty ? "text-muted-foreground" : "text-foreground"} ${mono ? "font-mono" : ""}`}
      >
        {empty ? "—" : value}
      </p>
    </div>
  );
}

/* ---------------- Setor dialog ---------------- */

const setorSchema = z.object({
  nome: z.string().trim().min(2, "Nome obrigatório (mín. 2 caracteres)").max(120),
  descricao: z.string().trim().max(500).optional().or(z.literal("")),
  qtd_colaboradores_estimado: z
    .union([z.coerce.number().int().positive("Deve ser positivo"), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : (v as number))),
});

type SetorFormValues = z.input<typeof setorSchema>;
type SetorFormOutput = z.output<typeof setorSchema>;

function SetorDialog({
  open,
  onOpenChange,
  empresaClienteId,
  setor,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  empresaClienteId: string;
  setor: Setor | null;
  onSuccess: () => void;
}) {
  const { tenantId } = useTenant();
  const isEdit = !!setor;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SetorFormValues, unknown, SetorFormOutput>({
    resolver: zodResolver(setorSchema),
    defaultValues: { nome: "", descricao: "", qtd_colaboradores_estimado: "" },
  });

  useEffect(() => {
    if (open) {
      reset({
        nome: setor?.nome ?? "",
        descricao: setor?.descricao ?? "",
        qtd_colaboradores_estimado:
          (setor?.qtd_colaboradores_estimado ?? "") as SetorFormValues["qtd_colaboradores_estimado"],
      });
    }
  }, [open, setor, reset]);

  const { mutateAsync: salvar, isPending } = useMutation({
    mutationFn: async (values: SetorFormOutput) => {
      const payload = {
        nome: values.nome.trim(),
        descricao:
          values.descricao && values.descricao.trim() !== ""
            ? values.descricao.trim()
            : null,
        qtd_colaboradores_estimado: values.qtd_colaboradores_estimado ?? null,
      };
      if (isEdit && setor) {
        const { error } = await supabase
          .from("setores")
          .update(payload)
          .eq("id", setor.id);
        if (error) throw error;
      } else {
        if (!tenantId) throw new Error("Tenant não selecionado.");
        const { error } = await supabase
          .from("setores")
          .insert({
            ...payload,
            tenant_id: tenantId,
            empresa_cliente_id: empresaClienteId,
          })
          .select("id")
          .single();
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Setor atualizado." : "Setor cadastrado.");
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao salvar setor."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar setor" : "Novo setor"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os dados do setor."
              : "Cadastre um novo setor ou GHE."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((v) => salvar(v))}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px]">
              Nome<span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input {...register("nome")} autoFocus />
            {errors.nome && (
              <p className="text-[12px] text-destructive">{errors.nome.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px]">Descrição</Label>
            <Textarea {...register("descricao")} rows={3} />
            {errors.descricao && (
              <p className="text-[12px] text-destructive">
                {errors.descricao.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px]">Qtd. colaboradores estimada</Label>
            <Input
              {...register("qtd_colaboradores_estimado")}
              type="number"
              min={1}
            />
            {errors.qtd_colaboradores_estimado && (
              <p className="text-[12px] text-destructive">
                {errors.qtd_colaboradores_estimado.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Page ---------------- */

/* ---------------- Cargo (empresa_cargo) ---------------- */

interface CboItem {
  codigo: string;
  titulo: string;
}

interface CargoRow {
  id: string;
  tenant_id: string;
  empresa_cliente_id: string;
  setor_id: string | null;
  cbo_codigo: string | null;
  nome_funcao: string;
  qtd_colaboradores: number;
  carga_horaria: string | null;
  atividades: string | null;
  ordem: number;
  cbo: CboItem | null;
  setor: { id: string; nome: string } | null;
}

function CargoDialog({
  open,
  onOpenChange,
  empresaClienteId,
  empresaTenantId,
  setores,
  cargo,
  proximaOrdem,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  empresaClienteId: string;
  empresaTenantId: string;
  setores: Setor[];
  cargo: CargoRow | null;
  proximaOrdem: number;
  onSuccess: () => void;
}) {
  const { tenantId } = useTenant();
  const isEdit = !!cargo;

  const [cboCodigo, setCboCodigo] = useState<string | null>(null);
  const [cboTitulo, setCboTitulo] = useState<string | null>(null);
  const [nomeFuncao, setNomeFuncao] = useState("");
  const [setorId, setSetorId] = useState<string>("__none");
  const [qtdColaboradores, setQtdColaboradores] = useState<string>("0");
  const [cargaHoraria, setCargaHoraria] = useState("");
  const [atividades, setAtividades] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const [cboSearchOpen, setCboSearchOpen] = useState(false);
  const [cboTermo, setCboTermo] = useState("");
  const [cboTermoDebounced, setCboTermoDebounced] = useState("");

  const [iaLoading, setIaLoading] = useState(false);
  const [iaBadgeVisible, setIaBadgeVisible] = useState(false);
  const [confirmSubstituirOpen, setConfirmSubstituirOpen] = useState(false);
  const [iaTextoPendente, setIaTextoPendente] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErro(null);
    setCboCodigo(cargo?.cbo_codigo ?? null);
    setCboTitulo(cargo?.cbo?.titulo ?? null);
    setNomeFuncao(cargo?.nome_funcao ?? "");
    setSetorId(cargo?.setor_id ?? "__none");
    setQtdColaboradores(String(cargo?.qtd_colaboradores ?? 0));
    setCargaHoraria(cargo?.carga_horaria ?? "");
    setAtividades(cargo?.atividades ?? "");
    setCboTermo("");
    setCboTermoDebounced("");
    setCboSearchOpen(false);
    setIaBadgeVisible(false);
    setIaTextoPendente(null);
    setConfirmSubstituirOpen(false);
  }, [open, cargo]);

  useEffect(() => {
    const t = setTimeout(() => setCboTermoDebounced(cboTermo.trim()), 300);
    return () => clearTimeout(t);
  }, [cboTermo]);

  const cboQuery = useQuery<CboItem[]>({
    queryKey: ["cbo-search", cboTermoDebounced],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cbo")
        .select("codigo, titulo")
        .eq("ativo", true)
        .ilike("titulo", `%${cboTermoDebounced}%`)
        .order("titulo")
        .limit(30);
      if (error) throw error;
      return (data ?? []) as CboItem[];
    },
    enabled: open && cboTermoDebounced.length >= 2,
  });

  const aplicarTextoIa = (texto: string) => {
    setAtividades(texto);
    setIaBadgeVisible(true);
  };

  const setorSelecionadoNome =
    setorId === "__none"
      ? ""
      : (setores.find((s) => s.id === setorId)?.nome ?? "");

  const podeSugerir = nomeFuncao.trim().length >= 2;

  const gerarAtividadesIa = async () => {
    if (!podeSugerir || iaLoading) return;
    setIaLoading(true);
    const { data, error } = await supabase.functions.invoke("ia-executar", {
      body: {
        caso_uso: "cargo_atividades",
        tenant_id: empresaTenantId,
        contexto: {
          titulo: nomeFuncao.trim(),
          cbo_codigo: cboCodigo ?? "",
          cbo_titulo: cboTitulo ?? "",
          setor: setorSelecionadoNome ?? "",
        },
      },
    });

    setIaLoading(false);

    if (error) {
      let msg = "Falha ao gerar sugestão. Tente novamente.";
      try {
        const ctx = await (error as { context?: { json?: () => Promise<{ error?: string }> } })
          .context?.json?.();
        if (ctx?.error) msg = ctx.error;
      } catch {
        /* ignora */
      }
      toast.error(msg, { description: "Erro ao sugerir" });
      return;
    }

    const texto = ((data as { texto?: string } | null)?.texto ?? "").trim();
    if (!texto) {
      toast.error("A IA não retornou texto.", { description: "Erro ao sugerir" });
      return;
    }

    if (atividades.trim().length > 0) {
      setIaTextoPendente(texto);
      setConfirmSubstituirOpen(true);
    } else {
      aplicarTextoIa(texto);
    }
  };

  const { mutateAsync: salvar, isPending } = useMutation({
    mutationFn: async () => {
      const nome = nomeFuncao.trim();
      if (nome.length < 2) throw new Error("Nome da função é obrigatório.");
      const qtd = Number.parseInt(qtdColaboradores, 10);
      if (Number.isNaN(qtd) || qtd < 0)
        throw new Error("Qtd. colaboradores deve ser 0 ou maior.");

      const payload = {
        nome_funcao: nome,
        cbo_codigo: cboCodigo,
        setor_id: setorId === "__none" ? null : setorId,
        qtd_colaboradores: qtd,
        carga_horaria: cargaHoraria.trim() === "" ? null : cargaHoraria.trim(),
        atividades: atividades.trim() === "" ? null : atividades.trim(),
      };

      if (isEdit && cargo) {
        const { error } = await supabase
          .from("empresa_cargo")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", cargo.id);
        if (error) throw error;
      } else {
        if (!tenantId) throw new Error("Tenant não selecionado.");
        const { error } = await supabase
          .from("empresa_cargo")
          .insert({
            ...payload,
            tenant_id: tenantId,
            empresa_cliente_id: empresaClienteId,
            ordem: proximaOrdem,
          })
          .select("id")
          .single();
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Cargo atualizado." : "Cargo cadastrado.");
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      setErro(err.message || "Erro ao salvar cargo.");
      toast.error(err.message || "Erro ao salvar cargo.");
    },
  });

  const cboLabel = cboCodigo
    ? `${cboCodigo}${cboTitulo ? ` — ${cboTitulo}` : ""}`
    : "Selecionar CBO (opcional)";

  return (
    <div>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar cargo" : "Novo cargo"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os dados do cargo ou função."
              : "Cadastre um cargo ou função para esta empresa."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* CBO search */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px]">Catálogo CBO</Label>
            <Popover open={cboSearchOpen} onOpenChange={setCboSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-between text-[13px] font-normal"
                >
                  <span className={cboCodigo ? "" : "text-muted-foreground"}>
                    {cboLabel}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                <div className="p-2 border-b border-border">
                  <Input
                    autoFocus
                    placeholder="Digite ao menos 2 letras..."
                    value={cboTermo}
                    onChange={(e) => setCboTermo(e.target.value)}
                  />
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {cboTermoDebounced.length < 2 ? (
                    <p className="text-[12px] text-muted-foreground p-3">
                      Digite ao menos 2 caracteres para buscar.
                    </p>
                  ) : cboQuery.isLoading ? (
                    <p className="text-[12px] text-muted-foreground p-3">
                      Buscando...
                    </p>
                  ) : !cboQuery.data || cboQuery.data.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground p-3">
                      Nenhum CBO encontrado.
                    </p>
                  ) : (
                    <ul className="py-1">
                      {cboQuery.data.map((c) => (
                        <li key={c.codigo}>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-[13px] hover:bg-accent hover:text-accent-foreground cursor-pointer"
                            onClick={() => {
                              setCboCodigo(c.codigo);
                              setCboTitulo(c.titulo);
                              if (nomeFuncao.trim() === "") setNomeFuncao(c.titulo);
                              setCboSearchOpen(false);
                            }}
                          >
                            <span className="font-mono text-[12px] text-muted-foreground mr-2">
                              {c.codigo}
                            </span>
                            {c.titulo}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {cboCodigo && (
                  <div className="border-t border-border p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-[12px] text-red-500 hover:text-red-500"
                      onClick={() => {
                        setCboCodigo(null);
                        setCboTitulo(null);
                      }}
                    >
                      Remover CBO selecionado
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            <p className="text-[11px] text-muted-foreground">
              Opcional. Selecionar um CBO pré-preenche o nome da função.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px]">
              Nome da função<span className="text-red-500 ml-0.5">*</span>
            </Label>
            <Input
              value={nomeFuncao}
              onChange={(e) => setNomeFuncao(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px]">Setor</Label>
            <Select value={setorId} onValueChange={setSetorId}>
              <SelectTrigger>
                <SelectValue placeholder="Sem setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Sem setor</SelectItem>
                {setores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px]">
                Qtd. colaboradores<span className="text-red-500 ml-0.5">*</span>
              </Label>
              <Input
                type="number"
                min={0}
                value={qtdColaboradores}
                onChange={(e) => setQtdColaboradores(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px]">Carga horária</Label>
              <Input
                value={cargaHoraria}
                onChange={(e) => setCargaHoraria(e.target.value)}
                placeholder='ex: 44h semanais ou "15h / 22h"'
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-[13px]">Atividades</Label>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={gerarAtividadesIa}
                        disabled={!podeSugerir || iaLoading}
                        className="text-[#234A6E] border-[#234A6E]/30 hover:bg-[#ED7D6E]/10 hover:text-[#234A6E]"
                      >
                        {iaLoading ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Sparkles className="text-[#ED7D6E]" />
                        )}
                        {iaLoading ? "Gerando..." : "Sugerir com IA"}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!podeSugerir && (
                    <TooltipContent>
                      preencha o nome da função primeiro
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
            <Textarea
              rows={4}
              value={atividades}
              onChange={(e) => {
                const v = e.target.value;
                setAtividades(v);
                if (v.trim() === "") setIaBadgeVisible(false);
              }}
            />
            {iaBadgeVisible && atividades.trim() !== "" && (
              <div className="rounded-md border border-[#ED7D6E]/30 bg-[#ED7D6E]/10 px-3 py-2 text-[12px] text-[#234A6E]">
                ✨ Rascunho gerado por IA — revise e ajuste à realidade do posto
                antes de salvar.
              </div>
            )}
          </div>

          {erro && <p className="text-[12px] text-red-500">{erro}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => salvar()}
            disabled={isPending}
          >
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog
      open={confirmSubstituirOpen}
      onOpenChange={setConfirmSubstituirOpen}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Substituir o texto atual?</AlertDialogTitle>
          <AlertDialogDescription>
            Já existe texto no campo Atividades. A sugestão da IA vai
            substituir o conteúdo atual.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setIaTextoPendente(null)}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-[#ED7D6E] text-white hover:bg-[#ED7D6E]/90"
            onClick={() => {
              if (iaTextoPendente) aplicarTextoIa(iaTextoPendente);
              setIaTextoPendente(null);
            }}
          >
            Substituir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </div>
  );
}

/* ---------------- Nexo NTEP ---------------- */

interface NtepItem {
  cid_agrupamento: string;
  descricao: string | null;
}

function NtepSection({ cnae }: { cnae: string | null }) {
  const [loading, setLoading] = useState(false);
  const [itens, setItens] = useState<NtepItem[] | null>(null);
  const [erro, setErro] = useState(false);

  const cnae4 = (cnae || "").replace(/\D/g, "").slice(0, 4);

  useEffect(() => {
    if (cnae4.length < 4) {
      setItens(null);
      setErro(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErro(false);
    supabase
      .from("ntep_cnae")
      .select("cid_agrupamento, descricao")
      .eq("cnae", cnae4)
      .eq("ativo", true)
      .order("cid_agrupamento")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setErro(true);
          toast("Não foi possível consultar o nexo NTEP.");
        } else {
          setItens(data ?? []);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cnae4]);

  if (erro) return null;

  return (
    <section className="mt-8 space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Nexo NTEP — transtornos mentais (Grupo V)</h2>
        {cnae4.length === 4 && (
          <p className="text-sm text-muted-foreground">
            Classe CNAE {cnae4} · Lista C do Anexo II do Decreto 3.048/99
          </p>
        )}
      </div>
      <div className="bg-surface border border-border rounded-md p-6">
        {cnae4.length < 4 ? (
          <p className="text-[14px] text-muted-foreground">
            CNAE não cadastrado — preencha o CNAE da empresa para consultar o nexo NTEP.
          </p>
        ) : loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        ) : itens && itens.length > 0 ? (
          <div className="space-y-4">
            <p className="text-[14px] font-medium" style={{ color: "#234A6E" }}>
              Há nexo técnico epidemiológico presumido para:
            </p>
            <div className="flex flex-wrap gap-2">
              {itens.map((item) => (
                <Badge
                  key={item.cid_agrupamento}
                  className="text-[13px] font-normal"
                  style={{
                    backgroundColor: "rgba(237, 125, 110, 0.12)",
                    color: "#ED7D6E",
                    borderColor: "rgba(237, 125, 110, 0.30)",
                  }}
                  variant="outline"
                >
                  {item.cid_agrupamento} — {item.descricao ?? ""}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[14px]" style={{ color: "#234A6E" }}>
              A classe CNAE {cnae4} não consta na Lista C do NTEP para transtornos mentais (Grupo V). Ausência de nexo epidemiológico presumido para este grupo — o que não afasta o nexo individual/pericial.
            </p>
          </div>
        )}
        <p className="mt-4 text-[11px] text-muted-foreground leading-relaxed">
          Dado de referência (Decreto 6.042/2007). Sujeito a conferência contra a redação do Decreto 6.957/2009 antes do uso em laudo definitivo.
        </p>
      </div>
    </section>
  );
}

/* ---------------- Page ---------------- */

function EmpresaDetalhePage() {
  const { id } = Route.useParams();
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const navigate = useNavigate();

  const empresaQuery = useQuery<EmpresaDetalhe | null>({
    queryKey: ["empresa-cliente", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas_cliente")
        .select(
          "id, tenant_id, razao_social, nome_fantasia, cnpj, cnae, grau_risco, endereco_cep, endereco_logradouro, endereco_numero, endereco_complemento, endereco_bairro, endereco_cidade, endereco_uf, contato_responsavel, contato_email, contato_telefone, qtd_colaboradores_estimado, inscricao_municipal, inscricao_estadual, segmento, area_atuacao, status, created_at, updated_at",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as EmpresaDetalhe | null) ?? null;
    },
  });

  const empresa = empresaQuery.data;
  const setoresQuery = useSetores(empresa?.id);

  const cargosQuery = useQuery<CargoRow[]>({
    queryKey: ["empresa-cargos", empresa?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresa_cargo")
        .select(
          "id, tenant_id, empresa_cliente_id, setor_id, cbo_codigo, nome_funcao, qtd_colaboradores, carga_horaria, atividades, ordem, cbo:cbo_codigo(codigo, titulo), setor:setor_id(id, nome)",
        )
        .eq("empresa_cliente_id", empresa!.id)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CargoRow[];
    },
    enabled: !!empresa?.id,
  });

  const avaliacoesQuery = useQuery<AvaliacaoEmpresa[]>({
    queryKey: ["nr1-avaliacoes-empresa", empresa?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nr1_avaliacao")
        .select(
          "id, nome, status, link_publico, limite_respostas, respostas_completadas, data_inicio, data_fim, data_realizacao, qtd_colaboradores_epoca, instrumento_descricao, observacao_contextual, created_at",
        )
        .eq("empresa_cliente_id", empresa!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AvaliacaoEmpresa[];
    },
    enabled: !!empresa?.id,
  });

  const modeloQuery = useQuery({
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
  const modelo = modeloQuery.data;

  const [avaliacaoDialogOpen, setAvaliacaoDialogOpen] = useState(false);
  const avaliacaoForm = useForm<AvaliacaoEmpresaInput, unknown, AvaliacaoEmpresaOutput>({
    resolver: zodResolver(avaliacaoEmpresaSchema),
    defaultValues: {
      nome: "",
      data_fim: "",
      data_realizacao: "",
      qtd_colaboradores_epoca: "",
      instrumento_descricao: "",
      observacao_contextual: "",
    },
  });

  useEffect(() => {
    if (avaliacaoDialogOpen) {
      avaliacaoForm.reset({
        nome: "",
        data_fim: "",
        data_realizacao: "",
        qtd_colaboradores_epoca: (empresa?.qtd_colaboradores_estimado ?? "") as AvaliacaoEmpresaInput["qtd_colaboradores_epoca"],
        instrumento_descricao: modelo?.nome ?? "",
        observacao_contextual: "",
      });
    }
  }, [avaliacaoDialogOpen, avaliacaoForm, empresa, modelo]);

  const criarAvaliacao = useMutation({
    mutationFn: async (values: AvaliacaoEmpresaOutput) => {
      if (!tenantId || !modelo || !empresa)
        throw new Error("Dados incompletos.");
      const limiteRespostas = empresa.qtd_colaboradores_estimado ?? 1;
      const { error } = await supabase
        .from("nr1_avaliacao")
        .insert({
          tenant_id: tenantId,
          empresa_cliente_id: empresa.id,
          modelo_instrumento_id: modelo.id,
          nome: values.nome.trim(),
          data_inicio: values.data_realizacao
            ? new Date(values.data_realizacao).toISOString()
            : new Date().toISOString(),
          data_fim: values.data_fim
            ? new Date(values.data_fim).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          limite_respostas: limiteRespostas,
          link_publico: gerarLinkPublico(),
          status: "rascunho",
          created_by: user?.id ?? null,
          data_realizacao: values.data_realizacao || null,
          qtd_colaboradores_epoca: values.qtd_colaboradores_epoca ?? null,
          instrumento_descricao:
            values.instrumento_descricao && values.instrumento_descricao.trim() !== ""
              ? values.instrumento_descricao.trim()
              : null,
          observacao_contextual:
            values.observacao_contextual && values.observacao_contextual.trim() !== ""
              ? values.observacao_contextual.trim()
              : null,
        })
        .select("id")
        .single();
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avaliação criada.");
      avaliacoesQuery.refetch();
      setAvaliacaoDialogOpen(false);
    },
    onError: (err: Error) => {
      const msg = err.message || "";
      if (/chk_data_fim_apos_inicio/i.test(msg)) {
        toast.error("A data limite deve ser posterior à data de realização.");
      } else if (/limite_respostas/i.test(msg)) {
        toast.error("A empresa precisa ter colaboradores estimados cadastrados.");
      } else if (/chk_qtd_colaboradores_epoca_positivo/i.test(msg)) {
        toast.error("Quantidade de colaboradores deve ser maior que zero.");
      } else {
        toast.error(msg || "Erro ao criar avaliação.");
      }
    },
  });

  const [editOpen, setEditOpen] = useState(false);
  const [setorDialogOpen, setSetorDialogOpen] = useState(false);
  const [setorEditando, setSetorEditando] = useState<Setor | null>(null);
  const [setorExcluir, setSetorExcluir] = useState<Setor | null>(null);

  const [cargoDialogOpen, setCargoDialogOpen] = useState(false);
  const [cargoEditando, setCargoEditando] = useState<CargoRow | null>(null);
  const [cargoExcluir, setCargoExcluir] = useState<CargoRow | null>(null);

  const abrirNovoCargo = () => {
    setCargoEditando(null);
    setCargoDialogOpen(true);
  };
  const abrirEditarCargo = (c: CargoRow) => {
    setCargoEditando(c);
    setCargoDialogOpen(true);
  };

  const { mutateAsync: excluirCargo, isPending: excluindoCargo } = useMutation({
    mutationFn: async (cargoId: string) => {
      const { error } = await supabase
        .from("empresa_cargo")
        .delete()
        .eq("id", cargoId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cargo excluído.");
      cargosQuery.refetch();
      setCargoExcluir(null);
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao excluir cargo."),
  });

  const abrirNovoSetor = () => {
    setSetorEditando(null);
    setSetorDialogOpen(true);
  };
  const abrirEditarSetor = (s: Setor) => {
    setSetorEditando(s);
    setSetorDialogOpen(true);
  };

  const { mutateAsync: excluirSetor, isPending: excluindo } = useMutation({
    mutationFn: async (setorId: string) => {
      const { error } = await supabase.from("setores").delete().eq("id", setorId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Setor excluído.");
      setoresQuery.refetch();
      setSetorExcluir(null);
    },
    onError: (err: Error) => {
      const msg = err.message || "";
      if (/foreign key|violates|constraint/i.test(msg)) {
        toast.error(
          "Não é possível excluir um setor que já possui respostas vinculadas.",
        );
      } else {
        toast.error(msg || "Erro ao excluir setor.");
      }
    },
  });

  if (empresaQuery.isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-80" />
        <div className="bg-surface border border-border rounded-md p-6 grid grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (empresaQuery.error || !empresa) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Empresa não encontrada.
        </p>
        <Button asChild variant="outline">
          <Link to="/empresas">
            <ArrowLeft />
            Voltar para Empresas-cliente
          </Link>
        </Button>
      </div>
    );
  }

  const mostrarFantasia =
    empresa.nome_fantasia &&
    empresa.nome_fantasia.trim() !== "" &&
    empresa.nome_fantasia !== empresa.razao_social;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <Link
        to="/empresas"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        Empresas-cliente
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
            empresa-cliente
          </p>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {empresa.razao_social}
            </h1>
            <StatusBadge status={empresa.status} />
          </div>
          {mostrarFantasia && (
            <p className="text-sm text-muted-foreground">
              {empresa.nome_fantasia}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          className="text-[13px]"
          onClick={() => setEditOpen(true)}
        >
          <Pencil />
          Editar
        </Button>
      </header>

      <div className="flex flex-col gap-4">
        {/* Identificação */}
        <div className="bg-surface border border-border rounded-md p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <DataItem label="CNPJ" value={formatCnpj(empresa.cnpj)} mono />
          <DataItem label="CNAE" value={empresa.cnae} />
          <DataItem label="Grau de risco NR-4" value={empresa.grau_risco} />
          <DataItem
            label="Colaboradores estimados"
            value={empresa.qtd_colaboradores_estimado}
            mono
          />
          <DataItem label="Responsável" value={empresa.contato_responsavel} />
          <DataItem label="Email" value={empresa.contato_email} />
          <DataItem label="Telefone" value={empresa.contato_telefone} />
          <DataItem label="Segmento" value={empresa.segmento} />
          <DataItem label="Área de atuação" value={empresa.area_atuacao} />
        </div>

        {/* Endereço */}
        <div className="bg-surface border border-border rounded-md p-6">
          <p className="text-[9px] font-mono uppercase tracking-[0.10em] text-muted-foreground mb-4">
            endereço
          </p>
          {!empresa.endereco_cep &&
          !empresa.endereco_logradouro &&
          !empresa.endereco_numero &&
          !empresa.endereco_complemento &&
          !empresa.endereco_bairro &&
          !empresa.endereco_cidade &&
          !empresa.endereco_uf ? (
            <p className="text-[14px] text-muted-foreground">
              Endereço não cadastrado.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <DataItem label="CEP" value={empresa.endereco_cep} mono />
              <DataItem label="Logradouro" value={empresa.endereco_logradouro} />
              <DataItem label="Número" value={empresa.endereco_numero} />
              <DataItem label="Complemento" value={empresa.endereco_complemento} />
              <DataItem label="Bairro" value={empresa.endereco_bairro} />
              <DataItem
                label="Cidade/UF"
                value={
                  empresa.endereco_cidade && empresa.endereco_uf
                    ? `${empresa.endereco_cidade}/${empresa.endereco_uf}`
                    : empresa.endereco_uf ?? empresa.endereco_cidade ?? null
                }
              />
            </div>
          )}
        </div>

        {/* Dados fiscais */}
        <div className="bg-surface border border-border rounded-md p-6">
          <p className="text-[9px] font-mono uppercase tracking-[0.10em] text-muted-foreground mb-4">
            dados fiscais
          </p>
          {!empresa.inscricao_municipal && !empresa.inscricao_estadual ? (
            <p className="text-[14px] text-muted-foreground">
              Dados fiscais não cadastrados.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DataItem
                label="Inscrição municipal"
                value={empresa.inscricao_municipal}
              />
              <DataItem
                label="Inscrição estadual"
                value={empresa.inscricao_estadual}
              />
            </div>
          )}
        </div>
      </div>

      {/* Setores */}
      <section className="mt-8 space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Setores</h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Setores ou GHEs da empresa. Usados como filtro nas avaliações NR-1.
            </p>
          </div>
          <Button
            variant="outline"
            className="text-[13px]"
            onClick={abrirNovoSetor}
          >
            <Plus />
            Novo setor
          </Button>
        </div>

        <div className="bg-surface border border-border rounded-md">
          {setoresQuery.isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Colaboradores est.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {[0, 1, 2].map((i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j} className="py-3 px-4">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : !setoresQuery.data || setoresQuery.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Nenhum setor cadastrado.
              </p>
              <Button variant="ghost" onClick={abrirNovoSetor}>
                <Plus />
                Adicionar setor
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-3 px-4 text-[13px]">Nome</TableHead>
                  <TableHead className="py-3 px-4 text-[13px]">
                    Descrição
                  </TableHead>
                  <TableHead className="py-3 px-4 text-[13px]">
                    Colaboradores est.
                  </TableHead>
                  <TableHead className="py-3 px-4 text-[13px]">Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {setoresQuery.data.map((s) => (
                  <TableRow key={s.id} className="border-b border-border">
                    <TableCell className="py-3 px-4 text-[13px] font-medium">
                      {s.nome}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-[13px] text-muted-foreground">
                      {s.descricao ?? "—"}
                    </TableCell>
                    <TableCell className="py-3 px-4 font-mono text-[13px]">
                      {s.qtd_colaboradores_estimado ?? "—"}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <SetorAtivoBadge ativo={s.ativo} />
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
                          <DropdownMenuItem onClick={() => abrirEditarSetor(s)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setSetorExcluir(s)}
                            className="text-destructive focus:text-destructive"
                          >
                            Excluir
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
      </section>

      {/* Cargos e Funções */}
      <section className="mt-8 space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Cargos e Funções</h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Cargos e funções desta empresa, opcionalmente vinculados ao CBO
              e a um setor.
            </p>
          </div>
          <Button
            variant="outline"
            className="text-[13px]"
            onClick={abrirNovoCargo}
          >
            <Plus />
            Novo cargo
          </Button>
        </div>

        <div className="bg-surface border border-border rounded-md">
          {cargosQuery.isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-3 px-4 text-[13px]">Função</TableHead>
                  <TableHead className="py-3 px-4 text-[13px]">CBO</TableHead>
                  <TableHead className="py-3 px-4 text-[13px]">Setor</TableHead>
                  <TableHead className="py-3 px-4 text-[13px]">Qtd.</TableHead>
                  <TableHead className="py-3 px-4 text-[13px]">Carga</TableHead>
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
          ) : !cargosQuery.data || cargosQuery.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Nenhum cargo cadastrado ainda.
              </p>
              <Button variant="ghost" onClick={abrirNovoCargo}>
                <Plus />
                Adicionar cargo
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-3 px-4 text-[13px]">Função</TableHead>
                  <TableHead className="py-3 px-4 text-[13px]">CBO</TableHead>
                  <TableHead className="py-3 px-4 text-[13px]">Setor</TableHead>
                  <TableHead className="py-3 px-4 text-[13px]">
                    Qtd. colaboradores
                  </TableHead>
                  <TableHead className="py-3 px-4 text-[13px]">
                    Carga horária
                  </TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargosQuery.data.map((c) => (
                  <TableRow key={c.id} className="border-b border-border">
                    <TableCell className="py-3 px-4 text-[13px] font-medium">
                      {c.nome_funcao}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-[13px] text-muted-foreground">
                      {c.cbo
                        ? `${c.cbo.codigo} — ${c.cbo.titulo}`
                        : c.cbo_codigo ?? "—"}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-[13px] text-muted-foreground">
                      {c.setor?.nome ?? "Sem setor"}
                    </TableCell>
                    <TableCell className="py-3 px-4 font-mono text-[13px]">
                      {c.qtd_colaboradores}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-[13px] text-muted-foreground">
                      {c.carga_horaria ?? "—"}
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
                          <DropdownMenuItem onClick={() => abrirEditarCargo(c)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setCargoExcluir(c)}
                            className="text-red-500 focus:text-red-500"
                          >
                            Excluir
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
      </section>

      {/* Avaliações NR-1 */}
      <section className="mt-8 space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Avaliações NR-1</h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Ciclos de avaliação de riscos psicossociais aplicados nesta
              empresa.
            </p>
          </div>
          <Button
            variant="outline"
            className="text-[13px]"
            onClick={() => setAvaliacaoDialogOpen(true)}
          >
            <Plus />
            Nova avaliação
          </Button>
        </div>

        <div className="bg-surface border border-border rounded-md">
          {avaliacoesQuery.isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-3 px-4 text-[13px]">Nome</TableHead>
                  <TableHead className="py-3 px-4 text-[13px]">Status</TableHead>
                  <TableHead className="py-3 px-4 text-[13px]">Respostas</TableHead>
                  <TableHead className="py-3 px-4 text-[13px]">Período</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {[0, 1].map((i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j} className="py-3 px-4">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : !avaliacoesQuery.data || avaliacoesQuery.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Nenhuma avaliação criada para esta empresa.
              </p>
              <Button
                variant="ghost"
                onClick={() => setAvaliacaoDialogOpen(true)}
              >
                <Plus />
                Criar primeira avaliação
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-3 px-4 text-[13px]">Nome</TableHead>
                  <TableHead className="py-3 px-4 text-[13px]">Status</TableHead>
                  <TableHead className="py-3 px-4 text-[13px]">Respostas</TableHead>
                  <TableHead className="py-3 px-4 text-[13px]">Período</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {avaliacoesQuery.data.map((a) => {
                  const pct =
                    a.limite_respostas > 0
                      ? Math.min(
                          100,
                          Math.round(
                            (a.respostas_completadas / a.limite_respostas) *
                              100,
                          ),
                        )
                      : 0;
                  const completo =
                    a.respostas_completadas >= a.limite_respostas &&
                    a.limite_respostas > 0;
                  return (
                    <TableRow key={a.id} className="border-b border-border">
                      <TableCell className="py-3 px-4 text-[13px] font-medium">
                        <Link
                          to="/nr1/$id"
                          params={{ id: a.id }}
                          className="text-foreground hover:underline"
                        >
                          {a.nome}
                        </Link>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <AvaliacaoStatusBadge status={a.status} />
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[12px]">
                            {a.respostas_completadas} / {a.limite_respostas}
                          </span>
                          <div className="h-1.5 w-16 rounded-full bg-border overflow-hidden">
                            <div
                              className={`h-full ${completo ? "bg-success" : "bg-primary"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
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
                            <DropdownMenuItem
                              onClick={() =>
                                navigate({
                                  to: "/nr1/$id",
                                  params: { id: a.id },
                                })
                              }
                            >
                              Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => copiarLink(a.link_publico)}
                              disabled={!a.link_publico}
                            >
                              Copiar link
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      <EmpresaFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        empresa={empresa}
        onSuccess={() => empresaQuery.refetch()}
      />

      <SetorDialog
        open={setorDialogOpen}
        onOpenChange={setSetorDialogOpen}
        empresaClienteId={empresa.id}
        setor={setorEditando}
        onSuccess={() => setoresQuery.refetch()}
      />

      <AlertDialog
        open={!!setorExcluir}
        onOpenChange={(o) => !o && setSetorExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir setor</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o setor {setorExcluir?.nome}? Essa
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={excluindo}
              onClick={(e) => {
                e.preventDefault();
                if (setorExcluir) excluirSetor(setorExcluir.id);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {excluindo ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CargoDialog
        open={cargoDialogOpen}
        onOpenChange={setCargoDialogOpen}
        empresaClienteId={empresa.id}
        empresaTenantId={empresa.tenant_id}
        setores={(setoresQuery.data ?? []).filter((s) => s.ativo)}
        cargo={cargoEditando}
        proximaOrdem={
          (cargosQuery.data ?? []).reduce(
            (max, c) => (c.ordem > max ? c.ordem : max),
            0,
          ) + 1
        }
        onSuccess={() => cargosQuery.refetch()}
      />

      <AlertDialog
        open={!!cargoExcluir}
        onOpenChange={(o) => !o && setCargoExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cargo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cargo {cargoExcluir?.nome_funcao}?
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindoCargo}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={excluindoCargo}
              onClick={(e) => {
                e.preventDefault();
                if (cargoExcluir) excluirCargo(cargoExcluir.id);
              }}
              className="bg-red-600 text-white hover:bg-red-600/90"
            >
              {excluindoCargo ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={avaliacaoDialogOpen}
        onOpenChange={setAvaliacaoDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova avaliação NR-1</DialogTitle>
            <DialogDescription>
              Crie um novo ciclo de avaliação para esta empresa.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={avaliacaoForm.handleSubmit((v) =>
              criarAvaliacao.mutateAsync(v),
            )}
            className="flex flex-col gap-4"
          >
            <p className="text-[13px] text-muted-foreground">
              Empresa: {empresa.razao_social}
            </p>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px]">
                Nome da avaliação
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                {...avaliacaoForm.register("nome")}
                placeholder="Ex: Ciclo 2026-Q3"
                autoFocus
              />
              {avaliacaoForm.formState.errors.nome && (
                <p className="text-[12px] text-destructive">
                  {avaliacaoForm.formState.errors.nome.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px]">Data limite</Label>
              <Input type="date" {...avaliacaoForm.register("data_fim")} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px]">Data de realização</Label>
              <Input type="date" {...avaliacaoForm.register("data_realizacao")} />
              <p className="text-[11px] text-muted-foreground">
                Quando a pesquisa foi efetivamente aplicada. Deixe vazio para usar a data atual.
              </p>
            </div>

            <div className="border-t border-border my-1" />

            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px]">Colaboradores na época</Label>
              <Input
                type="number"
                min={1}
                {...avaliacaoForm.register("qtd_colaboradores_epoca")}
              />
              {avaliacaoForm.formState.errors.qtd_colaboradores_epoca && (
                <p className="text-[12px] text-destructive">
                  {avaliacaoForm.formState.errors.qtd_colaboradores_epoca.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px]">Instrumento utilizado</Label>
              <Input {...avaliacaoForm.register("instrumento_descricao")} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px]">Observação contextual</Label>
              <Textarea
                rows={2}
                placeholder="Ex: Pós-pandemia, empresa em processo de fusão..."
                {...avaliacaoForm.register("observacao_contextual")}
              />
            </div>

            <div className="text-[12px] text-muted-foreground space-y-0.5">
              <p>Instrumento: {modelo?.nome ?? "—"}</p>
              <p>Limite: {empresa.qtd_colaboradores_estimado ?? 0}</p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAvaliacaoDialogOpen(false)}
                disabled={criarAvaliacao.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={criarAvaliacao.isPending || !modelo}
              >
                {criarAvaliacao.isPending ? "Criando..." : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute("/_auth/empresas/$id")({
  component: EmpresaDetalhePage,
  staticData: { crumb: "Detalhe" },
});