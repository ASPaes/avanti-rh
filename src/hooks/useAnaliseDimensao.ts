import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DIMENSAO_LABELS } from "@/lib/copsoq-calculo";

const DIMENSAO_ORDEM = [
  "demandas", "organizacao", "relacoes", "valores",
  "personalidade", "interface", "saude", "comportamentos",
];

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
        p_setor_id: scope,
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
      const { data: ans, error: errAns } = await (scope === null
        ? base.is("setor_id", null)
        : base.eq("setor_id", scope));
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

  const dimensoesPresentes = DIMENSAO_ORDEM.filter((d) =>
    resultados.some((r) => r.dimensao_macro === d),
  );

  const get = (chave: string): AnaliseState => analises[chave] ?? nova();
  const patch = (chave: string, p: Partial<AnaliseState>) =>
    setAnalises((prev) => ({ ...prev, [chave]: { ...(prev[chave] ?? nova()), ...p } }));

  function fatoresDe(dimensao: string | null): string {
    const subs = dimensao
      ? resultados.filter((r) => r.dimensao_macro === dimensao)
      : resultados;
    return subs.map((r) => `${r.nome}: ${r.classificacao_pgr}`).join("\n");
  }

  async function gerarIA(chave: string, scopeNome: string) {
    patch(chave, { carregandoIA: true });
    try {
      const ehSintese = chave === "sintese";
      const contexto: Record<string, unknown> = {
        setor: scopeNome,
        n_respondentes: totalResp,
        fatores: fatoresDe(ehSintese ? null : chave),
      };
      if (!ehSintese) contexto.dimensao = DIMENSAO_LABELS[chave] ?? chave;
      const { data, error } = await supabase.functions.invoke("ia-executar", {
        body: {
          caso_uso: ehSintese ? "nr1_sintese" : "nr1_analise_dimensao",
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
    dimensoesPresentes,
    get,
    patch,
    gerarIA,
    salvar,
  };
}