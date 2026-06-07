import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { PGR_LABELS, DIMENSAO_LABELS } from "@/lib/copsoq-calculo";

const NAVY = "#234A6E";
const CORAL = "#ED7D6E";

type Conteudo = {
  template_versao?: string;
  gerado_em?: string;
  empresa?: any;
  setores?: any[];
  adesao?: any;
  resultado?: any[];
  catalogo?: Record<string, any>;
  indicadores?: any | null;
  plano_acao?: any[];
  responsaveis_tecnicos?: any[];
};

type Relatorio = {
  id: string;
  versao: number;
  status: string;
  gerado_em: string;
  conteudo: Conteudo;
};

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
    return new Date(s).toLocaleDateString("pt-BR");
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

function NotaTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="border-l-4 px-4 py-3 text-[13px] leading-relaxed rounded-r print:bg-transparent"
      style={{ borderColor: CORAL, backgroundColor: "#FFF6F4" }}
    >
      <div
        className="text-[10px] font-mono uppercase tracking-wider mb-1"
        style={{ color: CORAL }}
      >
        texto padrão — revisar antes de emitir
      </div>
      <div style={{ color: NAVY }}>{children}</div>
    </div>
  );
}

function SectionTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2
      className="text-[18px] font-semibold tracking-tight border-b pb-2"
      style={{ color: NAVY, borderColor: "#E3E8EE" }}
    >
      <span style={{ color: CORAL }}>{n}.</span> {children}
    </h2>
  );
}

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

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 font-sans" style={{ fontFamily: "Geist, sans-serif" }}>
        <p className="text-sm text-muted-foreground">Carregando relatório…</p>
      </div>
    );
  }

  if (!rel) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 font-sans" style={{ fontFamily: "Geist, sans-serif" }}>
        <p className="text-sm text-muted-foreground">Relatório não encontrado.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/nr1/$id/relatorio" params={{ id: avaliacaoId }}>
            Voltar
          </Link>
        </Button>
      </div>
    );
  }

  const c = rel.conteudo || {};
  const empresa = c.empresa || {};
  const setores = c.setores || [];
  const adesao = c.adesao || {};
  const resultado = c.resultado || [];
  const catalogo = c.catalogo || {};
  const indicadores = c.indicadores || null;
  const plano = c.plano_acao || [];
  const respTec = c.responsaveis_tecnicos || [];

  // agrupar resultado por dimensao
  const resultadosPorDim: Record<string, any[]> = {};
  for (const r of resultado) {
    const k = r.dimensao_macro || "outras";
    (resultadosPorDim[k] ||= []).push(r);
  }

  // agrupar plano por subescala
  const planoPorSubescala: Record<string, any[]> = {};
  for (const p of plano) {
    const k = p.subescala_id || "sem";
    (planoPorSubescala[k] ||= []).push(p);
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
          body { background: white !important; }
          .page-break { page-break-before: always; }
          h2, h3 { page-break-after: avoid; }
          tr, .avoid-break { page-break-inside: avoid; }
        }
      `}</style>

      {/* navegação (não imprime) */}
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

      <article className="max-w-5xl mx-auto px-6 md:px-10 py-10 space-y-10 print:py-0 print:px-0 print:max-w-none">
        {/* 1) CAPA */}
        <section className="space-y-6 avoid-break">
          <div className="space-y-2">
            <p
              className="text-[10px] font-mono uppercase tracking-[0.18em]"
              style={{ color: CORAL }}
            >
              relatório nr-1 · fatores de risco psicossociais
            </p>
            <h1
              className="text-[28px] font-semibold leading-tight tracking-tight"
              style={{ color: NAVY }}
            >
              Relatório de avaliação de fatores de risco psicossociais — NR-1
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
                Nome fantasia
              </div>
              <div className="font-medium">{empresa.nome_fantasia || "—"}</div>
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
                Data de geração
              </div>
              <div className="font-medium">{fmtData(rel.gerado_em)}</div>
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
            {c.template_versao && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Template
                </div>
                <div className="font-medium">{c.template_versao}</div>
              </div>
            )}
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
                {respTec.map((r: any, i: number) => (
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

          <NotaTemplate>
            <strong>Introdução e metodologia.</strong> Este relatório consolida a
            avaliação dos fatores de risco psicossociais relacionados ao
            trabalho, em atendimento à NR-1 (gerenciamento de riscos
            ocupacionais) e à Lei 14.457/2022. A coleta foi realizada por
            instrumento autoaplicável baseado no COPSOQ, com classificação de
            risco pela matriz severidade × probabilidade conforme PGR. Este
            texto é um modelo padrão e deve ser revisado pelo responsável
            técnico antes da emissão.
          </NotaTemplate>
        </section>

        {/* 2) CARACTERIZAÇÃO */}
        <section className="space-y-4 page-break">
          <SectionTitle n={2}>
            Caracterização da organização e dos setores
          </SectionTitle>

          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[13px]">
            <div>
              <span className="text-muted-foreground">Segmento: </span>
              <span className="font-medium">{empresa.segmento || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Área de atuação: </span>
              <span className="font-medium">{empresa.area_atuacao || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Contato responsável: </span>
              <span className="font-medium">
                {empresa.contato_responsavel || "—"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Colaboradores (estimado): </span>
              <span className="font-medium">
                {empresa.qtd_colaboradores_estimado ?? "—"}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Endereço: </span>
              <span className="font-medium">
                {[
                  empresa.endereco_logradouro,
                  empresa.endereco_numero,
                  empresa.endereco_complemento,
                  empresa.endereco_bairro,
                  empresa.endereco_cidade,
                  empresa.endereco_uf,
                  empresa.endereco_cep,
                ]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            {setores.length === 0 ? (
              <div className="text-[13px] text-muted-foreground">
                Nenhum setor cadastrado.
              </div>
            ) : (
              setores.map((s: any, i: number) => (
                <div key={i} className="space-y-2 avoid-break">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-[15px] font-semibold" style={{ color: NAVY }}>
                      {s.nome}
                    </h3>
                    <span className="text-[12px] text-muted-foreground">
                      {s.qtd_colaboradores_estimado ?? "—"} colaboradores
                    </span>
                  </div>
                  {s.descricao && (
                    <p className="text-[13px] text-muted-foreground">{s.descricao}</p>
                  )}
                  {Array.isArray(s.cargos) && s.cargos.length > 0 && (
                    <table className="w-full text-[12px] border-collapse">
                      <thead>
                        <tr style={{ backgroundColor: "#F4F6F9" }}>
                          <th className="text-left p-2 font-medium">Função</th>
                          <th className="text-left p-2 font-medium">CBO</th>
                          <th className="text-left p-2 font-medium">Nº col.</th>
                          <th className="text-left p-2 font-medium">Carga horária</th>
                          <th className="text-left p-2 font-medium">Atividades</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.cargos.map((c: any, j: number) => (
                          <tr key={j} className="border-t" style={{ borderColor: "#E3E8EE" }}>
                            <td className="p-2">{c.nome_funcao || "—"}</td>
                            <td className="p-2">{c.cbo_codigo || "—"}</td>
                            <td className="p-2">{c.qtd_colaboradores ?? "—"}</td>
                            <td className="p-2">{c.carga_horaria || "—"}</td>
                            <td className="p-2 whitespace-pre-wrap">{c.atividades || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* 3) PARTICIPAÇÃO */}
        <section className="space-y-3">
          <SectionTitle n={3}>Participação</SectionTitle>
          <p className="text-[13px]">
            Total de respondentes:{" "}
            <span className="font-semibold">{adesao.total_respondentes ?? 0}</span>
          </p>
          {adesao.distribuicao_setor?.disponivel && Array.isArray(adesao.distribuicao_setor.fatias) ? (
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr style={{ backgroundColor: "#F4F6F9" }}>
                  <th className="text-left p-2 font-medium">Setor</th>
                  <th className="text-left p-2 font-medium">Respondentes</th>
                  <th className="text-left p-2 font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {adesao.distribuicao_setor.fatias.map((f: any, i: number) => (
                  <tr key={i} className="border-t" style={{ borderColor: "#E3E8EE" }}>
                    <td className="p-2">{f.setor_nome || f.setor_id || "—"}</td>
                    <td className="p-2">{f.n ?? "—"}</td>
                    <td className="p-2">
                      {typeof f.pct === "number" ? `${f.pct.toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-[12px] text-muted-foreground">
              Setores com menos de 5 respondentes não são segmentados, em
              conformidade com a LGPD.
            </p>
          )}
        </section>

        {/* 4) RESULTADOS COPSOQ */}
        <section className="space-y-4 page-break">
          <SectionTitle n={4}>Resultados COPSOQ</SectionTitle>
          {Object.keys(resultadosPorDim).length === 0 ? (
            <div className="text-[13px] text-muted-foreground">
              Sem resultados consolidados.
            </div>
          ) : (
            Object.entries(resultadosPorDim).map(([dim, arr]) => (
              <div key={dim} className="space-y-2 avoid-break">
                <h3 className="text-[14px] font-semibold" style={{ color: NAVY }}>
                  {DIMENSAO_LABELS[dim] || dim}
                </h3>
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr style={{ backgroundColor: "#F4F6F9" }}>
                      <th className="text-left p-2 font-medium">Subescala</th>
                      <th className="text-left p-2 font-medium">Média</th>
                      <th className="text-left p-2 font-medium">% risco</th>
                      <th className="text-left p-2 font-medium">% atenção</th>
                      <th className="text-left p-2 font-medium">% favorável</th>
                      <th className="text-left p-2 font-medium">Severidade</th>
                      <th className="text-left p-2 font-medium">Probabilidade</th>
                      <th className="text-left p-2 font-medium">Classificação PGR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {arr.map((r: any) => (
                      <tr key={r.subescala_id} className="border-t" style={{ borderColor: "#E3E8EE" }}>
                        <td className="p-2">
                          <div className="font-medium">{r.nome}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {r.codigo}
                          </div>
                        </td>
                        <td className="p-2">
                          {typeof r.media_geral === "number"
                            ? r.media_geral.toFixed(2)
                            : "—"}
                        </td>
                        <td className="p-2">
                          {typeof r.pct_risco === "number" ? `${r.pct_risco.toFixed(0)}%` : "—"}
                        </td>
                        <td className="p-2">
                          {typeof r.pct_atencao === "number" ? `${r.pct_atencao.toFixed(0)}%` : "—"}
                        </td>
                        <td className="p-2">
                          {typeof r.pct_favoravel === "number" ? `${r.pct_favoravel.toFixed(0)}%` : "—"}
                        </td>
                        <td className="p-2 capitalize">{r.severidade || "—"}</td>
                        <td className="p-2 capitalize">{r.probabilidade || "—"}</td>
                        <td className="p-2">
                          <PgrBadge classificacao={r.classificacao_pgr} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}

          <NotaTemplate>
            <strong>Aviso clínico.</strong> Os resultados refletem percepções
            coletivas sobre o ambiente de trabalho e não constituem diagnóstico
            clínico individual. Casos individuais devem ser avaliados em
            consulta específica com profissional habilitado.
          </NotaTemplate>
        </section>

        {/* 5) INDICADORES */}
        {indicadores && (
          <section className="space-y-3 avoid-break">
            <SectionTitle n={5}>Indicadores epidemiológicos (12 meses)</SectionTitle>
            <table className="w-full text-[12px] border-collapse">
              <tbody>
                {[
                  ["Período início", fmtDataCurta(indicadores.periodo_inicio)],
                  ["Período fim", fmtDataCurta(indicadores.periodo_fim)],
                  ["Nº empregados (referência)", indicadores.num_empregados_referencia],
                  ["FAP", indicadores.fap],
                  ["Afastamentos B31", indicadores.afastamentos_b31],
                  ["Afastamentos B91", indicadores.afastamentos_b91],
                  ["Taxa de turnover", indicadores.taxa_turnover],
                  ["Taxa de absenteísmo", indicadores.taxa_absenteismo],
                  ["Nº de acidentes", indicadores.num_acidentes],
                ]
                  .filter(([, v]) => v !== null && v !== undefined && v !== "")
                  .map(([k, v], i) => (
                    <tr key={i} className="border-t" style={{ borderColor: "#E3E8EE" }}>
                      <td className="p-2 w-1/2 text-muted-foreground">{k as string}</td>
                      <td className="p-2 font-medium">{String(v)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {indicadores.parecer_indicadores && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                  Parecer
                </div>
                <p className="text-[13px] whitespace-pre-wrap">
                  {indicadores.parecer_indicadores}
                </p>
              </div>
            )}
            {indicadores.observacoes && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                  Observações
                </div>
                <p className="text-[13px] whitespace-pre-wrap">
                  {indicadores.observacoes}
                </p>
              </div>
            )}
          </section>
        )}

        {/* 6) INVENTÁRIO E PLANO 5W2H */}
        <section className="space-y-4 page-break">
          <SectionTitle n={indicadores ? 6 : 5}>
            Inventário de riscos e plano de ação (5W2H)
          </SectionTitle>
          {Object.keys(planoPorSubescala).length === 0 ? (
            <div className="text-[13px] text-muted-foreground">
              Nenhuma ação registrada no plano.
            </div>
          ) : (
            Object.entries(planoPorSubescala).map(([subId, acoes]) => {
              const cat = catalogo[subId] || {};
              return (
                <div key={subId} className="space-y-3 avoid-break">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="text-[14px] font-semibold" style={{ color: NAVY }}>
                      {cat.nome || "Subescala"}
                    </h3>
                    {cat.codigo && (
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {cat.codigo}
                      </span>
                    )}
                  </div>
                  <div className="space-y-3">
                    {acoes.map((a: any, i: number) => (
                      <div
                        key={i}
                        className="border rounded p-3 space-y-2 avoid-break"
                        style={{ borderColor: "#E3E8EE" }}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <PgrBadge classificacao={a.nivel_risco_origem} />
                          <Badge
                            variant="outline"
                            className="text-[10px]"
                            style={{ borderColor: NAVY, color: NAVY }}
                          >
                            {a.status || "—"}
                          </Badge>
                          {a.gerado_por_ia && (
                            <Badge
                              className="text-[10px] text-white"
                              style={{ backgroundColor: CORAL }}
                            >
                              Gerado por IA — revisar
                            </Badge>
                          )}
                        </div>
                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
                          {[
                            ["O quê", a.o_que],
                            ["Por quê", a.por_que],
                            ["Onde", a.onde],
                            ["Quando", a.quando],
                            ["Quem", a.quem],
                            ["Como", a.como],
                            ["Quanto", a.quanto],
                          ].map(([k, v], j) => (
                            <div key={j}>
                              <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                {k as string}
                              </dt>
                              <dd className="whitespace-pre-wrap">{v || "—"}</dd>
                            </div>
                          ))}
                        </dl>
                        <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-4">
                          {a.setor_nome && <span>Setor: {a.setor_nome}</span>}
                          {a.prazo && <span>Prazo: {fmtDataCurta(a.prazo)}</span>}
                          {a.responsavel && <span>Responsável: {a.responsavel}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}

          <NotaTemplate>
            <strong>Fundamentação legal.</strong> Plano de ação estruturado em
            conformidade com a NR-1 (gerenciamento de riscos ocupacionais —
            inventário de riscos e plano de ação) e com a Lei 14.457/2022, que
            inclui medidas de prevenção e combate ao assédio e violência no
            trabalho. Referências citadas para consulta — confirme a redação
            vigente antes da emissão.
          </NotaTemplate>
        </section>

        {/* 7) RESPONSÁVEIS TÉCNICOS — assinaturas */}
        <section className="space-y-6 page-break">
          <SectionTitle n={indicadores ? 7 : 6}>Responsáveis técnicos</SectionTitle>
          {respTec.length === 0 ? (
            <div className="text-[13px] text-muted-foreground">
              Nenhum responsável técnico vinculado.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {respTec.map((r: any, i: number) => (
                <div key={i} className="space-y-2 avoid-break">
                  <div
                    className="h-16 border-b"
                    style={{ borderColor: NAVY }}
                    aria-label="espaço para assinatura"
                  />
                  <div className="text-[12px]">
                    <div className="font-semibold">{r.nome}</div>
                    <div className="text-muted-foreground">
                      {[r.tipo_conselho, r.uf_conselho, r.numero_registro]
                        .filter(Boolean)
                        .join(" ")}
                    </div>
                    <div style={{ color: CORAL }}>{r.papel || "—"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer
          className="text-[10px] text-muted-foreground border-t pt-3"
          style={{ borderColor: "#E3E8EE" }}
        >
          Documento gerado em {fmtData(rel.gerado_em)} — versão {rel.versao} ·
          template {c.template_versao || "—"}. Snapshot imutável.
        </footer>
      </article>
    </div>
  );
}

export const Route = createFileRoute("/_auth/nr1_/$id/relatorio/$relatorioId")({
  component: RelatorioVisualizarPage,
  staticData: { crumb: "Visualizar" },
});
