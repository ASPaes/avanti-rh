import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

interface AvaliacaoMin {
  id: string;
  empresa_cliente_id: string;
  modelo_instrumento_id: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  avaliacao: AvaliacaoMin;
  onSuccess?: () => void;
}

type Step = "upload" | "validar" | "resultado";

interface ParsedSheet {
  header: string[];
  rows: (string | number | null)[][];
  hasSetor: boolean;
  /** colIndex -> numero da questao (1..N) */
  colToQuestaoNumero: Record<number, number>;
  colSexo: number;
  colFaixa: number;
  colTreinamento: number | null;
  colSetor: number | null;
}

interface QuestaoRow {
  id: string;
  numero: number;
}
interface SetorRow {
  id: string;
  nome: string;
}

interface RespondentePayload {
  sexo: "masculino" | "feminino";
  faixa_etaria: "ate_38" | "acima_38" | "outro";
  treinamento_rp: "sim_compreendi" | "nao_recebi" | "mais_ou_menos";
  setor_id: string;
  respostas: Array<{ questao_id: string; valor: number }>;
}

interface LinhaInvalida {
  linha: number;
  motivo: string;
}

interface ImportResult {
  success: boolean;
  total_importados: number;
  total_erros: number;
  erros: Array<{ linha: number; erro: string }>;
  avisos: Array<{ tipo: string; mensagem: string }>;
}

// ===== Helpers de parse =====

function extrairNumeroQuestao(titulo: string): number | null {
  if (!titulo) return null;
  const t = String(titulo).trim();
  // Início "12." ou "12 ."
  const ini = t.match(/^(\d{1,3})\s*\./);
  if (ini) return parseInt(ini[1], 10);
  // Embutido " 51." em meio de texto
  const meio = t.match(/(?:^|\s)(\d{1,3})\s*\./);
  if (meio) return parseInt(meio[1], 10);
  return null;
}

function normalizarSexo(
  v: unknown,
): "masculino" | "feminino" | null {
  if (v == null) return null;
  const s = String(v).toLowerCase();
  if (s.includes("masculino")) return "masculino";
  if (s.includes("feminino")) return "feminino";
  if (s.trim() === "1") return "masculino";
  if (s.trim() === "2") return "feminino";
  return null;
}

function normalizarFaixa(
  v: unknown,
): "ate_38" | "acima_38" | "outro" | null {
  if (v == null) return null;
  const s = String(v).toLowerCase().trim();
  if (s.includes("abaixo de 38") || s.includes("até 38") || s.includes("ate 38"))
    return "ate_38";
  if (s.includes("acima de 38")) return "acima_38";
  if (s.includes("outro")) return "outro";
  // Google Forms exporta posição da opção como número
  if (s === "1") return "ate_38";
  if (s === "2") return "acima_38";
  return null;
}

function normalizarTreinamento(
  v: unknown,
): "sim_compreendi" | "nao_recebi" | "mais_ou_menos" | null {
  if (v == null) return null;
  const s = String(v).toLowerCase();
  if (s.includes("mais ou menos")) return "mais_ou_menos";
  if (s.includes("sim") && s.includes("compreendi")) return "sim_compreendi";
  if (s.includes("não") || s.includes("nao")) return "nao_recebi";
  return null;
}

