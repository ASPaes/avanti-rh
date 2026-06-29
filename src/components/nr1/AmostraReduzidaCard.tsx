import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const CORAL = "#ED7D6E";
const NAVY = "#234A6E";

interface Props {
  avaliacaoId: string;
  permitirAmostraReduzida: boolean;
  amostraReduzidaEm: string | null;
  amostraReduzidaPor: string | null;
  amostraReduzidaJustificativa: string | null;
}

export function AmostraReduzidaCard({ avaliacaoId, permitirAmostraReduzida }: Props) {
  const queryClient = useQueryClient();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["nr1-avaliacao", avaliacaoId] });
    queryClient.invalidateQueries({ queryKey: ["nr1-adesao", avaliacaoId] });
    queryClient.invalidateQueries({ queryKey: ["nr1-analise", avaliacaoId] });
    queryClient.invalidateQueries({ queryKey: ["nr1-analise"] });
    queryClient.invalidateQueries({ queryKey: ["nr1-resultado", avaliacaoId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  const mutation = useMutation({
    mutationFn: async (permitir: boolean) => {
      const { data, error } = await supabase.rpc("nr1_definir_amostra_reduzida", {
        p_avaliacao_id: avaliacaoId,
        p_permitir: permitir,
      });
      if (error) throw new Error(error.message);
      const result = data as { error?: string } | null;
      if (result?.error) throw new Error(result.error);
      return data;
    },
    onSuccess: (_d, permitir) => {
      toast.success(permitir ? "Amostra reduzida ativada." : "Amostra reduzida desativada.");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message || "Não foi possível concluir a operação."),
  });

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base font-medium" style={{ fontFamily: "Geist, ui-sans-serif" }}>
          Amostra reduzida
        </CardTitle>
        {permitirAmostraReduzida && (
          <Badge className="border-transparent text-white" style={{ backgroundColor: NAVY }}>
            Ativa
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4 text-sm" style={{ fontFamily: "Geist, ui-sans-serif" }}>
        {!permitirAmostraReduzida ? (
          <Button
            variant="outline"
            onClick={() => mutation.mutate(true)}
            disabled={mutation.isPending}
            style={{ color: CORAL, borderColor: CORAL }}
          >
            {mutation.isPending && <Loader2 className="animate-spin" />}
            Permitir amostra reduzida
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => mutation.mutate(false)}
            disabled={mutation.isPending}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            {mutation.isPending && <Loader2 className="animate-spin" />}
            Reverter
          </Button>
        )}
      </CardContent>
    </Card>
  );
}