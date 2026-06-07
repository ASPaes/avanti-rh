import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Provider = "openai" | "anthropic" | "gemini";

const PROVIDER_LABEL: Record<Provider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Google Gemini",
};

const PROVIDERS: Provider[] = ["openai", "anthropic", "gemini"];

interface ModeloRow {
  provider: Provider;
  modelo_codigo: string;
  label: string;
  economico: boolean;
}

interface ConfigGlobal {
  provider: Provider;
  modelo_codigo: string;
  ativo: boolean;
  cota_mensal_padrao: number | null;
}

interface ConfigTenant {
  provider: Provider;
  modelo_codigo: string;
  ultimos4: string | null;
  ativo: boolean;
  validada_em: string | null;
}

function formatarData(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

function CardChaveIA({
  escopo,
  titulo,
  descricao,
  modelos,
  configAtual,
  onSalvou,
}: {
  escopo: "global" | "tenant";
  titulo: string;
  descricao: string;
  modelos: ModeloRow[];
  configAtual:
    | { provider: Provider; modelo_codigo: string; ultimos4?: string | null; validada_em?: string | null }
    | null;
  onSalvou: () => void;
}) {
  const [provider, setProvider] = useState<Provider>(
    configAtual?.provider ?? "openai",
  );
  const [modeloCodigo, setModeloCodigo] = useState<string>(
    configAtual?.modelo_codigo ?? "",
  );
  const [apiKey, setApiKey] = useState("");
  const [salvando, setSalvando] = useState(false);

  const modelosDoProvider = useMemo(
    () => modelos.filter((m) => m.provider === provider),
    [modelos, provider],
  );

  function handleProvider(p: string) {
    const next = p as Provider;
    setProvider(next);
    const primeiros = modelos.filter((m) => m.provider === next);
    setModeloCodigo(primeiros[0]?.modelo_codigo ?? "");
  }

  async function handleSalvar() {
    if (!provider || !modeloCodigo) {
      toast.error("Selecione o provedor e o modelo.");
      return;
    }
    if (!apiKey.trim()) {
      toast.error("Cole a chave de API antes de salvar.");
      return;
    }
    setSalvando(true);
    try {
      const { data, error } = await supabase.functions.invoke("ia-salvar-chave", {
        body: {
          escopo,
          provider,
          modelo_codigo: modeloCodigo,
          api_key: apiKey,
        },
      });
      if (error) {
        const msg =
          (data && typeof data === "object" && "error" in data && (data as { error?: string }).error) ||
          error.message ||
          "Não foi possível validar a chave.";
        toast.error(msg);
        return;
      }
      if (data && typeof data === "object" && "error" in data && (data as { error?: string }).error) {
        toast.error((data as { error: string }).error);
        return;
      }
      toast.success("Chave validada e salva.");
      setApiKey("");
      onSalvou();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar a chave.");
    } finally {
      setSalvando(false);
    }
  }

  const dataValidacao = formatarData(configAtual?.validada_em ?? null);

  return (
    <Card className="p-6 border-border/60">
      <div className="flex items-start gap-3 mb-1">
        <div
          className="rounded-sm p-2"
          style={{ backgroundColor: "rgba(237,125,110,0.12)", color: "#ED7D6E" }}
        >
          {escopo === "global" ? <ShieldCheck size={18} /> : <Sparkles size={18} />}
        </div>
        <div className="min-w-0">
          <h2 className="text-[15px] font-medium" style={{ color: "#234A6E" }}>
            {titulo}
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">{descricao}</p>
        </div>
      </div>

      {configAtual ? (
        <div className="mt-4 rounded-sm border border-border/60 bg-accent/5 px-3 py-2 text-[12px] text-muted-foreground">
          <span className="font-medium text-foreground">Configurado</span>
          {" · "}
          {PROVIDER_LABEL[configAtual.provider]}
          {" · "}
          <span className="font-mono">{configAtual.modelo_codigo}</span>
          {escopo === "tenant" && configAtual.ultimos4 && (
            <>
              {" · chave "}
              <span className="font-mono">••••{configAtual.ultimos4}</span>
            </>
          )}
          {escopo === "tenant" && dataValidacao && (
            <> {" · validada em "} {dataValidacao}</>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-sm border border-dashed border-border/60 px-3 py-2 text-[12px] text-muted-foreground">
          Nenhuma chave configurada ainda.
        </div>
      )}

      <div className="mt-5 space-y-4">
        <div>
          <Label className="text-[12px]">Provedor</Label>
          <Select value={provider} onValueChange={handleProvider}>
            <SelectTrigger className="mt-1.5 h-9 text-[13px]">
              <SelectValue placeholder="Selecione o provedor" />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => (
                <SelectItem key={p} value={p} className="text-[13px]">
                  {PROVIDER_LABEL[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-[12px]">Modelo</Label>
          <Select
            value={modeloCodigo}
            onValueChange={setModeloCodigo}
            disabled={modelosDoProvider.length === 0}
          >
            <SelectTrigger className="mt-1.5 h-9 text-[13px]">
              <SelectValue
                placeholder={
                  modelosDoProvider.length === 0
                    ? "Sem modelos ativos para este provedor"
                    : "Selecione o modelo"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {modelosDoProvider.map((m) => (
                <SelectItem
                  key={m.modelo_codigo}
                  value={m.modelo_codigo}
                  className="text-[13px]"
                >
                  <span className="flex items-center gap-2">
                    <span>{m.label}</span>
                    {m.economico && (
                      <Badge
                        variant="outline"
                        className="text-[9px] border-[#234A6E]/30 text-[#234A6E]"
                      >
                        econômico
                      </Badge>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-[12px]">
            Chave de API
            <span className="ml-2 text-[10px] font-normal text-muted-foreground">
              não é exibida depois de salva
            </span>
          </Label>
          <Input
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="cole a chave aqui"
            className="mt-1.5 font-mono"
          />
        </div>

        <div className="flex justify-end pt-1">
          <Button
            type="button"
            onClick={handleSalvar}
            disabled={salvando}
            className="text-white"
            style={{ backgroundColor: "#ED7D6E" }}
          >
            {salvando ? (
              <>
                <Loader2 className="animate-spin mr-2" size={14} />
                Validando…
              </>
            ) : (
              "Validar e salvar"
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ConfiguracoesIA() {
  const { roles, loading: authLoading } = useAuth();
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isSuperAdmin = roles.includes("super_admin");
  const isTenantAdmin = roles.includes("tenant_admin");
  const podeVer = isSuperAdmin || isTenantAdmin;

  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  useEffect(() => {
    if (!authLoading && !podeVer) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [authLoading, podeVer, navigate]);

  const modelosQuery = useQuery({
    queryKey: ["ai_modelo", "ativos"],
    enabled: podeVer,
    queryFn: async (): Promise<ModeloRow[]> => {
      const { data, error } = await supabase
        .from("ai_modelo")
        .select("provider, modelo_codigo, label, economico")
        .eq("ativo", true)
        .order("provider");
      if (error) throw error;
      return (data ?? []) as ModeloRow[];
    },
  });

  const globalQuery = useQuery({
    queryKey: ["ai_config_global"],
    enabled: podeVer && isSuperAdmin,
    queryFn: async (): Promise<ConfigGlobal | null> => {
      const { data, error } = await supabase
        .from("ai_config_global")
        .select("provider, modelo_codigo, ativo")
        .maybeSingle();
      if (error) throw error;
      return (data as ConfigGlobal | null) ?? null;
    },
  });

  const tenantQuery = useQuery({
    queryKey: ["tenant_ai_config", tenantId],
    enabled: podeVer && !!tenantId,
    queryFn: async (): Promise<ConfigTenant | null> => {
      const { data, error } = await supabase
        .from("tenant_ai_config")
        .select("provider, modelo_codigo, ultimos4, ativo, validada_em")
        .eq("ativo", true)
        .order("validada_em", { ascending: false })
        .limit(1);
      if (error) throw error;
      const linha = (data ?? [])[0] as ConfigTenant | undefined;
      return linha ?? null;
    },
  });

  if (!montado) return null;
  if (!podeVer) return null;

  const modelos = modelosQuery.data ?? [];
  const carregando =
    modelosQuery.isLoading ||
    (isSuperAdmin && globalQuery.isLoading) ||
    tenantQuery.isLoading;

  return (
    <div className="mx-auto max-w-3xl" style={{ fontFamily: "Geist, sans-serif" }}>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#0A0A0A" }}>
          Configurações de IA
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre o provedor, o modelo e a chave de API usados pelos recursos de inteligência artificial.
        </p>
      </header>

      {carregando ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : (
        <div className="space-y-6">
          {isSuperAdmin && (
            <CardChaveIA
              escopo="global"
              titulo="IA do Avanti (padrão da plataforma)"
              descricao="Chave usada quando o tenant não tem configuração própria. Visível apenas para super admin."
              modelos={modelos}
              configAtual={globalQuery.data ?? null}
              onSalvou={() => {
                queryClient.invalidateQueries({ queryKey: ["ai_config_global"] });
              }}
            />
          )}

          <CardChaveIA
            escopo="tenant"
            titulo="IA do meu tenant"
            descricao="Chave específica deste tenant. Quando configurada, substitui o padrão da plataforma."
            modelos={modelos}
            configAtual={tenantQuery.data ?? null}
            onSalvou={() => {
              queryClient.invalidateQueries({ queryKey: ["tenant_ai_config"] });
            }}
          />
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_auth/configuracoes/ia")({
  component: ConfiguracoesIA,
  staticData: { crumb: "Configurações de IA" },
});