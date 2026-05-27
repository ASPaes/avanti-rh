import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import type { EmpresaCliente } from "@/hooks/useEmpresasCliente";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

const NAO_INFORMADO = "__none__";

const empresaSchema = z.object({
  razao_social: z
    .string()
    .trim()
    .min(3, "Razão social obrigatória (mín. 3 caracteres)")
    .max(255),
  nome_fantasia: z.string().trim().max(255).optional().or(z.literal("")),
  cnpj: z.string().trim().min(14, "CNPJ obrigatório").max(18),
  cnae: z.string().trim().max(20).optional().or(z.literal("")),
  grau_risco: z
    .union([z.coerce.number().int().min(1).max(4), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : (v as number))),
  endereco_cidade: z.string().trim().max(120).optional().or(z.literal("")),
  endereco_uf: z.string().trim().max(2).optional().or(z.literal("")),
  contato_responsavel: z.string().trim().max(255).optional().or(z.literal("")),
  contato_email: z
    .string()
    .trim()
    .email("Email inválido")
    .max(255)
    .optional()
    .or(z.literal("")),
  contato_telefone: z.string().trim().max(40).optional().or(z.literal("")),
  qtd_colaboradores_estimado: z
    .union([z.coerce.number().int().positive("Deve ser positivo"), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : (v as number))),
});

type EmpresaFormValues = z.input<typeof empresaSchema>;
type EmpresaFormOutput = z.output<typeof empresaSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa?: EmpresaCliente | null;
  onSuccess: () => void;
}

function emptyDefaults(): EmpresaFormValues {
  return {
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    cnae: "",
    grau_risco: "",
    endereco_cidade: "",
    endereco_uf: "",
    contato_responsavel: "",
    contato_email: "",
    contato_telefone: "",
    qtd_colaboradores_estimado: "",
  };
}

function fromEmpresa(e: EmpresaCliente): EmpresaFormValues {
  return {
    razao_social: e.razao_social ?? "",
    nome_fantasia: e.nome_fantasia ?? "",
    cnpj: e.cnpj ?? "",
    cnae: e.cnae ?? "",
    grau_risco: (e.grau_risco ?? "") as EmpresaFormValues["grau_risco"],
    endereco_cidade: e.endereco_cidade ?? "",
    endereco_uf: e.endereco_uf ?? "",
    contato_responsavel: e.contato_responsavel ?? "",
    contato_email: e.contato_email ?? "",
    contato_telefone: "",
    qtd_colaboradores_estimado: (e.qtd_colaboradores_estimado ?? "") as EmpresaFormValues["qtd_colaboradores_estimado"],
  };
}

function cleanPayload(values: EmpresaFormOutput) {
  const nullable = (v: string | undefined) =>
    v === undefined || v.trim() === "" ? null : v.trim();
  return {
    razao_social: values.razao_social.trim(),
    nome_fantasia: nullable(values.nome_fantasia),
    cnpj: values.cnpj.trim(),
    cnae: nullable(values.cnae),
    grau_risco: values.grau_risco ?? null,
    endereco_cidade: nullable(values.endereco_cidade),
    endereco_uf: nullable(values.endereco_uf?.toUpperCase()),
    contato_responsavel: nullable(values.contato_responsavel),
    contato_email: nullable(values.contato_email),
    contato_telefone: nullable(values.contato_telefone),
    qtd_colaboradores_estimado: values.qtd_colaboradores_estimado ?? null,
  };
}

