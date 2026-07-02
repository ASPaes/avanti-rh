import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Printer, FileDown } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

import { PGR_LABELS } from "@/lib/copsoq-calculo";
import { exportarRelatorioDocx } from "@/lib/relatorio-docx";

export const Route = createFileRoute("/_auth/nr1_/$id/relatorio_/$relatorioId")({
  component: RelatorioVisualizarPage,
});

const NAVY = "#234A6E";
const CORAL = "#ED7D6E";
const COR_RISCO = "#DC2626";
const COR_ATENCAO = "#FACC15";
const COR_FAVORAVEL = "#16A34A";

// ============== CAPTURA DE IMAGENS PARA EXPORTAÇÃO ==============

function dataUrlParaBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function svgParaPng(container: Element): Promise<Uint8Array | null> {
  const svg = container.querySelector("svg");
  if (!svg) return null;
  const rect = svg.getBoundingClientRect();
  const widthAttr = parseInt(svg.getAttribute("width") || "", 10);
  const heightAttr = parseInt(svg.getAttribute("height") || "", 10);
  const w = Math.round(widthAttr || rect.width || 800);
  const h = Math.round(heightAttr || rect.height || 400);
  if (w === 0 || h === 0) return null;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(h));
  const xml = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Falha ao carregar SVG"));
      i.src = url;
    });
    const escala = 2;
    const canvas = document.createElement("canvas");
    canvas.width = w * escala;
    canvas.height = h * escala;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return dataUrlParaBytes(canvas.toDataURL("image/png"));
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function carregarLogoComoBytes(url?: string): Promise<Uint8Array | undefined> {
  if (!url) return undefined;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return undefined;
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return undefined;
  }
}

// ============== TIPOS ==============

type BoilerplateItem = {
  chave: string;
  titulo?: string;
  corpo: string;
  ordem?: number;
};

type Cargo = {
  nome_funcao?: string;
  cbo_codigo?: string;
  qtd_colaboradores?: number | null;
  carga_horaria?: string | null;
  atividades?: string | null;
};

type SubescalaResultado = {
  subescala_id: string;
  codigo: string;
  nome: string;
  tipo: "positivo" | "negativo";
  severidade: "critica" | "moderada" | "leve";
  dimensao_macro: string;
  media_geral: number;
  total_respondentes: number;
  pct_risco: number;
  pct_atencao: number;
  pct_favoravel: number;
  probabilidade: "alta" | "media" | "baixa";
  classificacao_pgr: string;
};

type AnaliseItem = {
  dimensao: string;
  texto: string | null;
  gerado_por_ia: boolean;
};

type SetorBlock = {
  setor_id: string;
  nome: string;
  descricao?: string | null;
  qtd_colaboradores_estimado?: number | null;
  cargos?: Cargo[];
  bloqueado?: boolean;
  total_respondentes?: number;
  resultado?: SubescalaResultado[];
  analises?: AnaliseItem[];
};

type CatalogoItem = {
  nome?: string;
  codigo?: string;
  severidade?: string;
  significado?: string;
  agravos?: string;
  acoes_pgr?: string;
  catalogo_status?: string;
  perguntas?: { numero: number; texto: string }[];
};

type Empresa = {
  razao_social?: string;
  nome_fantasia?: string;
  cnpj?: string;
  cnae?: string;
  grau_risco?: number | string;
  endereco_logradouro?: string;
  endereco_numero?: string;
  endereco_complemento?: string;
  endereco_bairro?: string;
  endereco_cidade?: string;
  endereco_uf?: string;
  endereco_cep?: string;
  segmento?: string;
  area_atuacao?: string;
  contato_responsavel?: string;
  qtd_colaboradores_estimado?: number | null;
};

type AcaoPlano = {
  subescala_id: string;
  nivel_risco_origem?: string;
  setor_id?: string | null;
  setor_nome?: string | null;
  o_que?: string;
  por_que?: string;
  onde?: string;
  quando?: string;
  quem?: string;
  como?: string;
  quanto?: string;
  status?: string;
  prazo?: string | null;
  responsavel?: string;
  gerado_por_ia?: boolean;
};

type RespTec = {
  nome?: string;
  tipo_conselho?: string;
  uf_conselho?: string;
  numero_registro?: string;
  papel?: string;
};

type Conteudo = {
  instrumento?: string;
  gerado_em?: string;
  logo_url?: string;
  boilerplate?: BoilerplateItem[];
  empresa?: Empresa;
  setores?: SetorBlock[];
  analises_consolidado?: AnaliseItem[];
  adesao?: { total_respondentes?: number; [k: string]: unknown };
  resultado_global?: SubescalaResultado[];
  catalogo?: Record<string, CatalogoItem>;
  indicadores?: Record<string, unknown> | null;
  plano_acao?: AcaoPlano[];
  responsaveis_tecnicos?: RespTec[];
  data_realizacao?: string;
};

type Relatorio = {
  id: string;
  versao: number;
  versao_documento: string | null;
  status: string;
  gerado_em: string;
  conteudo: Conteudo;
};


// ============== HELPERS ==============

function fmtData(s?: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

function fmtDataCurta(s?: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return s;
  }
}

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const PRIORIDADE_POR_NIVEL: Record<string, string> = {
  intoleravel: "A - Alta",
  substancial: "M - Média",
};

const PRAZO_POR_NIVEL: Record<string, string> = {
  intoleravel: "Imediato a 90 dias",
  substancial: "Imediato a 120 dias",
};

function instrumentoLabel(s?: string): string {
  if (!s) return "COPSOQ-II";
  return (s.split(/\s+(?:Versão|—)/i)[0] ?? "").trim() || "COPSOQ-II";
}

function PgrBadge({ classificacao }: { classificacao?: string }) {
  if (!classificacao) return <span className="text-muted-foreground">—</span>;
  const cfg = PGR_LABELS[classificacao];
  if (!cfg) return <span>{classificacao}</span>;
  return (
    <span
      className={`${cfg.cor} inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium`}
    >
      {cfg.label}
    </span>
  );
}

