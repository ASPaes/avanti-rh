import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Printer, Sparkles, FileDown } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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

type SetorBlock = {
  setor_id: string;
  nome: string;
  descricao?: string | null;
  qtd_colaboradores_estimado?: number | null;
  cargos?: Cargo[];
  bloqueado?: boolean;
  total_respondentes?: number;
  resultado?: SubescalaResultado[];
  analise?: string;
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
  adesao?: { total_respondentes?: number; [k: string]: unknown };
  resultado_global?: SubescalaResultado[];
  catalogo?: Record<string, CatalogoItem>;
  indicadores?: Record<string, unknown> | null;
  plano_acao?: AcaoPlano[];
  responsaveis_tecnicos?: RespTec[];
};

type Relatorio = {
  id: string;
  versao: number;
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
        .select("id, versao, status, gerado_em, conteudo")
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
    const map = new Map<string, AcaoPlano[]>();
    for (const a of plano) {
      const k = a.setor_nome || "Geral";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(a);
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

  const enderecoCompleto = [
    empresa.endereco_logradouro,
    empresa.endereco_numero,
    empresa.endereco_complemento,
    empresa.endereco_bairro,
    empresa.endereco_cidade,
    empresa.endereco_uf,
    empresa.endereco_cep,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      className="bg-white min-h-screen print:bg-white"
      style={{ fontFamily: "Geist, sans-serif", color: NAVY }}
    >
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4; margin: 18mm 16mm; }
          body { background: white !important; }
          .page-break { page-break-before: always; }
          h2, h3 { page-break-after: avoid; }
          tr, .avoid-break { page-break-inside: avoid; }
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
              <div className="font-medium">{conteudo.instrumento || "—"}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Data de geração
              </div>
              <div className="font-medium">
                {fmtData(conteudo.gerado_em || rel.gerado_em)}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Versão
              </div>
              <div className="font-medium">
                Versão {rel.versao}{" "}
                <Badge
                  variant="outline"
                  className="ml-1 text-[10px]"
                  style={{ borderColor: NAVY, color: NAVY }}
                >
                  {rel.status}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Responsáveis técnicos
            </div>
            {respTec.length === 0 ? (
              <div className="text-[13px] text-muted-foreground">
                Nenhum responsável técnico vinculado.
              </div>
            ) : (
              <ul className="text-[13px] space-y-1">
                {respTec.map((r, i) => (
                  <li key={i}>
                    <span className="font-medium">{r.nome}</span> —{" "}
                    {[r.tipo_conselho, r.uf_conselho, r.numero_registro]
                      .filter(Boolean)
                      .join(" ")}{" "}
                    — <span style={{ color: CORAL }}>{r.papel || "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* 2) OBJETIVO */}
        <section className="space-y-3 page-break">
          <SectionTitle n={2}>Objetivo do relatório</SectionTitle>
          <Paragraphs text={bp("objetivo")} />
        </section>

        {/* 3) DADOS DA ORGANIZAÇÃO */}
        <section className="space-y-4">
          <SectionTitle n={3}>
            Dados da organização e enquadramento legal
          </SectionTitle>

          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[13px]">
            <div>
              <span className="text-muted-foreground">Nome fantasia: </span>
              <span className="font-medium">{empresa.nome_fantasia || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Segmento: </span>
              <span className="font-medium">{empresa.segmento || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Área de atuação: </span>
              <span className="font-medium">{empresa.area_atuacao || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">
                Contato responsável:{" "}
              </span>
              <span className="font-medium">
                {empresa.contato_responsavel || "—"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">
                Colaboradores (estimado):{" "}
              </span>
              <span className="font-medium">
                {empresa.qtd_colaboradores_estimado ?? "—"}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Endereço: </span>
              <span className="font-medium">{enderecoCompleto || "—"}</span>
            </div>
          </div>

          <Paragraphs text={bp("enquadramento_legal")} />
        </section>

        {/* 4) INDICADORES EPIDEMIOLÓGICOS */}
        <section className="space-y-3">
          <SectionTitle n={4}>Indicadores epidemiológicos</SectionTitle>
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
                    <th className="text-left p-2 font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(indicadores)
                    .filter(
                      ([k, v]) =>
                        k !== "parecer_indicadores" &&
                        v !== null &&
                        v !== undefined &&
                        v !== "",
                    )
                    .map(([k, v]) => (
                      <tr
                        key={k}
                        className="border-t"
                        style={{ borderColor: "#E3E8EE" }}
                      >
                        <td className="p-2">{k}</td>
                        <td className="p-2">{String(v)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {typeof indicadores.parecer_indicadores === "string" &&
                indicadores.parecer_indicadores && (
                  <Paragraphs
                    text={indicadores.parecer_indicadores as string}
                  />
                )}
            </>
          )}
        </section>

        {/* 5) METODOLOGIA E CRITÉRIOS */}
        <section className="space-y-4 page-break">
          <SectionTitle n={5}>Metodologia e critérios</SectionTitle>
          <Paragraphs text={bp("metodologia")} />
          <Paragraphs text={bp("criterios_severidade")} />

          <div className="space-y-2 avoid-break">
            <h3
              className="text-[14px] font-semibold"
              style={{ color: NAVY }}
            >
              Matriz de risco (PGR)
            </h3>
            <MatrizPgr />
          </div>
        </section>

        {/* 6) INVENTÁRIO DE RISCO POR SETOR */}
        <section className="space-y-5 page-break">
          <SectionTitle n={6}>Inventário de risco (por setor)</SectionTitle>
          <Paragraphs text={bp("inventario_intro")} />

          {setores.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              Nenhum setor cadastrado.
            </p>
          ) : (
            setores.map((s) => {
              const resultado = s.resultado || [];
              const prioritarias = resultado.filter(
                (r) =>
                  r.classificacao_pgr === "intoleravel" ||
                  r.classificacao_pgr === "substancial",
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
                          Riscos prioritários
                        </div>
                        {prioritarias.length === 0 ? (
                          <p className="text-[12px] text-muted-foreground">
                            Sem subescalas classificadas como substancial ou
                            intolerável neste setor.
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

        {/* 7) ANÁLISE INTEGRADA POR SETOR */}
        <section className="space-y-4 page-break">
          <SectionTitle n={7}>Análise integrada por setor</SectionTitle>
          {setores.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              Nenhum setor cadastrado.
            </p>
          ) : (
            setores.map((s) => (
              <div key={s.setor_id} className="space-y-2 avoid-break">
                <h3 className="text-[14px] font-semibold" style={{ color: NAVY }}>
                  {s.nome}
                </h3>
                {s.analise ? (
                  <Paragraphs text={s.analise} />
                ) : (
                  <NotaRevisao>
                    Análise não preenchida para este setor
                  </NotaRevisao>
                )}
              </div>
            ))
          )}
        </section>

        {/* 8) DISCUSSÃO + AVISO CLÍNICO */}
        <section className="space-y-4 page-break">
          <SectionTitle n={8}>Discussão</SectionTitle>
          <Paragraphs text={bp("discussao")} />

          <div
            className="border-l-4 px-4 py-3 rounded-r"
            style={{ borderColor: CORAL, backgroundColor: "#FFF6F4" }}
          >
            <div
              className="text-[11px] font-semibold uppercase tracking-wider mb-1"
              style={{ color: CORAL }}
            >
              Aviso clínico
            </div>
            <Paragraphs text={bp("aviso_clinico")} />
          </div>
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

        {/* ANEXO I — PLANO DE AÇÃO 5W2H */}
        <section className="space-y-4 page-break">
          <h2
            className="text-[18px] font-semibold tracking-tight border-b pb-2 uppercase"
            style={{ color: NAVY, borderColor: "#E3E8EE" }}
          >
            <span style={{ color: CORAL }}>Anexo I —</span> Plano de ação (5W2H)
          </h2>

          <Paragraphs text={bp("anexo_instrucoes")} />

          {planoPorSetor.size === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              Nenhuma ação registrada no plano.
            </p>
          ) : (
            Array.from(planoPorSetor.entries()).map(([setorNome, acoes]) => {
              const porSub = new Map<string, AcaoPlano[]>();
              for (const a of acoes) {
                const k = a.subescala_id;
                if (!porSub.has(k)) porSub.set(k, []);
                porSub.get(k)!.push(a);
              }
              return (
                <div key={setorNome} className="space-y-3 avoid-break">
                  <h3 className="text-[14px] font-semibold border-b pb-1" style={{ color: NAVY, borderColor: "#E3E8EE" }}>
                    {setorNome}
                  </h3>
                  {Array.from(porSub.entries()).map(([subId, lista]) => {
                    const cat = catalogo[subId] || {};
                    return (
                      <div key={subId} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-medium" style={{ color: NAVY }}>
                            Subescala: {cat.nome || subId}
                          </span>
                          <PgrBadge classificacao={lista[0]?.nivel_risco_origem} />
                        </div>
                        <div className="space-y-3">
                          {lista.map((a, i) => (
                            <div
                              key={i}
                              className="border rounded p-3 text-[12px] space-y-1.5 avoid-break"
                              style={{ borderColor: "#E3E8EE" }}
                            >
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="font-medium" style={{ color: NAVY }}>
                                  {a.o_que || "—"}
                                </div>
                                <div className="flex items-center gap-2">
                                  {a.status && (
                                    <Badge variant="outline" className="text-[10px]" style={{ borderColor: NAVY, color: NAVY }}>
                                      {a.status}
                                    </Badge>
                                  )}
                                  {a.gerado_por_ia && (
                                    <Badge
                                      className="text-[10px] text-white inline-flex items-center gap-1"
                                      style={{ backgroundColor: CORAL }}
                                    >
                                      <Sparkles size={10} /> Gerado por IA — revisar
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                <div><span className="text-muted-foreground">Por quê: </span>{a.por_que || "—"}</div>
                                <div><span className="text-muted-foreground">Onde: </span>{a.onde || "—"}</div>
                                <div><span className="text-muted-foreground">Quando: </span>{a.quando || "—"}</div>
                                <div><span className="text-muted-foreground">Quem: </span>{a.quem || "—"}</div>
                                <div className="col-span-2"><span className="text-muted-foreground">Como: </span>{a.como || "—"}</div>
                                <div><span className="text-muted-foreground">Quanto: </span>{a.quanto || "—"}</div>
                                <div><span className="text-muted-foreground">Prazo: </span>{a.prazo || "—"}</div>
                                <div className="col-span-2"><span className="text-muted-foreground">Responsável: </span>{a.responsavel || "—"}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
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