function parseValorLikert(v: unknown): number | null {
  if (v == null || v === "") return null;
  // Pode vir "1" ou "1 - Nunca/quase nunca" etc.
  const s = String(v).trim();
  const m = s.match(/^(\d)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (n >= 1 && n <= 5) return n;
  return null;
}

async function parseWorkbook(buffer: ArrayBuffer): Promise<ParsedSheet> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "array" });
  const wsName = wb.SheetNames[0];
  const ws = wb.Sheets[wsName];
  const raw = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, {
    header: 1,
    blankrows: false,
    defval: null,
  });
  if (raw.length < 2) {
    throw new Error("Planilha vazia ou sem dados.");
  }
  const header = raw[0].map((c) => (c == null ? "" : String(c)));
  const rows = raw.slice(1) as (string | number | null)[][];

  // Detecta layout — coluna 1 (índice 1, após timestamp em col 0) costuma ser setor ou sexo
  // Procura pelas colunas-chave por título
  const idxBy = (predicate: (t: string) => boolean) =>
    header.findIndex((t) => predicate(String(t).toLowerCase()));

  const colSetor = idxBy((t) => t.includes("setor"));
  const colSexo = idxBy((t) => t.includes("sexo"));
  const colFaixa = idxBy(
    (t) => t.includes("faixa") || t.includes("idade") || t.includes("38"),
  );
  const colTreinamento = idxBy(
    (t) =>
      t.includes("treinamento") ||
      t.includes("rp") ||
      t.includes("riscos psicossociais"),
  );

  if (colSexo < 0) throw new Error("Coluna de sexo não encontrada no header.");
  if (colFaixa < 0)
    throw new Error("Coluna de faixa etária não encontrada no header.");
  // colTreinamento pode ser -1 (ausente em pesquisas históricas) — tratado no payload

  const colToQuestaoNumero: Record<number, number> = {};
  for (let i = 0; i < header.length; i++) {
    if (i === colSetor || i === colSexo || i === colFaixa || i === colTreinamento)
      continue;
    const num = extrairNumeroQuestao(header[i]);
    if (num != null) colToQuestaoNumero[i] = num;
  }

  return {
    header,
    rows,
    hasSetor: colSetor >= 0,
    colToQuestaoNumero,
    colSexo,
    colFaixa,
    colTreinamento: colTreinamento >= 0 ? colTreinamento : null,
    colSetor: colSetor >= 0 ? colSetor : null,
  };
}

// ===== Componente =====

