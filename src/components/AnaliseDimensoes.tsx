import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AnaliseDimensaoCard } from "@/components/AnaliseDimensaoCard";
import { useAnaliseDimensao, NIVEL_LABELS } from "@/hooks/useAnaliseDimensao";

const CONSOLIDADO = "__consolidado__";

interface Setor {
  id: string;
  nome: string;
}

interface Props {
  avaliacaoId: string;
  tenantId: string;
  setores: Setor[];
  apenasConsolidado: boolean;
}

export function AnaliseDimensoes({ avaliacaoId, tenantId, setores, apenasConsolidado }: Props) {
  const [scope, setScope] = useState<string | null>(null);

  const scopes: Setor[] = apenasConsolidado
    ? [{ id: CONSOLIDADO, nome: "Consolidado (organização)" }]
    : [{ id: CONSOLIDADO, nome: "Consolidado (organização)" }, ...setores];

  const scopeNome =
    scope === null
      ? "Consolidado (organização)"
      : setores.find((s) => s.id === scope)?.nome ?? "Setor";

  const {
    carregando,
    bloqueado,
    resultados,
    totalResp,
    niveisPresentes,
    get,
    patch,
    gerarIA,
    salvar,
  } = useAnaliseDimensao({ avaliacaoId, tenantId, scope });

  return (
    <div className="space-y-4">
      {scopes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {scopes.map((s) => {
            const sScope = s.id === CONSOLIDADO ? null : s.id;
            const ativo = sScope === scope;
            return (
              <Button
                key={s.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setScope(sScope)}
                className={ativo ? "bg-[#234A6E] hover:bg-[#1a3a58] text-white" : ""}
              >
                {s.nome}
              </Button>
            );
          })}
        </div>
      )}

      {carregando ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin" />
        </div>
      ) : bloqueado ? (
        <Alert>
          <AlertDescription>
            Este setor ainda não tem respondentes.
          </AlertDescription>
        </Alert>
      ) : resultados.length === 0 ? (
        <Alert>
          <AlertDescription>Sem resultados para este escopo.</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {scopeNome} · {totalResp} respondente(s)
          </div>
          {niveisPresentes.map((d: string) => {
            const st = get(d);
            return (
              <AnaliseDimensaoCard
                key={d}
                titulo={NIVEL_LABELS[d] ?? d}
                texto={st.texto}
                geradoPorIa={st.gerado_por_ia}
                carregandoIA={st.carregandoIA}
                salvando={st.salvando}
                onTextoChange={(v) => patch(d, { texto: v, gerado_por_ia: false })}
                onGerar={() => gerarIA(d, scopeNome)}
                onAprovar={() => salvar(d, true)}
                onSalvar={() => salvar(d)}
              />
            );
          })}
          {(() => {
            const st = get("sintese");
            return (
              <AnaliseDimensaoCard
                titulo="Síntese integrada"
                texto={st.texto}
                geradoPorIa={st.gerado_por_ia}
                carregandoIA={st.carregandoIA}
                salvando={st.salvando}
                onTextoChange={(v) => patch("sintese", { texto: v, gerado_por_ia: false })}
                onGerar={() => gerarIA("sintese", scopeNome)}
                onAprovar={() => salvar("sintese", true)}
                onSalvar={() => salvar("sintese")}
              />
            );
          })()}
        </div>
      )}
    </div>
  );
}