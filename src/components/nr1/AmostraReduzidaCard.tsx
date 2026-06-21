import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

const CORAL = "#ED7D6E";
const NAVY = "#234A6E";

interface Props {
  avaliacaoId: string;
  permitirAmostraReduzida: boolean;
  amostraReduzidaEm: string | null;
  amostraReduzidaPor: string | null;
  amostraReduzidaJustificativa: string | null;
}

function formatDateTime(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function AmostraReduzidaCard({
  avaliacaoId,
  permitirAmostraReduzida,
  amostraReduzidaEm,
  amostraReduzidaPor,
  amostraReduzidaJustificativa,
}: Props) {
  const queryClient = useQueryClient();
  const [liberarOpen, setLiberarOpen] = useState(false);
  const [reverterOpen, setReverterOpen] = useState(false);
  const [justificativa, setJustificativa] = useState("");

  useEffect(() => {
    if (!liberarOpen) setJustificativa("");
  }, [liberarOpen]);

  const { data: nomeAutor } = useQuery<string | null>({
    queryKey: ["profile-nome", amostraReduzidaPor],
    queryFn: async () => {
      if (!amostraReduzidaPor) return null;
      const { data } = await supabase
        .from("profiles")
        .select("nome_completo")
        .eq("id", amostraReduzidaPor)
        .maybeSingle();
      return (data as { nome_completo: string | null } | null)?.nome_completo ?? null;
    },
    enabled: !!amostraReduzidaPor && permitirAmostraReduzida,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["nr1-avaliacao", avaliacaoId] });
    queryClient.invalidateQueries({ queryKey: ["nr1-adesao", avaliacaoId] });
    queryClient.invalidateQueries({ queryKey: ["nr1-analise", avaliacaoId] });
    queryClient.invalidateQueries({ queryKey: ["nr1-analise"] });
    queryClient.invalidateQueries({ queryKey: ["nr1-resultado", avaliacaoId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  const mutation = useMutation({
    mutationFn: async (payload: { permitir: boolean; justificativa?: string }) => {
      const { data, error } = await supabase.rpc("nr1_definir_amostra_reduzida", {
        p_avaliacao_id: avaliacaoId,
        p_permitir: payload.permitir,
        p_justificativa: payload.justificativa,
      });
      if (error) throw new Error(error.message);
      const result = data as { error?: string } | null;
      if (result?.error) throw new Error(result.error);
      return data;
    },
    onSuccess: (_data, vars) => {
      toast.success(
        vars.permitir
          ? "Análise liberada para amostra reduzida."
          : "Liberação revertida.",
      );
      setLiberarOpen(false);
      setReverterOpen(false);
      invalidate();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Não foi possível concluir a operação.");
    },
  });

  const justTrimLen = justificativa.trim().length;
  const podeConfirmar = justTrimLen >= 20 && !mutation.isPending;

  return (
    <>
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base font-medium" style={{ fontFamily: "Geist, ui-sans-serif" }}>
            Amostra reduzida (exceção LGPD)
          </CardTitle>
          {permitirAmostraReduzida && (
            <Badge
              className="border-transparent text-white"
              style={{ backgroundColor: NAVY }}
            >
              Amostra reduzida ativa
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4 text-sm" style={{ fontFamily: "Geist, ui-sans-serif" }}>
          {!permitirAmostraReduzida ? (
            <>
              <p className="text-muted-foreground leading-relaxed">
                Por padrão, análises com menos de 5 respondentes ficam bloqueadas para
                proteger o anonimato (LGPD). Empresas com menos de 5 colaboradores no
                total podem ser liberadas sob justificativa registrada.
              </p>
              <Button
                variant="outline"
                onClick={() => setLiberarOpen(true)}
                style={{ color: CORAL, borderColor: CORAL }}
              >
                Permitir análise com menos de 5 respondentes
              </Button>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">
                Liberado em {formatDateTime(amostraReduzidaEm)}
                {nomeAutor ? ` por ${nomeAutor}` : ""}.
              </p>
              {amostraReduzidaJustificativa && (
                <div className="rounded-md border border-border/60 bg-muted/30 p-3">
                  <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                    Justificativa registrada
                  </div>
                  <p className="whitespace-pre-wrap text-foreground">
                    {amostraReduzidaJustificativa}
                  </p>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReverterOpen(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                Reverter
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={liberarOpen} onOpenChange={setLiberarOpen}>
        <AlertDialogContent style={{ fontFamily: "Geist, ui-sans-serif" }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Liberar análise com amostra reduzida</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Libera apenas a análise no nível da empresa.</li>
                <li>A quebra por setor continua bloqueada.</li>
                <li>A decisão fica registrada no laudo e no log de auditoria com seu nome.</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="amostra-justificativa">Justificativa (obrigatória)</Label>
            <Textarea
              id="amostra-justificativa"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Ex.: empresa com 3 colaboradores no total; análise quantitativa aplicada com ciência da limitação metodológica."
              rows={4}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Mínimo de 20 caracteres.</span>
              <span>{justTrimLen} caractere{justTrimLen === 1 ? "" : "s"}</span>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>Cancelar</AlertDialogCancel>
            <Button
              onClick={() =>
                mutation.mutate({ permitir: true, justificativa: justificativa.trim() })
              }
              disabled={!podeConfirmar}
              style={{ backgroundColor: CORAL, color: "white" }}
            >
              {mutation.isPending && <Loader2 className="animate-spin" />}
              Confirmar liberação
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reverterOpen} onOpenChange={setReverterOpen}>
        <AlertDialogContent style={{ fontFamily: "Geist, ui-sans-serif" }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Reverter liberação de amostra reduzida?</AlertDialogTitle>
            <AlertDialogDescription>
              A análise volta a respeitar o mínimo de 5 respondentes. A ação ficará
              registrada no log de auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => mutation.mutate({ permitir: false })}
              disabled={mutation.isPending}
            >
              {mutation.isPending && <Loader2 className="animate-spin" />}
              Reverter
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}