export function EmpresaFormDialog({
  open,
  onOpenChange,
  empresa,
  onSuccess,
}: Props) {
  const { tenantId } = useTenant();
  const isEdit = !!empresa;

  const form = useForm<EmpresaFormValues, unknown, EmpresaFormOutput>({
    resolver: zodResolver(empresaSchema),
    defaultValues: emptyDefaults(),
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = form;

  useEffect(() => {
    if (open) {
      reset(empresa ? fromEmpresa(empresa) : emptyDefaults());
    }
  }, [open, empresa, reset]);

  const { mutateAsync: criar, isPending: criando } = useMutation({
    mutationFn: async (values: EmpresaFormOutput) => {
      if (!tenantId) throw new Error("Tenant não selecionado.");
      const { data, error } = await supabase
        .from("empresas_cliente")
        .insert({ ...cleanPayload(values), tenant_id: tenantId })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Empresa cadastrada com sucesso.");
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) =>
      toast.error(err.message || "Erro ao cadastrar empresa."),
  });

  const { mutateAsync: editar, isPending: editando } = useMutation({
    mutationFn: async (values: EmpresaFormOutput) => {
      if (!empresa) throw new Error("Empresa inválida.");
      const { error } = await supabase
        .from("empresas_cliente")
        .update(cleanPayload(values))
        .eq("id", empresa.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Empresa atualizada com sucesso.");
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) =>
      toast.error(err.message || "Erro ao atualizar empresa."),
  });

  const submitting = criando || editando;

  const onSubmit = handleSubmit(async (values) => {
    if (isEdit) await editar(values);
    else await criar(values);
  });

  const grauRisco = watch("grau_risco");
  const uf = watch("endereco_uf");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar empresa" : "Nova empresa"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os dados da empresa."
              : "Preencha os dados da empresa-cliente."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Razão social"
            required
            className="md:col-span-2"
            error={errors.razao_social?.message}
          >
            <Input {...register("razao_social")} autoFocus />
          </Field>

          <Field
            label="Nome fantasia"
            className="md:col-span-2"
            error={errors.nome_fantasia?.message}
          >
            <Input {...register("nome_fantasia")} />
          </Field>

          <Field label="CNPJ" required error={errors.cnpj?.message}>
            <Input
              {...register("cnpj")}
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
            />
          </Field>

          <Field label="CNAE" error={errors.cnae?.message}>
            <Input {...register("cnae")} placeholder="0000-0/00" />
          </Field>

          <Field label="Grau de risco NR-4" error={errors.grau_risco?.message}>
            <Select
              value={grauRisco === undefined || grauRisco === "" ? NAO_INFORMADO : String(grauRisco)}
              onValueChange={(v) =>
                setValue(
                  "grau_risco",
                  v === NAO_INFORMADO ? "" : (Number(v) as EmpresaFormValues["grau_risco"]),
                  { shouldDirty: true },
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Não informado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NAO_INFORMADO}>Não informado</SelectItem>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Qtd. colaboradores estimada"
            error={errors.qtd_colaboradores_estimado?.message}
          >
            <Input
              {...register("qtd_colaboradores_estimado")}
              type="number"
              min={1}
            />
          </Field>

          <Field label="Cidade" error={errors.endereco_cidade?.message}>
            <Input {...register("endereco_cidade")} />
          </Field>

          <Field label="UF" error={errors.endereco_uf?.message}>
            <Select
              value={uf && uf !== "" ? uf : NAO_INFORMADO}
              onValueChange={(v) =>
                setValue("endereco_uf", v === NAO_INFORMADO ? "" : v, {
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NAO_INFORMADO}>Não informado</SelectItem>
                {UFS.map((sigla) => (
                  <SelectItem key={sigla} value={sigla}>
                    {sigla}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Responsável"
            className="md:col-span-2"
            error={errors.contato_responsavel?.message}
          >
            <Input {...register("contato_responsavel")} />
          </Field>

          <Field label="Email de contato" error={errors.contato_email?.message}>
            <Input {...register("contato_email")} type="email" />
          </Field>

          <Field label="Telefone" error={errors.contato_telefone?.message}>
            <Input {...register("contato_telefone")} />
          </Field>

          <DialogFooter className="md:col-span-2 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label className="text-[13px]">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-[12px] text-destructive">{error}</p>}
    </div>
  );
}