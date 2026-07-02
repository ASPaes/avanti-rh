import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import type { EmpresaCliente } from "@/hooks/useEmpresasCliente";
import { maskCep, maskCnpj, maskTelefone, onlyDigits } from "@/lib/masks";
import { buscarCnpj } from "@/lib/cnpj-lookup";
import { buscarCep } from "@/lib/cep-lookup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  cnae_descricao: z.string().trim().max(255).optional().or(z.literal("")),
  grau_risco: z
    .union([z.coerce.number().int().min(1).max(4), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : (v as number))),
  endereco_cep: z.string().max(9).optional().or(z.literal("")),
  endereco_logradouro: z.string().max(255).optional().or(z.literal("")),
  endereco_numero: z.string().max(20).optional().or(z.literal("")),
  endereco_complemento: z.string().max(255).optional().or(z.literal("")),
  endereco_bairro: z.string().max(120).optional().or(z.literal("")),
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
  inscricao_municipal: z.string().max(30).optional().or(z.literal("")),
  inscricao_estadual: z.string().max(30).optional().or(z.literal("")),
  segmento: z.string().max(120).optional().or(z.literal("")),
  area_atuacao: z.string().max(4000).optional().or(z.literal("")),
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
    cnae_descricao: "",
    grau_risco: "",
    endereco_cep: "",
    endereco_logradouro: "",
    endereco_numero: "",
    endereco_complemento: "",
    endereco_bairro: "",
    endereco_cidade: "",
    endereco_uf: "",
    contato_responsavel: "",
    contato_email: "",
    contato_telefone: "",
    qtd_colaboradores_estimado: "",
    inscricao_municipal: "",
    inscricao_estadual: "",
    segmento: "",
    area_atuacao: "",
  };
}

function fromEmpresa(e: EmpresaCliente): EmpresaFormValues {
  return {
    razao_social: e.razao_social ?? "",
    nome_fantasia: e.nome_fantasia ?? "",
    cnpj: maskCnpj(e.cnpj ?? ""),
    cnae: e.cnae ?? "",
    cnae_descricao: e.cnae_descricao ?? "",
    grau_risco: (e.grau_risco ?? "") as EmpresaFormValues["grau_risco"],
    endereco_cep: maskCep(e.endereco_cep ?? ""),
    endereco_logradouro: e.endereco_logradouro ?? "",
    endereco_numero: e.endereco_numero ?? "",
    endereco_complemento: e.endereco_complemento ?? "",
    endereco_bairro: e.endereco_bairro ?? "",
    endereco_cidade: e.endereco_cidade ?? "",
    endereco_uf: e.endereco_uf ?? "",
    contato_responsavel: e.contato_responsavel ?? "",
    contato_email: e.contato_email ?? "",
    contato_telefone: maskTelefone(e.contato_telefone ?? ""),
    qtd_colaboradores_estimado: (e.qtd_colaboradores_estimado ?? "") as EmpresaFormValues["qtd_colaboradores_estimado"],
    inscricao_municipal: e.inscricao_municipal ?? "",
    inscricao_estadual: e.inscricao_estadual ?? "",
    segmento: e.segmento ?? "",
    area_atuacao: e.area_atuacao ?? "",
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
    cnae_descricao: nullable(values.cnae_descricao),
    grau_risco: values.grau_risco ?? null,
    endereco_cep: nullable(values.endereco_cep),
    endereco_logradouro: nullable(values.endereco_logradouro),
    endereco_numero: nullable(values.endereco_numero),
    endereco_complemento: nullable(values.endereco_complemento),
    endereco_bairro: nullable(values.endereco_bairro),
    endereco_cidade: nullable(values.endereco_cidade),
    endereco_uf: nullable(values.endereco_uf?.toUpperCase()),
    contato_responsavel: nullable(values.contato_responsavel),
    contato_email: nullable(values.contato_email),
    contato_telefone: nullable(values.contato_telefone),
    qtd_colaboradores_estimado: values.qtd_colaboradores_estimado ?? null,
    inscricao_municipal: nullable(values.inscricao_municipal),
    inscricao_estadual: nullable(values.inscricao_estadual),
    segmento: nullable(values.segmento),
    area_atuacao: nullable(values.area_atuacao),
  };
}