export function ImportarRespostasDialog({
  open,
  onOpenChange,
  avaliacao,
  onSuccess,
}: Props) {
  const { tenantId } = useTenant();
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedSheet | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [questoes, setQuestoes] = useState<QuestaoRow[]>([]);
  const [setores, setSetores] = useState<SetorRow[]>([]);
  const [setorMap, setSetorMap] = useState<Record<string, string>>({});
  const [setoresPlanilha, setSetoresPlanilha] = useState<string[]>([]);
  const [setorGeralId, setSetorGeralId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errosVisible, setErrosVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setStep("upload");
      setFileName(null);
      setParsed(null);
      setParseError(null);
      setQuestoes([]);
      setSetores([]);
      setSetorMap({});
      setSetoresPlanilha([]);
      setSetorGeralId(null);
      setImporting(false);
      setResult(null);
      setErrosVisible(false);
    }
  }, [open]);

  // Carrega metadados quando entra no step 2
  useEffect(() => {
    if (step !== "validar" || !parsed) return;
    let cancelled = false;
    setLoadingMeta(true);
    (async () => {
      try {
        const [qRes, sRes] = await Promise.all([
          supabase
            .from("nr1_modelo_questao")
            .select("id, numero")
            .eq("modelo_id", avaliacao.modelo_instrumento_id)
            .eq("tipo", "likert"),
          supabase
            .from("setores")
            .select("id, nome")
            .eq("empresa_cliente_id", avaliacao.empresa_cliente_id)
            .eq("ativo", true),
        ]);
        if (qRes.error) throw qRes.error;
        if (sRes.error) throw sRes.error;
        if (cancelled) return;

        const qs = (qRes.data ?? []).filter(
          (q): q is QuestaoRow => q.numero != null,
        ) as QuestaoRow[];
        const ss = (sRes.data ?? []) as SetorRow[];
        setQuestoes(qs);
        setSetores(ss);

        if (parsed.hasSetor && parsed.colSetor != null) {
          const valores = new Set<string>();
          for (const row of parsed.rows) {
            const v = row[parsed.colSetor];
            if (v != null && String(v).trim() !== "") valores.add(String(v).trim());
          }
          const lista = Array.from(valores);
          setSetoresPlanilha(lista);
          // auto match
          const map: Record<string, string> = {};
          for (const sp of lista) {
            const found = ss.find(
              (s) => s.nome.trim().toLowerCase() === sp.toLowerCase(),
            );
            if (found) map[sp] = found.id;
          }
          setSetorMap(map);
        } else {
          // Garantir setor "Geral"
          let geral = ss.find(
            (s) => s.nome.trim().toLowerCase() === "geral",
          );
          if (!geral) {
            const ins = await supabase
              .from("setores")
              .insert({
                tenant_id: tenantId!,
                empresa_cliente_id: avaliacao.empresa_cliente_id,
                nome: "Geral",
                descricao:
                  "Setor padrão para importações sem setor definido",
              })
              .select("id, nome")
              .single();
            if (ins.error) throw ins.error;
            geral = ins.data as SetorRow;
            if (!cancelled) setSetores([...ss, geral]);
          }
          if (!cancelled) setSetorGeralId(geral.id);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao carregar metadados";
        toast.error(msg);
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    step,
    parsed,
    avaliacao.modelo_instrumento_id,
    avaliacao.empresa_cliente_id,
    tenantId,
  ]);

  // ===== Step 1: upload =====

  function handleFile(file: File) {
    setParseError(null);
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("Envie um arquivo .xlsx");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo acima de 5MB");
      return;
    }
    setFileName(file.name);
    file
      .arrayBuffer()
      .then(async (buf) => {
        try {
          const p = await parseWorkbook(buf);
          setParsed(p);
          setStep("validar");
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro ao ler planilha";
          setParseError(msg);
          toast.error(msg);
        }
      })
      .catch(() => {
        setParseError("Erro ao ler o arquivo");
      });
  }

  // ===== Step 2: validação =====

  const totalQuestoesEsperadas = questoes.length;
  const questoesMapeadas = useMemo(() => {
    if (!parsed) return 0;
    const numerosNaPlanilha = new Set(Object.values(parsed.colToQuestaoNumero));
    let c = 0;
    for (const q of questoes) if (numerosNaPlanilha.has(q.numero)) c++;
    return c;
  }, [parsed, questoes]);

  const todosSetoresMapeados = useMemo(() => {
    if (!parsed) return false;
    if (!parsed.hasSetor) return setorGeralId != null;
    return setoresPlanilha.every((sp) => !!setorMap[sp]);
  }, [parsed, setoresPlanilha, setorMap, setorGeralId]);

  const { payload, invalidas } = useMemo<{
    payload: RespondentePayload[];
    invalidas: LinhaInvalida[];
  }>(() => {
    const out: RespondentePayload[] = [];
    const inv: LinhaInvalida[] = [];
    if (!parsed || questoes.length === 0 || !todosSetoresMapeados)
      return { payload: out, invalidas: inv };

    const numeroParaId = new Map<number, string>();
    for (const q of questoes) numeroParaId.set(q.numero, q.id);

    parsed.rows.forEach((row, idx) => {
      const linha = idx + 2; // header é linha 1
      const sexo = normalizarSexo(row[parsed.colSexo]);
      const faixa = normalizarFaixa(row[parsed.colFaixa]);
      const trein =
        parsed.colTreinamento != null
          ? normalizarTreinamento(row[parsed.colTreinamento]) ?? "nao_recebi"
          : "nao_recebi";
      if (!sexo) {
        inv.push({ linha, motivo: "Sexo inválido ou ausente" });
        return;
      }
      if (!faixa) {
        inv.push({ linha, motivo: "Faixa etária inválida ou ausente" });
        return;
      }

      let setorId: string | null = null;
      if (parsed.hasSetor && parsed.colSetor != null) {
        const valor = row[parsed.colSetor];
        const key = valor == null ? "" : String(valor).trim();
        setorId = setorMap[key] ?? null;
      } else {
        setorId = setorGeralId;
      }
      if (!setorId) {
        inv.push({ linha, motivo: "Setor não mapeado" });
        return;
      }

      const respostas: Array<{ questao_id: string; valor: number }> = [];
      let erroResposta: string | null = null;
      for (const [colStr, numero] of Object.entries(parsed.colToQuestaoNumero)) {
        const col = Number(colStr);
        const qid = numeroParaId.get(numero);
        if (!qid) continue;
        const v = parseValorLikert(row[col]);
        if (v == null) {
          erroResposta = `Questão ${numero} com valor inválido`;
          break;
        }
        respostas.push({ questao_id: qid, valor: v });
      }
      if (erroResposta) {
        inv.push({ linha, motivo: erroResposta });
        return;
      }
      if (respostas.length !== totalQuestoesEsperadas) {
        inv.push({
          linha,
          motivo: `Respostas incompletas (${respostas.length}/${totalQuestoesEsperadas})`,
        });
        return;
      }

      out.push({
        sexo,
        faixa_etaria: faixa,
        treinamento_rp: trein,
        setor_id: setorId,
        respostas,
      });
    });

    return { payload: out, invalidas: inv };
  }, [
    parsed,
    questoes,
    setorMap,
    setorGeralId,
    todosSetoresMapeados,
    totalQuestoesEsperadas,
  ]);

  // ===== Step 3: importar =====

  async function handleImportar() {
    if (payload.length === 0) return;
    setImporting(true);
    setStep("resultado");
    try {
      const { data, error } = await supabase.rpc("nr1_importar_respostas", {
        p_avaliacao_id: avaliacao.id,
        p_respondentes: payload as unknown as never,
      });
      if (error) throw error;
      const res = data as unknown as ImportResult;
      setResult(res);
      if (res?.success) {
        toast.success(`${res.total_importados} respondentes importados`);
        onSuccess?.();
      } else {
        toast.error("Importação concluída com erros");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao importar";
      toast.error(msg);
      setResult({
        success: false,
        total_importados: 0,
        total_erros: 0,
        erros: [],
        avisos: [{ tipo: "erro", mensagem: msg }],
      });
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar respostas</DialogTitle>
          <DialogDescription>
            Importe respostas a partir de uma planilha .xlsx exportada do Google
            Forms.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-md py-12 px-6 flex flex-col items-center gap-3 hover:bg-accent transition-colors"
            >
              <Upload className="text-muted-foreground" size={32} />
              <p className="text-sm font-medium">
                Clique para selecionar um arquivo .xlsx
              </p>
              <p className="text-[12px] text-muted-foreground">
                Tamanho máximo: 5MB
              </p>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            {fileName && (
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <FileSpreadsheet size={14} />
                <span>{fileName}</span>
              </div>
            )}
            {parseError && (
              <Alert variant="destructive">
                <AlertDescription>{parseError}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === "validar" && parsed && (
          <div className="space-y-4">
            {loadingMeta ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <Loader2 className="animate-spin mr-2" size={16} />
                Carregando metadados...
              </div>
            ) : (
              <>
                {/* Mapeamento de questões */}
                <div className="bg-surface border border-border rounded-md p-4 flex items-center gap-3">
                  {questoesMapeadas === totalQuestoesEsperadas ? (
                    <CheckCircle2 className="text-success" size={18} />
                  ) : (
                    <AlertTriangle className="text-warning" size={18} />
                  )}
                  <div className="text-[13px]">
                    <span className="font-medium">
                      {questoesMapeadas}/{totalQuestoesEsperadas}
                    </span>{" "}
                    questões mapeadas
                    {questoesMapeadas < totalQuestoesEsperadas && (
                      <span className="text-muted-foreground">
                        {" "}
                        — faltam {totalQuestoesEsperadas - questoesMapeadas}
                      </span>
                    )}
                  </div>
                </div>

                {/* Mapeamento de setores */}
                {parsed.hasSetor ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-mono uppercase tracking-[0.10em] text-muted-foreground">
                      Mapeamento de setores
                    </p>
                    <div className="bg-surface border border-border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Setor na planilha</TableHead>
                            <TableHead>Setor no sistema</TableHead>
                            <TableHead className="w-12">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {setoresPlanilha.map((sp) => (
                            <TableRow key={sp}>
                              <TableCell className="text-[13px]">{sp}</TableCell>
                              <TableCell>
                                <Select
                                  value={setorMap[sp] ?? ""}
                                  onValueChange={(v) =>
                                    setSetorMap((m) => ({ ...m, [sp]: v }))
                                  }
                                >
                                  <SelectTrigger className="h-8 text-[13px]">
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {setores.map((s) => (
                                      <SelectItem key={s.id} value={s.id}>
                                        {s.nome}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                {setorMap[sp] ? (
                                  <CheckCircle2
                                    className="text-success"
                                    size={16}
                                  />
                                ) : (
                                  <AlertTriangle
                                    className="text-warning"
                                    size={16}
                                  />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription className="text-[12px]">
                      Planilha sem coluna de setor — todos os respondentes serão
                      atribuídos ao setor "Geral".
                    </AlertDescription>
                  </Alert>
                )}

                {/* Resumo de validação */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface border border-border rounded-md p-4 space-y-1">
                    <p className="text-[11px] font-mono uppercase tracking-[0.10em] text-muted-foreground">
                      Válidos
                    </p>
                    <p className="text-2xl font-semibold font-mono text-success">
                      {payload.length}
                    </p>
                  </div>
                  <div className="bg-surface border border-border rounded-md p-4 space-y-1">
                    <p className="text-[11px] font-mono uppercase tracking-[0.10em] text-muted-foreground">
                      Com erros
                    </p>
                    <p className="text-2xl font-semibold font-mono text-warning">
                      {invalidas.length}
                    </p>
                  </div>
                </div>

                {invalidas.length > 0 && (
                  <Collapsible
                    open={errosVisible}
                    onOpenChange={setErrosVisible}
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" size="sm">
                        {errosVisible ? "Ocultar" : "Ver"} linhas com erro
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="bg-surface border border-border rounded-md p-3 max-h-48 overflow-y-auto space-y-1">
                        {invalidas.map((e) => (
                          <div
                            key={`${e.linha}-${e.motivo}`}
                            className="text-[12px] font-mono text-muted-foreground"
                          >
                            Linha {e.linha}: {e.motivo}
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {payload.length > 0 && payload.length < 5 && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-[12px]">
                      Atenção: com menos de 5 respondentes a análise será
                      bloqueada (LGPD).
                    </AlertDescription>
                  </Alert>
                )}
                {payload.length >= 5 && payload.length < 25 && (
                  <Alert>
                    <AlertDescription className="text-[12px]">
                      Amostra abaixo do recomendado pelo COPSOQ (N≥25).
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep("upload");
                      setParsed(null);
                    }}
                  >
                    Voltar
                  </Button>
                  <Button
                    onClick={handleImportar}
                    disabled={
                      payload.length === 0 ||
                      !todosSetoresMapeados ||
                      questoesMapeadas !== totalQuestoesEsperadas
                    }
                  >
                    Importar {payload.length} respondentes
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {step === "resultado" && (
          <div className="space-y-4">
            {importing ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="animate-spin text-muted-foreground" size={32} />
                <p className="text-sm text-muted-foreground">
                  Importando respostas...
                </p>
              </div>
            ) : result ? (
              <>
                {result.success ? (
                  <Alert>
                    <AlertDescription className="flex items-center gap-2 text-[13px]">
                      <CheckCircle2 className="text-success shrink-0" size={16} />
                      {result.total_importados} respondentes importados com
                      sucesso.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertDescription className="flex items-center gap-2 text-[13px]">
                      <XCircle className="shrink-0" size={16} />
                      Falha na importação.
                    </AlertDescription>
                  </Alert>
                )}

                {result.avisos?.length > 0 &&
                  result.avisos.map((a, i) => (
                    <Alert key={i}>
                      <AlertDescription className="text-[12px] flex items-start gap-2">
                        <AlertTriangle
                          className="text-warning shrink-0 mt-0.5"
                          size={14}
                        />
                        {a.mensagem}
                      </AlertDescription>
                    </Alert>
                  ))}

                {result.total_erros > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-mono uppercase tracking-[0.10em] text-muted-foreground">
                      Erros ({result.total_erros})
                    </p>
                    <div className="bg-surface border border-border rounded-md p-3 max-h-48 overflow-y-auto space-y-1">
                      {result.erros.map((e, i) => (
                        <div
                          key={i}
                          className="text-[12px] font-mono text-muted-foreground"
                        >
                          Linha {e.linha}: {e.erro}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button onClick={() => onOpenChange(false)}>Fechar</Button>
                </div>
              </>
            ) : null}
          </div>
        )}

        {step === "validar" && (
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Badge variant="outline" className="font-mono text-[10px]">
              {parsed?.rows.length ?? 0} linhas
            </Badge>
            {parsed?.hasSetor && (
              <Badge variant="outline" className="font-mono text-[10px]">
                com setor
              </Badge>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}