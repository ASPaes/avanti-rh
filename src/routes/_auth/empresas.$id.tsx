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
import { ArrowLeft, MoreHorizontal, Pencil, Plus } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type EmpresaDetalhe = EmpresaCliente & {
  updated_at: string;
};

function formatCnpj(cnpj: string): string {
  const digits = (cnpj ?? "").replace(/\D/g, "");
  if (digits.length !== 14) return cnpj;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

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

function EmpresaDetalhePage() {
  const { id } = Route.useParams();

  const empresaQuery = useQuery<EmpresaDetalhe | null>({
    queryKey: ["empresa-cliente", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas_cliente")
        .select(
          "id, razao_social, nome_fantasia, cnpj, cnae, grau_risco, endereco_cep, endereco_logradouro, endereco_numero, endereco_complemento, endereco_bairro, endereco_cidade, endereco_uf, contato_responsavel, contato_email, contato_telefone, qtd_colaboradores_estimado, inscricao_municipal, inscricao_estadual, status, created_at, updated_at",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as EmpresaDetalhe | null) ?? null;
    },
  });

  const empresa = empresaQuery.data;
  const setoresQuery = useSetores(empresa?.id);

  const [editOpen, setEditOpen] = useState(false);
  const [setorDialogOpen, setSetorDialogOpen] = useState(false);
  const [setorEditando, setSetorEditando] = useState<Setor | null>(null);
  const [setorExcluir, setSetorExcluir] = useState<Setor | null>(null);

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
    </div>
  );
}

export const Route = createFileRoute("/_auth/empresas/$id")({
  component: EmpresaDetalhePage,
  staticData: { crumb: "Detalhe" },
});