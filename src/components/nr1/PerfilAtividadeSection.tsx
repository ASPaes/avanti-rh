import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface PerfilItem {
  id: string;
  nome: string;
  tenant_id: string | null;
  origem: string | null;
  ativo: boolean;
}

interface Props {
  empresaId: string;
  tenantId: string | null;
  perfilAtualId: string | null;
}

export function PerfilAtividadeSection({
  empresaId,
  tenantId,
  perfilAtualId,
}: Props) {
  const [selecionado, setSelecionado] = useState<string>(
    perfilAtualId ?? "__none",
  );

  const perfisQuery = useQuery<PerfilItem[]>({
    queryKey: ["nr1-perfil-atividade", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nr1_perfil_atividade")
        .select("id, nome, tenant_id, origem, ativo")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as PerfilItem[];
    },
  });

  const salvar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("empresas_cliente")
        .update({
          perfil_atividade_id:
            selecionado === "__none" ? null : selecionado,
        })
        .eq("id", empresaId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil de atividade atualizado.");
    },
    onError: (e: Error) => {
      toast.error("Erro ao salvar.", { description: e.message });
    },
  });

  const modelos =
    perfisQuery.data?.filter((p) => p.tenant_id === null) ?? [];
  const meus =
    perfisQuery.data?.filter(
      (p) => p.tenant_id !== null && p.tenant_id === tenantId,
    ) ?? [];

  return (
    <Card className="bg-surface border border-border rounded-md p-6">
      <div className="space-y-1 mb-4">
        <h3
          className="text-[15px] font-semibold tracking-tight"
          style={{ color: "#234A6E" }}
        >
          Perfil de atividade
        </h3>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          Define a severidade base por tipo de atividade desta empresa, usada
          no cálculo do PGR. Empresas sem perfil usam a severidade padrão do
          documento.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
        <div className="flex-1 w-full sm:w-auto">
          <Label className="text-[13px] mb-1.5 block">Perfil</Label>
          <Select value={selecionado} onValueChange={setSelecionado}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione um perfil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">
                Nenhum (usa o padrão do documento)
              </SelectItem>

              {modelos.length > 0 && (
                <>
                  <SelectItem value="__header-modelos" disabled>
                    Modelos do sistema
                  </SelectItem>
                  {modelos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} · modelo
                    </SelectItem>
                  ))}
                </>
              )}

              {meus.length > 0 && (
                <>
                  <SelectItem value="__header-meus" disabled>
                    Meus perfis
                  </SelectItem>
                  {meus.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => salvar.mutate()}
          disabled={salvar.isPending}
          className="text-[13px]"
          style={{
            backgroundColor: "#234A6E",
            color: "#fff",
          }}
        >
          {salvar.isPending ? (
            <Loader2 className="animate-spin mr-2" size={16} />
          ) : null}
          {salvar.isPending ? "Salvando..." : "Salvar perfil"}
        </Button>
      </div>
    </Card>
  );
}
