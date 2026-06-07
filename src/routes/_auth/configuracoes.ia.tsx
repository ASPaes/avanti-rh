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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface UsoLinha {
  tenant_id: string;
  mes: string;
  chamadas: number;
  chamadas_ok: number;
  chamadas_erro: number;
  custo_total_usd: number;
  custo_medio_chamada_usd: number;
  custo_avanti_usd: number;
}

interface TenantInfo {
  id: string;
  nome: string;
  slug: string | null;
}

function ConsumoIASection() {
  const [carregando, setCarregando] = useState(true);
  const [linhas, setLinhas] = useState<UsoLinha[]>([]);
  const [teto, setTeto] = useState<number | null>(null);
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const inicio = new Date();
        inicio.setUTCDate(1);
        inicio.setUTCHours(0, 0, 0, 0);

        const [usoRes, cfgRes, tenantsRes] = await Promise.all([
          (supabase.from("ai_uso_mensal" as never) as never as {
            select: (s: string) => { gte: (col: string, val: string) => Promise<{ data: UsoLinha[] | null; error: { message: string } | null }> };
          })
            .select(
              "tenant_id, mes, chamadas, chamadas_ok, chamadas_erro, custo_total_usd, custo_medio_chamada_usd, custo_avanti_usd",
            )
            .gte("mes", inicio.toISOString()),
          supabase
            .from("ai_config_global")
            .select("cota_mensal_padrao")
            .eq("id", true)
            .maybeSingle(),
          supabase.from("tenants").select("id, nome, slug"),
        ]);

        if (cancelado) return;

        if (usoRes.error) throw new Error(usoRes.error.message);
        setLinhas((usoRes.data ?? []) as UsoLinha[]);
        setTeto(
          (cfgRes.data as { cota_mensal_padrao: number | null } | null)
            ?.cota_mensal_padrao ?? null,
        );
        setTenants(((tenantsRes.data ?? []) as TenantInfo[]));
      } catch (e) {
        if (!cancelado) setErro(e instanceof Error ? e.message : "Erro ao carregar.");
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  const gastoGlobalAvanti = linhas.reduce(
    (acc, l) => acc + (Number(l.custo_avanti_usd) || 0),
    0,
  );
  const totalChamadas = linhas.reduce((acc, l) => acc + (Number(l.chamadas) || 0), 0);
  const totalOk = linhas.reduce((acc, l) => acc + (Number(l.chamadas_ok) || 0), 0);
  const totalErro = linhas.reduce((acc, l) => acc + (Number(l.chamadas_erro) || 0), 0);
  const totalCusto = linhas.reduce(
    (acc, l) => acc + (Number(l.custo_total_usd) || 0),
    0,
  );
  const custoMedio = totalOk > 0 ? totalCusto / totalOk : 0;
  const pctTeto = teto && teto > 0 ? (gastoGlobalAvanti / teto) * 100 : null;
  const corBarra = pctTeto !== null && pctTeto >= 80 ? "#ED7D6E" : "#234A6E";

  const linhasOrdenadas = [...linhas].sort(
    (a, b) => (Number(b.custo_total_usd) || 0) - (Number(a.custo_total_usd) || 0),
  );

  return (
    <div className="space-y-4">
      <h2 className="text-[15px] font-medium" style={{ color: "#234A6E" }}>
        Consumo de IA (mês corrente)
      </h2>

      <Card className="p-6 border-border/60">
        <h3 className="text-[13px] font-medium" style={{ color: "#234A6E" }}>
          IA do Avanti — consumo do mês
        </h3>

        {carregando ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="animate-spin" size={18} />
          </div>
        ) : erro ? (
          <p className="mt-3 text-[12px]" style={{ color: "#ED7D6E" }}>
            {erro}
          </p>
        ) : (
          <>
            <div className="mt-3">
              <div
                className="text-3xl font-semibold tracking-tight"
                style={{ color: "#234A6E" }}
              >
                US$ {gastoGlobalAvanti.toFixed(4)}
              </div>
              <div className="text-[12px] text-muted-foreground">
                Gasto estimado (chave do Avanti)
              </div>
            </div>

            <div className="mt-3 text-[12px] text-muted-foreground">
              {teto !== null && teto !== undefined
                ? `Teto: US$ ${Number(teto).toFixed(2)}`
                : "Teto: sem limite"}
            </div>

            {pctTeto !== null && (
              <div className="mt-2">
                <div className="h-2 w-full rounded-sm bg-muted overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(0, pctTeto))}%`,
                      backgroundColor: corBarra,
                    }}
                  />
                </div>
                <div className="mt-1 text-[11px]" style={{ color: corBarra }}>
                  {pctTeto.toFixed(0)}% do teto
                </div>
              </div>
            )}

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-sm border border-border/60 px-3 py-2">
                <div className="text-[11px] text-muted-foreground">Chamadas no mês</div>
                <div className="text-[14px] font-medium" style={{ color: "#234A6E" }}>
                  {totalChamadas}
                </div>
              </div>
              <div className="rounded-sm border border-border/60 px-3 py-2">
                <div className="text-[11px] text-muted-foreground">
                  Custo médio/chamada
                </div>
                <div className="text-[14px] font-medium" style={{ color: "#234A6E" }}>
                  US$ {custoMedio.toFixed(5)}
                </div>
              </div>
              <div className="rounded-sm border border-border/60 px-3 py-2">
                <div className="text-[11px] text-muted-foreground">Erros</div>
                <div className="text-[14px] font-medium" style={{ color: "#234A6E" }}>
                  {totalErro}
                </div>
              </div>
            </div>

            <p className="mt-4 text-[11px] text-muted-foreground">
              Custos são estimativas (tokens × preço de catálogo), não a fatura real do provider.
            </p>
          </>
        )}
      </Card>

      <Card className="p-6 border-border/60">
        <h3 className="text-[13px] font-medium" style={{ color: "#234A6E" }}>
          Por cliente
        </h3>
        {carregando ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="animate-spin" size={18} />
          </div>
        ) : linhasOrdenadas.length === 0 ? (
          <p className="mt-3 text-[12px] text-muted-foreground">
            Nenhum uso de IA registrado neste mês.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[12px]">Cliente</TableHead>
                  <TableHead className="text-[12px] text-right">Chamadas</TableHead>
                  <TableHead className="text-[12px] text-right">
                    Custo estimado (US$)
                  </TableHead>
                  <TableHead className="text-[12px] text-right">
                    Custo médio/chamada (US$)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhasOrdenadas.map((l) => {
                  const nome =
                    tenants.find((t) => t.id === l.tenant_id)?.nome ?? l.tenant_id;
                  return (
                    <TableRow key={`${l.tenant_id}-${l.mes}`}>
                      <TableCell className="text-[13px]" style={{ color: "#234A6E" }}>
                        {nome}
                      </TableCell>
                      <TableCell className="text-[13px] text-right">
                        {Number(l.chamadas) || 0}
                      </TableCell>
                      <TableCell className="text-[13px] text-right">
                        {(Number(l.custo_total_usd) || 0).toFixed(4)}
                      </TableCell>
                      <TableCell className="text-[13px] text-right">
                        {(Number(l.custo_medio_chamada_usd) || 0).toFixed(5)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
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
  cotaMensalPadrao,
  onSalvou,
}: {
  escopo: "global" | "tenant";
  titulo: string;
  descricao: string;
  modelos: ModeloRow[];
  configAtual:
    | { provider: Provider; modelo_codigo: string; ultimos4?: string | null; validada_em?: string | null }
    | null;
  cotaMensalPadrao?: number | null;
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
  const [inputTeto, setInputTeto] = useState("");
  const [salvandoTeto, setSalvandoTeto] = useState(false);

  useEffect(() => {
    if (escopo === "global" && cotaMensalPadrao !== undefined) {
      setInputTeto(
        cotaMensalPadrao !== null && cotaMensalPadrao !== undefined
          ? String(cotaMensalPadrao)
          : ""
      );
    }
  }, [escopo, cotaMensalPadrao]);

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

  async function handleSalvarTeto() {
    const valor = inputTeto.trim();
    const novo = valor === "" ? null : Number(valor);
    if (novo !== null && (isNaN(novo) || novo < 0)) {
      toast.error("Valor inválido", {
        description: "Informe um número >= 0 ou deixe vazio.",
      });
      return;
    }
    setSalvandoTeto(true);
    try {
      const { error } = await supabase
        .from("ai_config_global")
        .update({ cota_mensal_padrao: novo })
        .eq("id", true);
      if (error) {
        toast.error("Erro ao salvar", { description: error.message });
        return;
      }
      toast.success(novo === null ? "Teto removido" : "Teto salvo");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar o teto.");
    } finally {
      setSalvandoTeto(false);
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

        {escopo === "global" && (
          <div>
            <Label className="text-[12px]">Teto mensal de consumo (USD)</Label>
            <p className="mt-0.5 mb-1.5 text-[11px] text-muted-foreground">
              Limite de gasto estimado somando todos os clientes que usam a chave do Avanti. Ao atingir, novas chamadas são bloqueadas até o tenant cadastrar a própria chave. Deixe vazio para sem limite.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-muted-foreground select-none">US$</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={inputTeto}
                onChange={(e) => setInputTeto(e.target.value)}
                placeholder="sem limite"
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleSalvarTeto}
                disabled={salvandoTeto}
                className="text-white"
                style={{ backgroundColor: "#ED7D6E" }}
              >
                {salvandoTeto ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={14} />
                    Salvando…
                  </>
                ) : (
                  "Salvar teto"
                )}
              </Button>
            </div>
          </div>
        )}

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
        .select("provider, modelo_codigo, ativo, cota_mensal_padrao")
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
              cotaMensalPadrao={(globalQuery.data as ConfigGlobal | null)?.cota_mensal_padrao ?? null}
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