function formatCnae(raw: number | string | null | undefined): string {
  if (raw === null || raw === undefined || raw === "") return "";
  const d = String(raw).replace(/\D/g, "");
  if (d.length !== 7) return String(raw);
  return `${d.slice(0, 4)}-${d.slice(4, 5)}/${d.slice(5, 7)}`;
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
    getValues,
    formState: { errors },
  } = form;

  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

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
  const cnpjValue = watch("cnpj");
  const cepValue = watch("endereco_cep");
  const telefoneValue = watch("contato_telefone");

  const handleConsultarCnpj = async () => {
    if (onlyDigits(cnpjValue ?? "").length !== 14) {
      toast.warning("Informe um CNPJ completo (14 dígitos).");
      return;
    }
    setBuscandoCnpj(true);
    try {
      const data = await buscarCnpj(cnpjValue ?? "");
      if (!data) {
        toast.warning("CNPJ não encontrado na base da Receita Federal.");
        return;
      }
      const current = getValues();
      const setIfEmpty = (
        field: keyof EmpresaFormValues,
        value: string,
      ) => {
        if (!value) return;
        const cur = current[field];
        if (cur === undefined || cur === null || cur === "") {
          setValue(field, value as never, { shouldValidate: true, shouldDirty: true });
        }
      };
      setIfEmpty("razao_social", data.razao_social ?? "");
      setIfEmpty("nome_fantasia", data.nome_fantasia ?? "");
      const cnaeStr = data.cnae_fiscal ? formatCnae(data.cnae_fiscal) : "";
      if (cnaeStr) setIfEmpty("cnae", cnaeStr);
      if (data.cnae_fiscal_descricao) setIfEmpty("cnae_descricao", data.cnae_fiscal_descricao);
      if (data.cep) setValue("endereco_cep", maskCep(data.cep), { shouldDirty: true });
      if (data.logradouro) setValue("endereco_logradouro", data.logradouro, { shouldDirty: true });
      if (data.numero) setValue("endereco_numero", data.numero, { shouldDirty: true });
      if (data.complemento) setValue("endereco_complemento", data.complemento, { shouldDirty: true });
      if (data.bairro) setValue("endereco_bairro", data.bairro, { shouldDirty: true });
      if (data.municipio) setValue("endereco_cidade", data.municipio, { shouldDirty: true });
      if (data.uf) setValue("endereco_uf", data.uf, { shouldDirty: true });
      toast.success("Dados do CNPJ preenchidos automaticamente.");
    } finally {
      setBuscandoCnpj(false);
    }
  };

  const handleConsultarCep = async () => {
    if (onlyDigits(cepValue ?? "").length !== 8) {
      toast.warning("Informe um CEP completo (8 dígitos).");
      return;
    }
    setBuscandoCep(true);
    try {
      const data = await buscarCep(cepValue ?? "");
      if (!data) {
        toast.warning("CEP não encontrado.");
        return;
      }
      if (data.logradouro)
        setValue("endereco_logradouro", data.logradouro, { shouldDirty: true });
      if (data.complemento)
        setValue("endereco_complemento", data.complemento, { shouldDirty: true });
      if (data.bairro)
        setValue("endereco_bairro", data.bairro, { shouldDirty: true });
      if (data.localidade)
        setValue("endereco_cidade", data.localidade, { shouldDirty: true });
      if (data.uf) setValue("endereco_uf", data.uf, { shouldDirty: true });
      toast.success("Endereço preenchido pelo CEP.");
    } finally {
      setBuscandoCep(false);
    }
  };

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

        <form
          onSubmit={onSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-1"
        >
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
            <div className="flex gap-2">
              <Input
                value={cnpjValue ?? ""}
                onChange={(e) =>
                  setValue("cnpj", maskCnpj(e.target.value), {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={handleConsultarCnpj}
                disabled={buscandoCnpj}
                aria-label="Consultar CNPJ"
              >
                {buscandoCnpj ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Search />
                )}
              </Button>
            </div>
          </Field>

          <Field label="CNAE" error={errors.cnae?.message}>
            <Input {...register("cnae")} placeholder="0000-0/00" />
          </Field>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cnae_descricao">Descrição do CNAE</Label>
            <Input id="cnae_descricao" {...register("cnae_descricao")} placeholder="Preenchido pela consulta de CNPJ" />
          </div>

          <Field label="Grau de risco NR-4" error={errors.grau_risco?.message}>
            <Select
              value={
                grauRisco === undefined || grauRisco === ""
                  ? NAO_INFORMADO
                  : String(grauRisco)
              }
              onValueChange={(v) =>
                setValue(
                  "grau_risco",
                  v === NAO_INFORMADO
                    ? ""
                    : (Number(v) as EmpresaFormValues["grau_risco"]),
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

          <Field label="Segmento" error={errors.segmento?.message}>
            <Input
              {...register("segmento")}
              list="segmentos-list"
              placeholder="Ex: Indústria"
            />
            <datalist id="segmentos-list">
              <option value="Indústria" />
              <option value="Comércio" />
              <option value="Serviços" />
              <option value="Agronegócio" />
              <option value="Construção civil" />
              <option value="Saúde" />
              <option value="Educação" />
              <option value="Tecnologia" />
              <option value="Transporte e logística" />
              <option value="Energia" />
            </datalist>
          </Field>

          <Field label="Área de atuação" error={errors.area_atuacao?.message}>
            <Input
              {...register("area_atuacao")}
              placeholder="Ex: Metalurgia, Varejo alimentar"
            />
          </Field>

          <div className="md:col-span-2 border-t border-border/30 my-3" />

          <Field label="CEP" error={errors.endereco_cep?.message}>
            <div className="flex gap-2">
              <Input
                value={cepValue ?? ""}
                onChange={(e) =>
                  setValue("endereco_cep", maskCep(e.target.value), {
                    shouldDirty: true,
                  })
                }
                placeholder="00000-000"
                inputMode="numeric"
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={handleConsultarCep}
                disabled={buscandoCep}
                aria-label="Consultar CEP"
              >
                {buscandoCep ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Search />
                )}
              </Button>
            </div>
          </Field>

          <div className="hidden md:block" />

          <Field
            label="Logradouro"
            className="md:col-span-2"
            error={errors.endereco_logradouro?.message}
          >
            <Input {...register("endereco_logradouro")} />
          </Field>

          <Field label="Número" error={errors.endereco_numero?.message}>
            <Input {...register("endereco_numero")} />
          </Field>

          <Field
            label="Complemento"
            error={errors.endereco_complemento?.message}
          >
            <Input {...register("endereco_complemento")} />
          </Field>

          <Field label="Bairro" error={errors.endereco_bairro?.message}>
            <Input {...register("endereco_bairro")} />
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

          <div className="md:col-span-2 border-t border-border/30 my-3" />

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
            <Input
              value={telefoneValue ?? ""}
              onChange={(e) =>
                setValue("contato_telefone", maskTelefone(e.target.value), {
                  shouldDirty: true,
                })
              }
              placeholder="(00) 00000-0000"
              inputMode="numeric"
            />
          </Field>

          <div className="md:col-span-2 border-t border-border/30 my-3" />

          <p className="md:col-span-2 text-[9px] font-mono uppercase tracking-[0.12em] text-muted-foreground mt-1">
            dados fiscais
          </p>

          <Field
            label="Inscrição municipal"
            error={errors.inscricao_municipal?.message}
          >
            <Input {...register("inscricao_municipal")} />
          </Field>

          <Field
            label="Inscrição estadual"
            error={errors.inscricao_estadual?.message}
          >
            <Input {...register("inscricao_estadual")} />
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