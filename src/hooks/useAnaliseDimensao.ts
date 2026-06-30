import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DIMENSAO_LABELS } from "@/lib/copsoq-calculo";

const NIVEL_ORDEM: string[] = [
  "trivial", "toleravel", "moderado", "substancial", "intoleravel",
];

export const NIVEL_LABELS: Record<string, string> = {
  trivial: "Trivial",
  toleravel: "Tolerável",
  moderado: "Moderado",
  substancial: "Substancial",
  intoleravel: "Intolerável",
};

interface ResultadoSub {
  subescala_id: string;
  nome: string;
  classificacao_pgr: string;
  dimensao_macro: string;
}

export interface AnaliseState {
  id: string | null;
  texto: string;
  gerado_por_ia: boolean;
  carregandoIA: boolean;
  salvando: boolean;
}

function nova(): AnaliseState {
  return { id: null, texto: "", gerado_por_ia: false, carregandoIA: false, salvando: false };
}

function dimLabel(d: string): string {
  return DIMENSAO_LABELS[d] ?? d;
}

function nivelLabel(n: string): string {
  return NIVEL_LABELS[(n ?? "").toLowerCase()] ?? n;
}

export function useAnaliseDimensao(params: {
  avaliacaoId: string;
  tenantId: string;
  scope: string | null;
}) {
  const { avaliacaoId, tenantId, scope } = params;
  const [carregando, setCarregando] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const [resultados, setResultados] = useState<ResultadoSub[]>([]);
  const [totalResp, setTotalResp] = useState(0);
  const [analises, setAnalises] = useState<Record<string, AnaliseState>>({});

  const carregar = useCallback(async () => {
    setCarregando(true);
    setBloqueado(false);
    try {
      const { data: res, error } = await supabase.rpc("nr1_resultado_avaliacao", {
        p_avaliacao_id: avaliacaoId,
        p_setor_id: scope ?? undefined,
      });
      if (error) throw error;
      const r = res as {
        bloqueado?: boolean;
        total_respondentes?: number;
        resultados?: ResultadoSub[];
      } | null;
      if (r?.bloqueado) {
        setBloqueado(true);
        setResultados([]);
        setAnalises({});
        return;
      }
      setResultados(r?.resultados ?? []);
      setTotalResp(r?.total_respondentes ?? 0);

      const base = supabase
        .from("nr1_analise_setor")
        .select("id, dimensao, texto, gerado_por_ia")
        .eq("avaliacao_id", avaliacaoId);
      const query = scope === null ? base.is("setor_id", null) : base.eq("setor_id", scope);
      const { data: ans, error: errAns } = await query;
      if (errAns) throw errAns;

      const map: Record<string, AnaliseState> = {};
      for (const a of (ans ?? []) as {
        id: string;
        dimensao: string;
        texto: string | null;
        gerado_por_ia: boolean;
      }[]) {
        map[a.dimensao] = {
          id: a.id,
          texto: a.texto ?? "",
          gerado_por_ia: a.gerado_por_ia,
          carregandoIA: false,
          salvando: false,
        };
      }
      setAnalises(map);
    } catch (e) {
      toast.error("Erro ao carregar análise.", {
        description: e instanceof Error ? e.message : "Tente novamente.",
      });
    } finally {
      setCarregando(false);
    }
  }, [avaliacaoId, scope]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const niveisPresentes = NIVEL_ORDEM.filter((n) =>
    resultados.some((r) => (r.classificacao_pgr ?? "").toLowerCase() === n),
  );

  const get = (chave: string): AnaliseState => analises[chave] ?? nova();
  const patch = (chave: string, p: Partial<AnaliseState>) =>
    setAnalises((prev) => ({ ...prev, [chave]: { ...(prev[chave] ?? nova()), ...p } }));

  function fatoresDe(nivel: string | null): string {
    if (nivel === null) {
      return resultados
        .map((r) => `${r.nome} (${dimLabel(r.dimensao_macro)}): ${nivelLabel(r.classificacao_pgr)}`)
        .join("\n");
    }
    return resultados
      .filter((r) => (r.classificacao_pgr ?? "").toLowerCase() === nivel)
      .map((r) => `${r.nome} (${dimLabel(r.dimensao_macro)})`)
      .join("\n");
  }

  async function gerarIA(chave: string, scopeNome: string) {
    patch(chave, { carregandoIA: true });
    try {
      const ehSintese = chave === "sintese";
      const contexto: Record<string, unknown> = ehSintese
        ? { setor: scopeNome, fatores: fatoresDe(null) }
        : { setor: scopeNome, nivel: nivelLabel(chave), fatores: fatoresDe(chave) };
      const { data, error } = await supabase.functions.invoke("ia-executar", {
        body: {
          caso_uso: ehSintese ? "nr1_sintese" : "nr1_analise_nivel",
          tenant_id: tenantId,
          contexto,
        },
      });
      if (error) {
        toast.error("Erro na IA.", { description: error.message });
        return;
      }
      const payload = data as { texto?: string; error?: string } | null;
      if (payload?.error) {
        toast.error("Erro na IA.", { description: payload.error });
        return;
      }
      if (!payload?.texto) {
        toast.error("Resposta vazia da IA.");
        return;
      }
      patch(chave, { texto: payload.texto, gerado_por_ia: true });
      toast.success("Gerado — revise antes de salvar.");
    } catch (e) {
      toast.error("Erro na IA.", {
        description: e instanceof Error ? e.message : "Tente novamente.",
      });
    } finally {
      patch(chave, { carregandoIA: false });
    }
  }

  async function salvar(chave: string, aprovar = false) {
    const atual = get(chave);
    patch(chave, { salvando: true });
    try {
      const gerado = aprovar ? false : atual.gerado_por_ia;
      if (atual.id) {
        const { error } = await supabase
          .from("nr1_analise_setor")
          .update({ texto: atual.texto, gerado_por_ia: gerado })
          .eq("id", atual.id);
        if (error) throw error;
        patch(chave, { gerado_por_ia: gerado });
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { data: ins, error } = await supabase
          .from("nr1_analise_setor")
          .insert({
            tenant_id: tenantId,
            avaliacao_id: avaliacaoId,
            setor_id: scope,
            dimensao: chave,
            texto: atual.texto,
            gerado_por_ia: gerado,
            created_by: u.user?.id ?? null,
          })
          .select("id")
          .maybeSingle();
        if (error) throw error;
        patch(chave, { id: ins?.id ?? null, gerado_por_ia: gerado });
      }
      toast.success(aprovar ? "Aprovado." : "Salvo.");
    } catch (e) {
      toast.error("Erro ao salvar.", {
        description: e instanceof Error ? e.message : "Tente novamente.",
      });
    } finally {
      patch(chave, { salvando: false });
    }
  }

  return {
    carregando,
    bloqueado,
    resultados,
    totalResp,
    niveisPresentes,
    get,
    patch,
    gerarIA,
    salvar,
  };
}