function Paragraphs({ text }: { text?: string }) {
  if (!text) return null;
  const parts = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className="space-y-2 text-[13px] leading-relaxed">
      {parts.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

function SectionTitle({
  n,
  children,
}: {
  n: number;
  children: React.ReactNode;
}) {
  return (
    <h2
      className="text-[18px] font-semibold tracking-tight border-b pb-2 uppercase"
      style={{ color: NAVY, borderColor: "#E3E8EE" }}
    >
      <span style={{ color: CORAL }}>{n}.</span> {children}
    </h2>
  );
}

function NotaRevisao({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="border-l-4 px-4 py-3 text-[13px] leading-relaxed rounded-r print:bg-transparent"
      style={{ borderColor: CORAL, backgroundColor: "#FFF6F4" }}
    >
      <div
        className="text-[10px] font-mono uppercase tracking-wider mb-1"
        style={{ color: CORAL }}
      >
        texto interpretativo — a ser revisado pelo responsável técnico
      </div>
      <div style={{ color: NAVY }}>{children}</div>
    </div>
  );
}

function nomesPorClasse(resultado: SubescalaResultado[] | undefined, classes: string[]): string[] {
  return (resultado ?? [])
    .filter((r) => classes.includes((r.classificacao_pgr ?? "").toLowerCase()))
    .map((r) => r.nome);
}


// Matriz PGR 3x3
const MATRIZ: { prob: "alta" | "media" | "baixa"; sev: string[] }[] = [
  { prob: "alta", sev: ["moderado", "substancial", "intoleravel"] },
  { prob: "media", sev: ["toleravel", "moderado", "substancial"] },
  { prob: "baixa", sev: ["trivial", "toleravel", "moderado"] },
];
const PROB_LABEL: Record<string, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

function MatrizPgr() {
  return (
    <table className="w-full text-[12px] border-collapse">
      <thead>
        <tr>
          <th className="p-2 text-left" style={{ color: NAVY }}>
            Probabilidade ↓ / Severidade →
          </th>
          <th className="p-2 text-center" style={{ color: NAVY }}>
            Leve
          </th>
          <th className="p-2 text-center" style={{ color: NAVY }}>
            Moderada
          </th>
          <th className="p-2 text-center" style={{ color: NAVY }}>
            Crítica
          </th>
        </tr>
      </thead>
      <tbody>
        {MATRIZ.map((row) => (
          <tr key={row.prob}>
            <td
              className="p-2 font-medium border"
              style={{ borderColor: "#E3E8EE", color: NAVY }}
            >
              {PROB_LABEL[row.prob]}
            </td>
            {row.sev.map((cls, i) => {
              const cfg = PGR_LABELS[cls];
              return (
                <td
                  key={i}
                  className={`${cfg?.cor || ""} p-3 text-center font-medium border`}
                  style={{ borderColor: "#E3E8EE" }}
                >
                  {cfg?.label || cls}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Semáforo: barra horizontal empilhada por subescala
function SemaforoSetor({ resultado }: { resultado: SubescalaResultado[] }) {
  const data = resultado.map((r) => ({
    nome: r.nome,
    Risco: r.pct_risco,
    Intermediário: r.pct_atencao,
    Favorável: r.pct_favoravel,
  }));
  const altura = Math.max(220, data.length * 22 + 60);
  return (
    <div style={{ width: "100%", height: altura }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
          stackOffset="expand"
        >
          <XAxis
            type="number"
            domain={[0, 1]}
            tickFormatter={(v) => `${Math.round(v * 100)}%`}
            tick={{ fontSize: 10, fill: NAVY }}
          />
          <YAxis
            type="category"
            dataKey="nome"
            width={180}
            tick={{ fontSize: 10, fill: NAVY }}
          />
          <Tooltip
            formatter={(v: number, name: string) => [`${v}%`, name]}
            contentStyle={{ fontSize: 11 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Risco" stackId="s" fill={COR_RISCO} />
          <Bar dataKey="Intermediário" stackId="s" fill={COR_ATENCAO} />
          <Bar dataKey="Favorável" stackId="s" fill={COR_FAVORAVEL}>
            {data.map((_, i) => (
              <Cell key={i} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============== PÁGINA ==============

function RelatorioVisualizarPage() {
  const { id: avaliacaoId, relatorioId } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [rel, setRel] = useState<Relatorio | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("nr1_relatorio")
        .select("id, versao, versao_documento, status, gerado_em, conteudo")
        .eq("id", relatorioId)
        .maybeSingle();

      if (cancel) return;
      if (error) {
        toast.error("Não foi possível carregar o relatório.");
        setLoading(false);
        return;
      }
      setRel(data as unknown as Relatorio);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [relatorioId]);

  const conteudo: Conteudo = rel?.conteudo || {};
  const boilerplate = conteudo.boilerplate || [];
  const empresa: Empresa = conteudo.empresa || {};
  const setores: SetorBlock[] = conteudo.setores || [];
  const adesao = conteudo.adesao || {};
  const catalogo = conteudo.catalogo || {};
  const indicadores = conteudo.indicadores || null;
  const plano: AcaoPlano[] = conteudo.plano_acao || [];
  const respTec: RespTec[] = conteudo.responsaveis_tecnicos || [];

  const bp = useMemo(() => {
    return (chave: string) =>
      boilerplate.find((b) => b.chave === chave)?.corpo || "";
  }, [boilerplate]);

  // numeração condicional (pular indicadores se nulo? requisito: NÃO pular — manter ordem lógica)
  // mantemos 1..11 sempre

  // plano agrupado por setor_nome
  const planoPorSetor = useMemo(() => {
    const ORDEM_NIVEL_PLANO: Record<string, number> = { intoleravel: 0, substancial: 1 };
    const map = new Map<string, AcaoPlano[]>();
    for (const a of plano) {
      if (a.nivel_risco_origem !== "intoleravel" && a.nivel_risco_origem !== "substancial") continue;
      const k = a.setor_nome || "Geral";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(a);
    }
    for (const lista of map.values()) {
      lista.sort(
        (a, b) =>
          (ORDEM_NIVEL_PLANO[a.nivel_risco_origem ?? ""] ?? 9) -
          (ORDEM_NIVEL_PLANO[b.nivel_risco_origem ?? ""] ?? 9),
      );
    }
    return map;
  }, [plano]);

  if (loading) {
    return (
      <div
        className="max-w-5xl mx-auto px-6 py-10"
        style={{ fontFamily: "Geist, sans-serif" }}
      >
        <p className="text-sm text-muted-foreground">Carregando relatório…</p>
      </div>
    );
  }

  if (!rel) {
    return (
      <div
        className="max-w-5xl mx-auto px-6 py-10"
        style={{ fontFamily: "Geist, sans-serif" }}
      >
        <p className="text-sm text-muted-foreground">Relatório não encontrado.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/nr1/$id/relatorio" params={{ id: avaliacaoId }}>
            Voltar
          </Link>
        </Button>
      </div>
    );
  }


  return (
    <div
      className="bg-white min-h-screen print:bg-white"
      style={{ fontFamily: "Geist, sans-serif", color: NAVY }}
    >
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4; margin: 18mm 16mm; }
          html, body { height: auto !important; overflow: visible !important; background: white !important; }
          .overflow-x-auto, .overflow-auto, .overflow-y-auto, .overflow-hidden { overflow: visible !important; }
          .page-break { page-break-before: always; break-before: page; }
          h2, h3 { page-break-after: avoid; break-after: avoid; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; break-inside: avoid; }
          table { page-break-inside: auto; break-inside: auto; width: 100% !important; }
          section, .avoid-break { break-inside: auto; }
        }
      `}</style>

      {/* Navegação (não imprime) */}
      <div className="no-print border-b" style={{ borderColor: "#E3E8EE" }}>
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link
            to="/nr1/$id/relatorio"
            params={{ id: avaliacaoId }}
            className="inline-flex items-center gap-1.5 text-[13px] hover:underline"
            style={{ color: NAVY }}
          >
            <ArrowLeft size={14} />
            Voltar
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const semaforos: Record<string, Uint8Array> = {};
                  for (const s of setores) {
                    if (s.bloqueado) continue;
                    const el = document.getElementById(`semaforo-${s.setor_id}`);
                    if (!el) continue;
                    const bytes = await svgParaPng(el);
                    if (bytes) semaforos[s.setor_id] = bytes;
                  }
                  const logo = await carregarLogoComoBytes(conteudo.logo_url);
                  await exportarRelatorioDocx(rel, { logo, semaforos });
                } catch (e) {
                  toast.error("Erro ao exportar .docx", {
                    description: e instanceof Error ? e.message : "Tente novamente.",
                  });
                }
              }}
              style={{ borderColor: NAVY, color: NAVY }}
            >
              <FileDown size={14} className="mr-1.5" />
              Exportar .docx
            </Button>
            <Button
              onClick={() => window.print()}
              className="text-white"
              style={{ backgroundColor: CORAL }}
            >
              <Printer size={14} className="mr-1.5" />
              Imprimir / salvar PDF
            </Button>
          </div>
        </div>
      </div>

      <article className="max-w-5xl mx-auto px-6 md:px-10 py-10 space-y-10 print:py-0 print:px-0 print:max-w-none">
        {/* 1) CAPA */}
        <section className="space-y-6 avoid-break">
          {conteudo.logo_url && (
            <div className="flex justify-start">
              <img
                src={conteudo.logo_url}
                alt="Logo da empresa"
                style={{ maxHeight: 64, objectFit: "contain" }}
              />
            </div>
          )}
          <div className="space-y-2">
            <p
              className="text-[10px] font-mono uppercase tracking-[0.18em]"
              style={{ color: CORAL }}
            >
              laudo técnico · nr-1 · fatores de risco psicossociais
            </p>
            <h1
              className="text-[26px] font-semibold leading-tight tracking-tight"
              style={{ color: NAVY }}
            >
              AEP/PGR com ênfase nos fatores de risco psicossocial relacionados
              ao trabalho
            </h1>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[13px]">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Razão social
              </div>
              <div className="font-medium">{empresa.razao_social || "—"}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                CNPJ
              </div>
              <div className="font-medium">{empresa.cnpj || "—"}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                CNAE
              </div>
              <div className="font-medium">{empresa.cnae || "—"}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Grau de risco (NR-4)
              </div>
              <div className="font-medium">{empresa.grau_risco ?? "—"}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Instrumento
              </div>
              <div className="font-medium">
                {instrumentoLabel(conteudo.instrumento)}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Data de geração
              </div>
              <div className="font-medium">
                {fmtData(conteudo.gerado_em || rel.gerado_em)}
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Responsável técnico
            </div>
            {(() => {
              const rtsCRP = respTec.filter((r) =>
                (r.tipo_conselho ?? "").toUpperCase().includes("CRP"),
              );
              const rtsCapa = rtsCRP.length ? rtsCRP : respTec;
              return rtsCapa.length === 0 ? (
                <div className="text-[13px] text-muted-foreground">
                  Nenhum responsável técnico vinculado.
                </div>
              ) : (
                <ul className="text-[13px] space-y-1">
                  {rtsCapa.map((r, i) => (
                    <li key={i}>
                      <span className="font-medium">{r.nome}</span> —{" "}
                      {[r.tipo_conselho, r.uf_conselho, r.numero_registro]
                        .filter(Boolean)
                        .join(" ")}
                    </li>
                  ))}
                </ul>
              );
            })()}
          </div>

        </section>

        {/* 2) OBJETIVO */}
        <section className="space-y-3 page-break">
          <SectionTitle n={1}>Objetivo do relatório</SectionTitle>
          <Paragraphs text={bp("objetivo")} />
        </section>

        {/* 3) DADOS DA ORGANIZAÇÃO */}
        <section className="space-y-4">
          <SectionTitle n={2}>
            Dados da organização e enquadramento legal
          </SectionTitle>

          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[13px]">
            <div>
              <span className="text-muted-foreground">Empresa: </span>
              <span className="font-medium">{empresa.razao_social || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">CNPJ: </span>
              <span className="font-medium">{empresa.cnpj || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">CNAE principal: </span>
              <span className="font-medium">{empresa.cnae || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Grau de risco: </span>
              <span className="font-medium">{empresa.grau_risco ?? "—"}</span>
            </div>
          </div>
          {empresa.area_atuacao && empresa.area_atuacao.trim() ? (
            <div className="text-[13px]">
              <div className="text-muted-foreground mb-1">Caracterização da empresa</div>
              <Paragraphs text={empresa.area_atuacao} />
            </div>
          ) : null}
        </section>

        {/* 4) INDICADORES EPIDEMIOLÓGICOS */}
        <section className="space-y-3">
          <SectionTitle n={3}>
            Indicadores epidemiológicos (últimos 12 meses)
          </SectionTitle>
          {!indicadores ? (
            <p className="text-[13px] text-muted-foreground">
              Não apresentados.
            </p>
          ) : (
            <>
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr style={{ backgroundColor: "#F4F6F9" }}>
                    <th className="text-left p-2 font-medium">Indicador</th>
                    <th className="text-left p-2 font-medium">Status</th>
                    <th className="text-left p-2 font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { chave: "num_empregados_referencia", rotulo: "Número de empregados" },
                    { chave: "afastamentos_b31", rotulo: "Afastamentos B31" },
                    { chave: "afastamentos_b91", rotulo: "Afastamentos B91" },
                    { chave: "taxa_turnover", rotulo: "Turnover (%)" },
                  ].map(({ chave, rotulo }) => {
                    const v = indicadores[chave];
                    const status = (indicadores.status_indicadores as Record<string, unknown> | undefined)?.[chave];
                    return (
                      <tr
                        key={chave}
                        className="border-t"
                        style={{ borderColor: "#E3E8EE" }}
                      >
                        <td className="p-2">{rotulo}</td>
                        <td className="p-2">
                          {status ? String(status) : "—"}
                        </td>
                        <td className="p-2">
                          {v === null || v === undefined || v === ""
                            ? "—"
                            : String(v)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {typeof indicadores.parecer_indicadores === "string" &&
                indicadores.parecer_indicadores && (
                  <div className="space-y-2">
                    <p className="text-[13px] font-semibold">Parecer técnico:</p>
                    <Paragraphs
                      text={indicadores.parecer_indicadores as string}
                    />
                  </div>
                )}
            </>
          )}
        </section>

        {/* 5) METODOLOGIA E CRITÉRIOS */}
        <section className="space-y-4 page-break">
          <SectionTitle n={4}>Metodologia e critérios</SectionTitle>

          <h3 className="text-[14px] font-semibold" style={{ color: NAVY }}>
            4.1 Embasamento legal e técnico
          </h3>
          <Paragraphs text={bp("metodologia")} />

          <h3 className="text-[14px] font-semibold" style={{ color: NAVY }}>
            4.2 Critérios de avaliação de risco (severidade x probabilidade)
          </h3>
          <Paragraphs text={bp("criterios_severidade")} />

          <div className="space-y-2 avoid-break">
            <h4 className="text-[13px] font-semibold" style={{ color: NAVY }}>
              Matriz de risco (PGR)
            </h4>
            <MatrizPgr />
          </div>

          {(() => {
            const respondentes = (conteudo.setores ?? []).reduce(
              (s, x) => s + (x.total_respondentes ?? 0),
              0,
            );
            const colaboradores =
              conteudo.empresa?.qtd_colaboradores_estimado ?? null;
            const pct =
              colaboradores && colaboradores > 0
                ? Math.round((respondentes / colaboradores) * 100)
                : null;
            const censo =
              colaboradores != null && respondentes >= colaboradores;
            return (
              <>
                <h3 className="text-[14px] font-semibold" style={{ color: NAVY }}>
                  4.2.1 Método de coleta de dados, tamanho amostral e representatividade
                </h3>
                {colaboradores && pct !== null ? (
                  <p className="text-[13px] leading-relaxed">
                    {censo
                      ? `A empresa conta com ${colaboradores} colaboradores, todos participantes da avaliação, resultando em taxa de participação de ${pct}%. Dessa forma, os resultados representam a percepção de todo o grupo avaliado no momento da aplicação do instrumento, conferindo elevada representatividade aos dados coletados. Considerando o porte da organização, os resultados fornecem subsídios consistentes para a identificação dos fatores organizacionais e psicossociais presentes no ambiente de trabalho, devendo sua interpretação considerar as características específicas das atividades desenvolvidas e da estrutura organizacional avaliada.`
                      : `A empresa conta com ${colaboradores} colaboradores, dos quais ${respondentes} participaram da avaliação, resultando em taxa de participação de ${pct}%. Os resultados representam a percepção dos respondentes no momento da aplicação do instrumento e devem ser interpretados como indicativos das tendências do grupo participante, considerando as características específicas das atividades desenvolvidas e da estrutura organizacional avaliada.`}
                  </p>
                ) : (
                  <p className="text-[13px] leading-relaxed">
                    Número de colaboradores não informado; taxa de participação não pôde ser calculada.
                  </p>
                )}

                <h3 className="text-[14px] font-semibold" style={{ color: NAVY }}>
                  4.2.2 Corte transversal
                </h3>
                <p className="text-[13px] leading-relaxed">
                  {`Esta avaliação representa um retrato do momento da coleta (${conteudo.data_realizacao ? fmtDataCurta(conteudo.data_realizacao) : "—"}) e não permite inferências sobre tendências temporais, causalidade ou evolução dos fatores identificados.`}
                </p>
              </>
            );
          })()}
        </section>

        {/* 6) INVENTÁRIO DE RISCO POR SETOR */}
        <section className="space-y-5 page-break">
          <SectionTitle n={5}>Inventário de risco (por setor)</SectionTitle>
          <Paragraphs text={bp("inventario_intro")} />

          {setores.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              Nenhum setor cadastrado.
            </p>
          ) : (
            setores.map((s) => {
              const resultado = s.resultado || [];
              const ORDEM_PGR = ["intoleravel", "substancial", "moderado", "toleravel", "trivial"];
              const prioritarias = resultado
                .filter((r) => ORDEM_PGR.includes(r.classificacao_pgr))
                .sort(
                  (a, b) =>
                    ORDEM_PGR.indexOf(a.classificacao_pgr) -
                    ORDEM_PGR.indexOf(b.classificacao_pgr),
                );
              return (
                <div key={s.setor_id} className="space-y-3 avoid-break">
                  <div className="flex items-baseline justify-between border-b pb-1" style={{ borderColor: "#E3E8EE" }}>
                    <h3
                      className="text-[15px] font-semibold"
                      style={{ color: NAVY }}
                    >
                      Setor: {s.nome}
                    </h3>
                    <span className="text-[12px] text-muted-foreground">
                      {s.total_respondentes ?? 0} respondentes
                    </span>
                  </div>
                  {s.descricao && (
                    <p className="text-[12px] text-muted-foreground">
                      {s.descricao}
                    </p>
                  )}

                  {s.bloqueado ? (
                    <div
                      className="border-l-4 px-4 py-2 text-[12px] rounded-r"
                      style={{
                        borderColor: NAVY,
                        backgroundColor: "#F4F6F9",
                      }}
                    >
                      Setor com menos de 5 respondentes — não segmentado (LGPD).
                    </div>
                  ) : (
                    <>
                      {Array.isArray(s.cargos) && s.cargos.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[12px] font-medium" style={{ color: NAVY }}>
                            Funções / cargos
                          </div>
                          <table className="w-full text-[12px] border-collapse table-fixed">
                            <thead>
                              <tr style={{ backgroundColor: "#F4F6F9" }}>
                                <th className="text-left p-2 font-medium" style={{ width: "22%" }}>Função</th>
                                <th className="text-left p-2 font-medium" style={{ width: "12%" }}>CBO</th>
                                <th className="text-left p-2 font-medium" style={{ width: "10%" }}>Nº colab.</th>
                                <th className="text-left p-2 font-medium" style={{ width: "11%" }}>CH</th>
                                <th className="text-left p-2 font-medium" style={{ width: "45%" }}>Descrição das atividades</th>
                              </tr>
                            </thead>
                            <tbody>
                              {s.cargos.map((c, j) => (
                                <tr key={j} className="border-t align-top" style={{ borderColor: "#E3E8EE" }}>
                                  <td className="p-2 break-words whitespace-normal align-top">{c.nome_funcao || "—"}</td>
                                  <td className="p-2 break-words whitespace-normal align-top">{c.cbo_codigo || "—"}</td>
                                  <td className="p-2 align-top">{c.qtd_colaboradores ?? "—"}</td>
                                  <td className="p-2 break-words whitespace-normal align-top">{c.carga_horaria || "—"}</td>
                                  <td className="p-2 whitespace-pre-wrap break-words align-top">{c.atividades || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="text-[12px] font-medium" style={{ color: NAVY }}>
                          Classificação de risco por subescala
                        </div>
                        {prioritarias.length === 0 ? (
                          <p className="text-[12px] text-muted-foreground">
                            Nenhuma subescala classificada neste setor.
                          </p>
                        ) : (
                          <table className="w-full text-[12px] border-collapse table-fixed">
                            <thead>
                              <tr style={{ backgroundColor: "#F4F6F9" }}>
                                <th className="text-left p-2 font-medium" style={{ width: "14%" }}>Subescala</th>
                                <th className="text-left p-2 font-medium" style={{ width: "26%" }}>Perguntas relacionadas</th>
                                <th className="text-left p-2 font-medium" style={{ width: "10%" }}>Nível</th>
                                <th className="text-left p-2 font-medium" style={{ width: "25%" }}>O que significa</th>
                                <th className="text-left p-2 font-medium" style={{ width: "25%" }}>Possíveis agravos</th>
                              </tr>
                            </thead>
                            <tbody>
                              {prioritarias.map((r) => {
                                const cat = catalogo[r.subescala_id] || {};
                                return (
                                  <tr key={r.subescala_id} className="border-t align-top" style={{ borderColor: "#E3E8EE" }}>
                                    <td className="p-2 font-medium break-words whitespace-normal align-top">{r.nome}</td>
                                    <td className="p-2 break-words whitespace-normal align-top">
                                      {cat.perguntas && cat.perguntas.length > 0 ? (
                                        <div className="space-y-1">
                                          {cat.perguntas.map((p) => (
                                            <div key={p.numero} className="text-[11px] leading-snug break-words whitespace-normal">
                                              Q{p.numero}. {p.texto}
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </td>
                                    <td className="p-2 align-top"><PgrBadge classificacao={r.classificacao_pgr} /></td>
                                    <td className="p-2 whitespace-pre-wrap break-words align-top">{cat.significado || "—"}</td>
                                    <td className="p-2 whitespace-pre-wrap break-words align-top">{cat.agravos || "—"}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="text-[12px] font-medium" style={{ color: NAVY }}>
                          Semáforo do setor (todas as subescalas)
                        </div>
                        {resultado.length === 0 ? (
                          <p className="text-[12px] text-muted-foreground">
                            Sem dados consolidados.
                          </p>
                        ) : (
                          <>
                            <div id={`semaforo-${s.setor_id}`}>
                              <SemaforoSetor resultado={resultado} />
                            </div>
                            <div className="flex gap-4 text-[11px] mt-1">
                              <span className="inline-flex items-center gap-1">
                                <span className="inline-block w-3 h-3 rounded-sm" style={{ background: COR_RISCO }} />
                                Risco à saúde
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <span className="inline-block w-3 h-3 rounded-sm" style={{ background: COR_ATENCAO }} />
                                Intermediário
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <span className="inline-block w-3 h-3 rounded-sm" style={{ background: COR_FAVORAVEL }} />
                                Favorável
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </section>

        {/* 7) ANÁLISE DOS FATORES PSICOSSOCIAIS (por nível) */}
        <section className="space-y-4 page-break">
          <SectionTitle n={6}>Análise dos fatores psicossociais</SectionTitle>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Os resultados estão organizados por nível de risco, conforme a Matriz de Risco 3x3 adotada pela organização (item 4.2 deste laudo), permitindo a leitura direta entre o achado e a prioridade de ação correspondente. Cada subescala é identificada junto à dimensão do COPSOQ-II a que pertence. Trata-se de avaliação de percepção coletiva da amostra, sem inferência diagnóstica, individualizante ou causal.
          </p>
          {(() => {
            const DIM_LABELS: Record<string, string> = {
              demandas: "Exigências laborais",
              organizacao: "Organização do trabalho e conteúdo",
              relacoes: "Relações sociais e liderança",
              valores: "Valores no local de trabalho",
              personalidade: "Personalidade",
              interface: "Interface trabalho-indivíduo",
              saude: "Saúde e bem-estar",
              comportamentos: "Comportamentos ofensivos",
            };
            const fatoresDoNivel = (resultado: SubescalaResultado[] | undefined, nivel: string): string[] =>
              (resultado ?? [])
                .filter((r) => (r.classificacao_pgr ?? "").toLowerCase() === nivel)
                .map((r) => {
                  const dim = DIM_LABELS[r.dimensao_macro ?? ""] ?? "";
                  return dim ? `${r.nome} (dimensão ${dim})` : r.nome;
                });
            const getBucket = (analises: AnaliseItem[] | undefined, chave: string) =>
              (analises ?? []).find((a) => a.dimensao === chave);
            const setoresAtivos = setores.filter(
              (s) => !s.bloqueado && (s.total_respondentes ?? 0) > 0,
            );
            const umSetor = setoresAtivos.length === 1;
            const topCls = setoresAtivos.length <= 1 ? "text-[15px]" : "text-[14px]";
            const renderAnalise = (item?: AnaliseItem) => {
              const texto = (item?.texto ?? "").trim();
              if (!texto) return <NotaRevisao>Análise pendente de preenchimento.</NotaRevisao>;
              if (item?.gerado_por_ia) {
                return (
                  <div style={{ color: CORAL }} className="space-y-2">
                    <p className="italic text-[12px]">
                      (Análise sugerida por IA — pendente de revisão e aprovação do responsável técnico.)
                    </p>
                    <Paragraphs text={texto} />
                  </div>
                );
              }
              return <Paragraphs text={texto} />;
            };
            const renderNiveis = (
              resultado: SubescalaResultado[] | undefined,
              analises: AnaliseItem[] | undefined,
              numerado: boolean,
            ) => {
              const trivial = fatoresDoNivel(resultado, "trivial");
              const toleravel = fatoresDoNivel(resultado, "toleravel");
              const moderado = fatoresDoNivel(resultado, "moderado");
              const substancial = fatoresDoNivel(resultado, "substancial");
              const intoleravel = fatoresDoNivel(resultado, "intoleravel");
              const disclaimerNivel = (nivel: string) => {
                const rows = (resultado ?? []).filter((r) => (r.classificacao_pgr ?? "").toLowerCase() === nivel);
                const cos = rows.filter((r) => (r.nome ?? "").toLowerCase().includes("ofensiv"));
                if (!cos.length) return null;
                const temPositivo = cos.some((co) => (co.pct_risco ?? 0) > 0 || (co.pct_atencao ?? 0) > 0);
                return (
                  <div className="border-l-4 px-4 py-3 rounded-r mt-2" style={{ borderColor: CORAL, backgroundColor: "#FFF6F4" }}>
                    <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: CORAL }}>
                      Disclaimer legal
                    </div>
                    <div className="text-[13px] leading-relaxed" style={{ color: NAVY }}>
                      {temPositivo
                        ? "EXPOSIÇÃO A COMPORTAMENTOS OFENSIVOS NO TRABALHO — assédio moral, assédio sexual, ameaças e violência física ou verbal. DISCLAIMER LEGAL — Lei nº 14.457/2022 (Programa Emprega + Mulheres): foram identificadas respostas positivas a itens de violência e/ou assédio. Independentemente da magnitude estatística, a legislação obriga as empresas com CIPA a (i) instituir canal de denúncia que garanta o anonimato e proteja o(a) denunciante; (ii) estabelecer procedimentos de apuração com sigilo e imparcialidade; (iii) aplicar sanções administrativas aos responsáveis; e (iv) promover ações de capacitação e sensibilização sobre prevenção e combate ao assédio sexual e demais formas de violência, incluindo o tema na política formal da organização e nos treinamentos da CIPA. A presença de qualquer relato exige resposta institucional imediata."
                        : "Em relação ao fator Comportamentos Ofensivos, embora não tenham sido relatadas situações pela amostra, este fator é mantido em nível moderado como medida de vigilância preventiva, conforme a lógica de classificação do instrumento. Dessa forma, o resultado deve ser interpretado como um alerta para acompanhamento contínuo e promoção de um ambiente de trabalho respeitoso, e não como indicação da ocorrência efetiva de assédio, discriminação ou violência ocupacional."}
                    </div>
                  </div>
                );
              };
              return (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <h4 className={`${topCls} font-semibold`} style={{ color: NAVY }}>
                      {numerado ? "6.1 " : ""}Fatores protetores (Trivial)
                    </h4>
                    {trivial.length ? (
                      <>
                        <p className="text-[13px] leading-relaxed">{trivial.join("; ") + "."}</p>
                        {renderAnalise(getBucket(analises, "trivial"))}
                      </>
                    ) : (
                      <p className="text-[13px] leading-relaxed text-muted-foreground">
                        Nenhum fator classificado como Trivial.
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <h4 className={`${topCls} font-semibold`} style={{ color: NAVY }}>
                      {numerado ? "6.2 " : ""}Fatores de atenção (Tolerável e Moderado)
                    </h4>
                    {toleravel.length ? (
                      <div className="space-y-1">
                        <p className="text-[12px] font-medium" style={{ color: NAVY }}>Em nível tolerável</p>
                        <p className="text-[13px] leading-relaxed">{toleravel.join("; ") + "."}</p>
                        {renderAnalise(getBucket(analises, "toleravel"))}
                      </div>
                    ) : null}
                    {moderado.length ? (
                      <div className="space-y-1">
                        <p className="text-[12px] font-medium" style={{ color: NAVY }}>Em nível moderado</p>
                        <p className="text-[13px] leading-relaxed">{moderado.join("; ") + "."}</p>
                        {renderAnalise(getBucket(analises, "moderado"))}
                        {disclaimerNivel("moderado")}
                      </div>
                    ) : null}
                    {!toleravel.length && !moderado.length ? (
                      <p className="text-[13px] leading-relaxed text-muted-foreground">
                        Nenhum fator classificado como Tolerável ou Moderado.
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <h4 className={`${topCls} font-semibold`} style={{ color: NAVY }}>
                      {numerado ? "6.3 " : ""}Fatores que exigem intervenção
                    </h4>
                    {substancial.length ? (
                      <div className="space-y-1">
                        <p className="text-[12px] font-medium" style={{ color: NAVY }}>
                          {numerado ? "6.3.1 Substancial" : "Substancial"}
                        </p>
                        <p className="text-[13px] leading-relaxed">{substancial.join("; ") + "."}</p>
                        {renderAnalise(getBucket(analises, "substancial"))}
                        {disclaimerNivel("substancial")}
                      </div>
                    ) : null}
                    {intoleravel.length ? (
                      <div className="space-y-1">
                        <p className="text-[12px] font-medium" style={{ color: NAVY }}>
                          {numerado ? "6.3.2 Intolerável" : "Intolerável"}
                        </p>
                        <p className="text-[13px] leading-relaxed">{intoleravel.join("; ") + "."}</p>
                        {renderAnalise(getBucket(analises, "intoleravel"))}
                        {disclaimerNivel("intoleravel")}
                      </div>
                    ) : null}
                    {!substancial.length && !intoleravel.length ? (
                      <p className="text-[13px] leading-relaxed text-muted-foreground">
                        Nenhum fator classificado como Substancial ou Intolerável.
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            };
            const renderSintese = (analises: AnaliseItem[] | undefined, numerado: boolean) => {
              const s = getBucket(analises, "sintese");
              if (!s || !(s.texto ?? "").trim()) return null;
              return (
                <div className="space-y-2">
                  <h4 className={`${topCls} font-semibold`} style={{ color: NAVY }}>
                    {numerado ? "6.4 " : ""}Síntese relacional dos achados
                  </h4>
                  {renderAnalise(s)}
                </div>
              );
            };
            const renderRodapeLegal = (resultado: SubescalaResultado[]) => {
              const temPrioritario = resultado.some((r) =>
                ["substancial", "intoleravel"].includes((r.classificacao_pgr ?? "").toLowerCase()),
              );
              if (!temPrioritario) return null;
              return (
                <div className="space-y-2">
                  <p className="text-[12px] italic leading-relaxed text-muted-foreground">
                    Os fatores classificados como Substancial ou Intolerável determinam a necessidade de adoção ou manutenção de medidas de prevenção e a elaboração de plano de ação, nos termos dos subitens 1.5.4.4.3 e 1.5.5.2.1 da NR-1. Recomenda-se que as medidas observem as diretrizes de boas práticas da ISO 45003:2021 (gestão de riscos psicossociais relacionados ao trabalho).
                  </p>
                </div>
              );
            };
            const avisoClinico = (
              <div className="border-l-4 px-4 py-3 rounded-r" style={{ borderColor: CORAL, backgroundColor: "#FFF6F4" }}>
                <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: CORAL }}>
                  Aviso clínico
                </div>
                <Paragraphs text={bp("aviso_clinico")} />
              </div>
            );
            if (setoresAtivos.length <= 1) {
              const resultado = umSetor ? (setoresAtivos[0].resultado ?? []) : (conteudo.resultado_global ?? []);
              const analisesSetor = umSetor ? (setoresAtivos[0].analises ?? []) : [];

              const temConteudoSetor = analisesSetor.some((a) => ((a?.texto ?? "").trim().length > 0));

              const analises = temConteudoSetor ? analisesSetor : (conteudo.analises_consolidado ?? []);
              return (
                <div className="space-y-4">
                  {renderNiveis(resultado, analises, true)}
                  {avisoClinico}
                  {renderSintese(analises, true)}
                  {renderRodapeLegal(resultado)}
                </div>
              );
            }
            const resultadoConsolidado = setoresAtivos.flatMap((s) => s.resultado ?? []);
            return (
              <div className="space-y-5">
                {setoresAtivos.map((s, idx) => (
                  <div key={s.setor_id} className="space-y-3 avoid-break">
                    <h3 className="text-[15px] font-semibold" style={{ color: NAVY }}>
                      6.{idx + 1} Setor: {s.nome}
                    </h3>
                    {renderNiveis(s.resultado ?? [], s.analises ?? [], false)}
                    {renderSintese(s.analises ?? [], false)}
                  </div>
                ))}
                {avisoClinico}
                {renderRodapeLegal(resultadoConsolidado)}
              </div>
            );
          })()}
        </section>

        {/* 7) PRIORIDADES DE INTERVENÇÃO E DIRECIONAMENTO DE AÇÃO (PGR) */}
        <section className="space-y-4 page-break">
          <SectionTitle n={7}>
            Prioridades de intervenção e direcionamento de ação (PGR)
          </SectionTitle>

          <div className="space-y-2">
            <h3 className="text-[14px] font-semibold" style={{ color: NAVY }}>
              7.1 Critério de priorização das medidas de controle
            </h3>
            {bp("criterio_priorizacao") ? (
              <Paragraphs text={bp("criterio_priorizacao")} />
            ) : (
              <p className="text-[13px] leading-relaxed">
                A priorização das medidas de controle seguiu o nível de risco
                da Matriz 3x3. Receberam prioridade de intervenção os fatores
                classificados como Intolerável e Substancial. Fatores
                Moderados e Toleráveis são tratados de forma complementar; os
                Triviais permanecem sob monitoramento periódico.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-[14px] font-semibold" style={{ color: NAVY }}>
              7.2 Plano de ação
            </h3>
            {planoPorSetor.size === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                Nenhuma ação cadastrada.
              </p>
            ) : (
              Array.from(planoPorSetor.entries()).map(([setorNome, acoes]) => (
                <div key={setorNome} className="space-y-2 avoid-break">
                  <h4
                    className="text-[13px] font-semibold"
                    style={{ color: NAVY }}
                  >
                    Setor: {setorNome}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] border-collapse table-fixed">
                      <thead>
                        <tr style={{ backgroundColor: "#F4F6F9" }}>
                          <th className="text-left p-2 font-medium" style={{ width: "4%" }}>Ord.</th>
                          <th className="text-left p-2 font-medium" style={{ width: "12%" }}>Risco</th>
                          <th className="text-left p-2 font-medium" style={{ width: "9%" }}>Nível de risco</th>
                          <th className="text-left p-2 font-medium" style={{ width: "17%" }}>Ação</th>
                          <th className="text-left p-2 font-medium" style={{ width: "13%" }}>Meta</th>
                          <th className="text-left p-2 font-medium" style={{ width: "7%" }}>Prioridade</th>
                          <th className="text-left p-2 font-medium" style={{ width: "5%" }}>Sit.</th>
                          <th className="text-left p-2 font-medium" style={{ width: "8%" }}>Planejado início</th>
                          <th className="text-left p-2 font-medium" style={{ width: "8%" }}>Planejado término</th>
                          <th className="text-left p-2 font-medium" style={{ width: "6%" }}>Realizado início</th>
                          <th className="text-left p-2 font-medium" style={{ width: "6%" }}>Realizado término</th>
                          <th className="text-left p-2 font-medium" style={{ width: "5%" }}>Responsável</th>
                        </tr>
                      </thead>
                      <tbody>
                        {acoes.map((a, i) => {
                          const nivel = (a.nivel_risco_origem ?? "").toLowerCase();
                          const acaoTexto = a.o_que ?? "—";
                          const termino = a.prazo
                            ? fmtDataCurta(a.prazo)
                            : (PRAZO_POR_NIVEL[nivel] ?? "—");
                          const NIVEL_LABEL: Record<string, string> = {
                            intoleravel: "Intolerável",
                            substancial: "Substancial",
                            moderado: "Moderado",
                            toleravel: "Tolerável",
                            trivial: "Trivial",
                          };
                          return (
                            <tr key={i} className="border-t align-top" style={{ borderColor: "#E3E8EE" }}>
                              <td className="p-2 align-top">{i + 1}</td>
                              <td className="p-2 break-words whitespace-normal align-top">{catalogo[a.subescala_id]?.nome ?? "—"}</td>
                              <td className="p-2 align-top">{NIVEL_LABEL[nivel] ?? (a.nivel_risco_origem ?? "—")}</td>
                              <td className="p-2 break-words whitespace-normal align-top">{acaoTexto}</td>
                              <td className="p-2 break-words whitespace-normal align-top">{a.por_que ?? "—"}</td>
                              <td className="p-2 align-top">{PRIORIDADE_POR_NIVEL[nivel] ?? "—"}</td>
                              <td className="p-2 align-top">{a.status ? (STATUS_LABEL[a.status] ?? a.status) : "A"}</td>
                              <td className="p-2 align-top">Imediato</td>
                              <td className="p-2 align-top">{termino}</td>
                              <td className="p-2 align-top">—</td>
                              <td className="p-2 align-top">—</td>
                              <td className="p-2 break-words whitespace-normal align-top">{a.responsavel ?? "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                  </div>
                </div>
              ))
            )}
            <p className="text-[11px] text-muted-foreground">
              Legenda — Situação: A Aberta · E Em execução · C Concluída · S Suspensa · P Pendente de aprovação. Prazo recomendado: Intolerável imediato a 90 dias; Substancial imediato a 120 dias.
            </p>
          </div>
        </section>

        {/* 8) DISCUSSÃO */}
        <section className="space-y-4 page-break">
          <SectionTitle n={8}>Discussão</SectionTitle>
          <Paragraphs text={bp("discussao")} />
        </section>


        {/* 9) RESPONSÁVEIS TÉCNICOS */}
        <section className="space-y-6 page-break">
          <SectionTitle n={9}>Responsáveis técnicos</SectionTitle>
          {respTec.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              Nenhum responsável técnico vinculado.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-x-10 gap-y-10 pt-6">
              {respTec.map((r, i) => (
                <div key={i} className="text-[12px] avoid-break">
                  <div
                    className="border-t pt-1"
                    style={{ borderColor: NAVY }}
                  >
                    <div className="font-medium" style={{ color: NAVY }}>
                      {r.nome || "—"}
                    </div>
                    <div className="text-muted-foreground">
                      {[r.tipo_conselho, r.uf_conselho, r.numero_registro]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </div>
                    <div style={{ color: CORAL }}>{r.papel || "—"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="text-center text-[10px] text-muted-foreground pt-6 border-t" style={{ borderColor: "#E3E8EE" }}>
          Documento gerado automaticamente — versão {rel.versao} ·{" "}
          {fmtData(rel.gerado_em)}
        </div>
      </article>
    </div>
  );
}
