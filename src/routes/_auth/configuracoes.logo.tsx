import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image as ImageIcon, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const TIPOS_PERMITIDOS = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
const TAMANHO_MAX = 2 * 1024 * 1024;

function ConfiguracoesLogo() {
  const { roles, loading } = useAuth();
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  const isSuperAdmin = roles.includes("super_admin");
  const isTenantAdmin = roles.includes("tenant_admin");
  const podeEditar = isSuperAdmin || isTenantAdmin;

  useEffect(() => {
    if (!loading && !podeEditar) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, podeEditar, navigate]);

  const { data: tenant, refetch } = useQuery({
    queryKey: ["tenant-logo", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, nome_fantasia, logo_url")
        .eq("id", tenantId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const handleSelecionar = () => inputRef.current?.click();

  const handleArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;

    if (!TIPOS_PERMITIDOS.includes(file.type)) {
      toast.error("Formato inválido. Use png, jpg ou svg.");
      e.target.value = "";
      return;
    }
    if (file.size > TAMANHO_MAX) {
      toast.error("Arquivo maior que 2MB.");
      e.target.value = "";
      return;
    }

    setEnviando(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `${tenantId}/logo.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("tenant-assets")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const publicUrl = supabase.storage
        .from("tenant-assets")
        .getPublicUrl(path).data.publicUrl;
      const urlComCacheBust = `${publicUrl}?v=${Date.now()}`;

      const { error: updErr } = await supabase
        .from("tenants")
        .update({ logo_url: urlComCacheBust })
        .eq("id", tenantId);
      if (updErr) throw updErr;

      toast.success("Logo atualizada com sucesso.");
      await queryClient.invalidateQueries({ queryKey: ["tenant-logo", tenantId] });
      await refetch();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Falha ao enviar logo.");
    } finally {
      setEnviando(false);
      e.target.value = "";
    }
  };

  if (!podeEditar) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8 flex items-start gap-3">
        <div className="mt-1 text-muted-foreground">
          <ImageIcon size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Logo da empresa</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Logo do tenant exibida nos relatórios e na interface. Formatos png, jpg ou svg, até 2MB.
          </p>
        </div>
      </header>

      <Card className="p-6">
        <div className="mb-4">
          <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
            tenant
          </p>
          <p className="text-[14px] text-foreground mt-1">
            {tenant?.nome_fantasia ?? "—"}
          </p>
        </div>

        <div className="flex flex-col items-start gap-4">
          <div className="flex h-32 w-64 items-center justify-center rounded-sm border border-border bg-surface/40 overflow-hidden">
            {tenant?.logo_url ? (
              <img
                src={tenant.logo_url}
                alt={`Logo de ${tenant.nome_fantasia ?? "tenant"}`}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span className="text-[12px] text-muted-foreground">
                Nenhuma logo cadastrada
              </span>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            className="hidden"
            onChange={handleArquivo}
          />

          <Button
            type="button"
            onClick={handleSelecionar}
            disabled={enviando}
            className="gap-2"
          >
            <Upload size={14} />
            {enviando ? "Enviando..." : tenant?.logo_url ? "Trocar logo" : "Enviar logo"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/_auth/configuracoes/logo")({
  component: ConfiguracoesLogo,
  staticData: { crumb: "Logo da empresa" },
});