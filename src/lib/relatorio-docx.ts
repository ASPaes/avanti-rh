import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

// ============== TIPOS (alinhados ao preview) ==============

type BoilerplateItem = { chave: string; titulo?: string; corpo: string; ordem?: number };

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
  tipo?: "positivo" | "negativo";
  severidade?: "critica" | "moderada" | "leve";
  dimensao_macro?: string;
  media_geral?: number;
  total_respondentes?: number;
  pct_risco?: number;
  pct_atencao?: number;
  pct_favoravel?: number;
  probabilidade?: "alta" | "media" | "baixa";
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
  gerado_por_ia?: boolean;
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
  resultado_global?: SubescalaResultado[];
  catalogo?: Record<string, CatalogoItem>;
  indicadores?: Record<string, unknown> | null;
  plano_acao?: AcaoPlano[];
  responsaveis_tecnicos?: RespTec[];
  data_realizacao?: string;
};

type RelatorioInput = {
  versao: number;
  status: string;
  gerado_em: string;
  conteudo: Conteudo;
};

export type ImagensExportacao = {
  logo?: Uint8Array;
  semaforos?: Record<string, Uint8Array>;
};

// ============== HELPERS ==============

const NAVY = "234A6E";

const PGR_LABEL: Record<string, string> = {
  intoleravel: "Intolerável",
  substancial: "Substancial",
  moderado: "Moderado",
  toleravel: "Tolerável",
  trivial: "Trivial",
};

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

function fmtData(s?: string | null): string {
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

function fmtDataCurta(s?: string | null): string {
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

function fmtPct(n?: number): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function bpHelper(conteudo: Conteudo) {
  return (chave: string): string => {
    return conteudo.boilerplate?.find((b) => b.chave === chave)?.corpo ?? "";
  };
}

function p(text: string, opts?: { bold?: boolean; size?: number }): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: opts?.bold,
        size: opts?.size,
      }),
    ],
  });
}

function pVazio(): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: "" })] });
}

function paragrafosDe(text?: string): Paragraph[] {
  if (!text || !text.trim()) return [];
  return text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((linha) => new Paragraph({ children: [new TextRun({ text: linha })] }));
}

function paragrafosDeCor(text: string | undefined, cor: string): Paragraph[] {
  if (!text || !text.trim()) return [];
  return text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(
      (linha) =>
        new Paragraph({ children: [new TextRun({ text: linha, color: cor })] }),
    );
}

function nomesPorClasse(resultado: SubescalaResultado[], classes: string[]): string[] {
  return resultado
    .filter((r) => classes.includes((r.classificacao_pgr ?? "").toLowerCase()))
    .map((r) => r.nome);
}

function listaFatores(nomes: string[]): Paragraph {
  return p(nomes.length ? nomes.join(", ") + "." : "Nenhum fator classificado neste nível.");
}

function disclaimer14457(resultado: SubescalaResultado[], bp: (k: string) => string): Paragraph[] {
  const co = resultado.find((r) => (r.nome ?? "").toLowerCase().includes("ofensiv"));
  const cls = (co?.classificacao_pgr ?? "").toLowerCase();
  if (cls !== "intoleravel" && cls !== "substancial") return [];
  const texto = bp("disclaimer_14457")?.trim()
    || "DISCLAIMER LEGAL — Lei nº 14.457/2022: o fator Comportamentos ofensivos foi classificado em nível de risco relevante (assédio/violência). A organização deve adotar medidas de prevenção e canal de denúncia, nos termos da Lei nº 14.457/2022.";
  return [pVazio(), new Paragraph({ children: [new TextRun({ text: texto, bold: true })] })];
}


function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]): Paragraph {
  return new Paragraph({
    heading: level,
    children: [new TextRun({ text, bold: true, color: NAVY })],
  });
}

function rotuloValor(rotulo: string, valor: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${rotulo}: `, bold: true }),
      new TextRun({ text: valor }),
    ],
  });
}

function cell(children: Paragraph[], opts?: { bold?: boolean; width?: number; fill?: string }): TableCell {
  return new TableCell({
    width: opts?.width
      ? { size: opts.width, type: WidthType.PERCENTAGE }
      : undefined,
    shading: opts?.fill ? { type: ShadingType.SOLID, color: "auto", fill: opts.fill } : undefined,
    children,
  });
}

function cellTexto(texto: string, opts?: { bold?: boolean; width?: number; fill?: string }): TableCell {
  return cell(
    [
      new Paragraph({
        children: [new TextRun({ text: texto, bold: opts?.bold })],
      }),
    ],
    opts,
  );
}

function tabelaSimples(
  cabecalhos: string[],
  linhas: string[][],
): Table {
  const colWidth = Math.floor(100 / Math.max(cabecalhos.length, 1));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: cabecalhos.map((h) =>
          cellTexto(h, { bold: true, width: colWidth }),
        ),
      }),
      ...linhas.map(
        (linha) =>
          new TableRow({
            children: linha.map((c) => cellTexto(c, { width: colWidth })),
          }),
      ),
    ],
  });
}

function instrumentoLabel(s?: string): string {
  if (!s) return "COPSOQ-II";
  return (s.split(/\s+(?:Versão|—)/i)[0] ?? "").trim() || "COPSOQ-II";
}




// ============== MATRIZ DE RISCO 3x3 ==============

const MATRIZ: Array<{ prob: string; valores: [string, string, string] }> = [
  { prob: "Alta", valores: ["Moderado", "Substancial", "Intolerável"] },
  { prob: "Média", valores: ["Tolerável", "Moderado", "Substancial"] },
  { prob: "Baixa", valores: ["Trivial", "Tolerável", "Moderado"] },
];

function matrizSeveridade(): Table {
  const cabecalho = new TableRow({
    tableHeader: true,
    children: [
      cellTexto("Probabilidade ↓ / Severidade →", { bold: true, width: 25 }),
      cellTexto("Leve", { bold: true, width: 25 }),
      cellTexto("Moderada", { bold: true, width: 25 }),
      cellTexto("Crítica", { bold: true, width: 25 }),
    ],
  });
  const linhas = MATRIZ.map(
    (linha) =>
      new TableRow({
        children: [
          cellTexto(linha.prob, { bold: true, width: 25 }),
          cellTexto(linha.valores[0], { width: 25 }),
          cellTexto(linha.valores[1], { width: 25 }),
          cellTexto(linha.valores[2], { width: 25 }),
        ],
      }),
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [cabecalho, ...linhas],
  });
}

// ============== SEÇÕES ==============

function secaoCapa(rel: RelatorioInput, imagens?: ImagensExportacao): Paragraph[] {
  const c = rel.conteudo;
  const e = c.empresa ?? {};
  const out: Paragraph[] = [];

  const rtsCRP = (c.responsaveis_tecnicos ?? []).filter((rt) =>
    (rt.tipo_conselho ?? "").toUpperCase().includes("CRP"),
  );
  const rtCapa = rtsCRP.length ? rtsCRP : (c.responsaveis_tecnicos ?? []);
  const rtParas: Paragraph[] = rtCapa.length
    ? [
        p("Responsável técnico:", { bold: true }),
        ...rtCapa.map((rt) =>
          p(
            `${rt.nome ?? "—"} — ${[rt.tipo_conselho, rt.uf_conselho, rt.numero_registro]
              .filter(Boolean)
              .join(" ")}`,
          ),
        ),
      ]
    : [];

  if (imagens?.logo && imagens.logo.byteLength > 0) {

    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            type: "png",
            data: imagens.logo,
            transformation: { width: 140, height: 70 },
            altText: {
              title: "Logo",
              description: "Logo da empresa",
              name: "logo",
            },
          }),
        ],
      }),
      pVazio(),
    );
  }

  out.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text:
            "AEP/PGR com ênfase nos fatores de risco psicossocial relacionados ao trabalho",
          bold: true,
          color: NAVY,
        }),
      ],
    }),
    pVazio(),
    rotuloValor("Razão social", e.razao_social ?? "—"),
    rotuloValor("CNPJ", e.cnpj ?? "—"),
    rotuloValor("CNAE", e.cnae ?? "—"),
    rotuloValor(
      "Grau de risco",
      e.grau_risco !== undefined && e.grau_risco !== null
        ? String(e.grau_risco)
        : "—",
    ),
    rotuloValor("Instrumento", instrumentoLabel(c.instrumento)),
    rotuloValor("Data", fmtData(rel.gerado_em)),
    ...rtParas,
    pVazio(),
  );
  return out;
}


function secaoObjetivo(bp: (k: string) => string): Paragraph[] {
  const texto = bp("objetivo");
  return [heading("1. Objetivo", HeadingLevel.HEADING_2), ...paragrafosDe(texto)];
}

function secaoDadosOrganizacao(c: Conteudo): Paragraph[] {
  const e = c.empresa ?? {};
  return [
    heading("2. Dados da organização e enquadramento legal", HeadingLevel.HEADING_2),
    rotuloValor("Empresa", e.razao_social ?? "—"),
    rotuloValor("CNPJ", e.cnpj ?? "—"),
    rotuloValor("CNAE principal", e.cnae ?? "—"),
    rotuloValor("Grau de risco", e.grau_risco != null ? String(e.grau_risco) : "—"),
  ];
}


const INDICADORES_SECAO3 = [
  { chave: "num_empregados_referencia", rotulo: "Número de empregados" },
  { chave: "afastamentos_b31", rotulo: "Afastamentos B31" },
  { chave: "afastamentos_b91", rotulo: "Afastamentos B91" },
  { chave: "taxa_turnover", rotulo: "Turnover (%)" },
];

function secaoIndicadores(c: Conteudo): Array<Paragraph | Table> {
  const out: Array<Paragraph | Table> = [
    heading("3. Indicadores epidemiológicos (últimos 12 meses)", HeadingLevel.HEADING_2),
  ];
  const ind = (c.indicadores ?? {}) as Record<string, unknown>;
  const status = (ind["status_indicadores"] ?? {}) as Record<string, unknown>;
  const linhas = INDICADORES_SECAO3.map(({ chave, rotulo }) => {
    const v = ind[chave];
    return [
      rotulo,
      status[chave] ? String(status[chave]) : "—",
      v === null || v === undefined || v === "" ? "—" : String(v),
    ];
  });
  out.push(tabelaSimples(["Indicador", "Status", "Valor"], linhas));
  const parecer = (ind["parecer_indicadores"] as string | undefined) ?? "";
  if (parecer.trim()) {
    out.push(pVazio(), p("Parecer técnico:", { bold: true }), ...paragrafosDe(parecer));
  }
  return out;
}

function secaoMetodologia(c: Conteudo, bp: (k: string) => string): Array<Paragraph | Table> {
  const out: Array<Paragraph | Table> = [
    heading("4. Metodologia e critérios", HeadingLevel.HEADING_2),
    heading("4.1 Embasamento legal e técnico", HeadingLevel.HEADING_3),
    ...paragrafosDe(bp("metodologia")),
    heading("4.2 Critérios de avaliação de risco (severidade x probabilidade)", HeadingLevel.HEADING_3),
    ...paragrafosDe(bp("criterios_severidade")),
    matrizSeveridade(),
  ];
  const setores = c.setores ?? [];
  const respondentes = setores.reduce((s, x) => s + (x.total_respondentes ?? 0), 0);
  const colaboradores = c.empresa?.qtd_colaboradores_estimado ?? null;
  const pct = colaboradores && colaboradores > 0 ? Math.round((respondentes / colaboradores) * 100) : null;
  out.push(heading("4.2.1 Tamanho amostral e representatividade", HeadingLevel.HEADING_3));
  if (colaboradores && pct !== null) {
    const censo = respondentes >= colaboradores;
    out.push(p(censo
      ? `A empresa conta com ${colaboradores} colaboradores, todos participantes da avaliação, resultando em taxa de participação de ${pct}%. Dessa forma, os resultados representam a percepção de todo o grupo avaliado no momento da aplicação do instrumento, conferindo elevada representatividade aos dados coletados. Considerando o porte da organização, os resultados fornecem subsídios consistentes para a identificação dos fatores organizacionais e psicossociais presentes no ambiente de trabalho, devendo sua interpretação considerar as características específicas das atividades desenvolvidas e da estrutura organizacional avaliada.`
      : `A empresa conta com ${colaboradores} colaboradores, dos quais ${respondentes} participaram da avaliação, resultando em taxa de participação de ${pct}%. Os resultados representam a percepção dos respondentes no momento da aplicação do instrumento e devem ser interpretados como indicativos das tendências do grupo participante, considerando as características específicas das atividades desenvolvidas e da estrutura organizacional avaliada.`));
  } else {
    out.push(p("Número de colaboradores não informado; taxa de participação não pôde ser calculada."));
  }
  out.push(heading("4.2.2 Corte transversal", HeadingLevel.HEADING_3));
  out.push(p(`Esta avaliação representa um retrato do momento da coleta (${c.data_realizacao ? fmtData(c.data_realizacao) : "—"}) e não permite inferências sobre tendências temporais, causalidade ou evolução dos fatores identificados.`));
  return out;
}

function tabelaCargos(cargos: Cargo[]): Table {
  const linhas: string[][] = cargos.map((cg) => [
    cg.nome_funcao ?? "—",
    cg.cbo_codigo ?? "—",
    cg.qtd_colaboradores != null ? String(cg.qtd_colaboradores) : "—",
    cg.carga_horaria ?? "—",
    cg.atividades ?? "—",
  ]);
  return tabelaSimples(
    ["Função", "CBO", "Nº colab.", "CH", "Atividades"],
    linhas,
  );
}

function perguntasTexto(cat?: CatalogoItem): string {
  if (!cat?.perguntas || cat.perguntas.length === 0) return "—";
  return cat.perguntas.map((q) => `Q${q.numero}. ${q.texto}`).join("\n");
}

function tabelaRiscosPrioritarios(
  setor: SetorBlock,
  catalogo: Record<string, CatalogoItem>,
): Table | Paragraph {
  const ORDEM_PGR = ["intoleravel", "substancial", "moderado", "toleravel", "trivial"];
  const prioritarios = (setor.resultado ?? [])
    .filter((r) => ORDEM_PGR.includes(r.classificacao_pgr))
    .sort((a, b) => ORDEM_PGR.indexOf(a.classificacao_pgr) - ORDEM_PGR.indexOf(b.classificacao_pgr));
  if (prioritarios.length === 0) {
    return p("Nenhuma subescala classificada neste setor.");
  }
  const cabecalhos = [
    "Subescala",
    "Perguntas relacionadas",
    "Nível",
    "O que significa",
    "Possíveis agravos",
  ];
  const cabecalhoRow = new TableRow({
    tableHeader: true,
    children: cabecalhos.map((h) => cellTexto(h, { bold: true, width: 20 })),
  });
  const linhas = prioritarios.map((r) => {
    const cat = catalogo[r.subescala_id];
    const perguntas = (cat?.perguntas ?? []).length
      ? (cat?.perguntas ?? []).map(
          (q) =>
            new Paragraph({
              children: [new TextRun({ text: `Q${q.numero}. ${q.texto}` })],
            }),
        )
      : [p("—")];
    return new TableRow({
      children: [
        cellTexto(r.nome, { width: 20 }),
        cell(perguntas, { width: 20 }),
        cellTexto(PGR_LABEL[r.classificacao_pgr] ?? r.classificacao_pgr, {
          width: 20,
        }),
        cellTexto(cat?.significado ?? "—", { width: 20 }),
        cellTexto(cat?.agravos ?? "—", { width: 20 }),
      ],
    });
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [cabecalhoRow, ...linhas],
  });
}

function tabelaSemaforo(setor: SetorBlock): Table | Paragraph {
  const resultado = setor.resultado ?? [];
  if (resultado.length === 0) {
    return p("Sem dados de subescalas para este setor.");
  }
  const linhas = resultado.map((r) => [
    r.nome,
    fmtPct(r.pct_risco),
    fmtPct(r.pct_atencao),
    fmtPct(r.pct_favoravel),
  ]);
  return tabelaSimples(
    ["Subescala", "% risco", "% atenção", "% favorável"],
    linhas,
  );
}

function secaoInventarioPorSetor(
  c: Conteudo,
  bp: (k: string) => string,
  imagens?: ImagensExportacao,
): Array<Paragraph | Table> {
  const out: Array<Paragraph | Table> = [
    heading("5. Inventário de risco (por setor)", HeadingLevel.HEADING_2),
    ...paragrafosDe(bp("inventario_intro")),
  ];
  const setores = c.setores ?? [];
  const catalogo = c.catalogo ?? {};
  if (setores.length === 0) {
    out.push(p("Nenhum setor informado."));
    return out;
  }
  for (const setor of setores) {
    out.push(heading(`Setor: ${setor.nome}`, HeadingLevel.HEADING_3));
    out.push(
      p(
        `${setor.total_respondentes ?? 0} respondente${
          (setor.total_respondentes ?? 0) === 1 ? "" : "s"
        }`,
      ),
    );
    if (setor.bloqueado) {
      out.push(
        p("Setor com menos de 5 respondentes — não segmentado (LGPD)."),
      );
      continue;
    }
    const cargos = setor.cargos ?? [];
    if (cargos.length > 0) {
      out.push(pVazio());
      out.push(p("Cargos / funções", { bold: true }));
      out.push(tabelaCargos(cargos));
    }
    out.push(pVazio());
    out.push(p("Classificação de risco por subescala", { bold: true }));
    out.push(tabelaRiscosPrioritarios(setor, catalogo));
    out.push(pVazio());
    out.push(p("Semáforo (% por subescala)", { bold: true }));
    out.push(tabelaSemaforo(setor));
    const semaforoImg = imagens?.semaforos?.[setor.setor_id];
    if (semaforoImg && semaforoImg.byteLength > 0) {
      out.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              type: "png",
              data: semaforoImg,
              transformation: { width: 520, height: 360 },
              altText: {
                title: `Semáforo ${setor.nome}`,
                description: `Gráfico semáforo do setor ${setor.nome}`,
                name: `semaforo-${setor.setor_id}`,
              },
            }),
          ],
        }),
      );
    }
  }
  return out;
}

function secaoAnaliseIntegrada(c: Conteudo, bp: (k: string) => string): Paragraph[] {
  const out: Paragraph[] = [
    heading("6. Análise integrada por setor", HeadingLevel.HEADING_2),
  ];
  const setores = c.setores ?? [];
  if (setores.length === 0) { out.push(p("Nenhum setor informado.")); return out; }
  const um = setores.length === 1;
  const H = um ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_4;
  setores.forEach((setor, idx) => {
    const r = setor.resultado ?? [];
    if (!um) out.push(heading(`6.${idx + 1} Setor: ${setor.nome}`, HeadingLevel.HEADING_3));
    out.push(heading(um ? "6.1 Fatores protetores" : "Fatores protetores", H));
    out.push(listaFatores(nomesPorClasse(r, ["trivial"])));
    out.push(heading(um ? "6.2 Fatores de atenção" : "Fatores de atenção", H));
    const tol = nomesPorClasse(r, ["toleravel"]);
    const mod = nomesPorClasse(r, ["moderado"]);
    out.push(p("Em nível tolerável: " + (tol.length ? tol.join(", ") + "." : "nenhum.")));
    out.push(p("Em nível moderado: " + (mod.length ? mod.join(", ") + "." : "nenhum.")));
    out.push(heading(um ? "6.3 Fatores que exigem intervenção" : "Fatores que exigem intervenção", H));
    out.push(listaFatores(nomesPorClasse(r, ["substancial", "intoleravel"])));
    out.push(heading(um ? "6.3.1 Análise dos fatores que exigem intervenção" : "Análise", H));
    const analise = (setor.analise ?? "").trim();
    if (setor.gerado_por_ia && analise) {
      out.push(new Paragraph({ children: [new TextRun({
        text: "(Análise sugerida por IA — pendente de revisão e aprovação do responsável técnico.)",
        italics: true, color: "ED7D6E" })] }));
      out.push(...paragrafosDeCor(analise, "ED7D6E"));
    } else if (analise) {
      out.push(...paragrafosDe(analise));
    } else {
      out.push(p("Análise não preenchida para este setor."));
    }
    out.push(...disclaimer14457(r, bp));
    out.push(pVazio());
  });
  out.push(pVazio());
  out.push(p("Aviso clínico:", { bold: true }));
  out.push(...paragrafosDe(bp("aviso_clinico")));
  return out;
}


const PRIORIDADE_POR_NIVEL: Record<string, string> = {
  intoleravel: "A - Alta",
  substancial: "M - Média",
};

const PRAZO_POR_NIVEL: Record<string, string> = {
  intoleravel: "Imediato a 90 dias",
  substancial: "Imediato a 120 dias",
};

function tabelaPlanoAcao(
  acoes: AcaoPlano[],
  catalogo: Record<string, CatalogoItem>,
): Table {
  const NIVEL_LABEL: Record<string, string> = {
    intoleravel: "Intolerável",
    substancial: "Substancial",
    moderado: "Moderado",
    toleravel: "Tolerável",
    trivial: "Trivial",
  };

  const cabecalhos = [
    "Ord.", "Risco", "Nível de risco", "Ação", "Meta", "Prioridade", "Sit.",
    "Planejado início", "Planejado término",
    "Realizado início", "Realizado término", "Responsável",
  ];
  const cabecalhoRow = new TableRow({
    tableHeader: true,
    children: cabecalhos.map((h) => cellTexto(h, { bold: true })),
  });
  const linhas = acoes.map((a, i) => {
    const nivel = (a.nivel_risco_origem ?? "").toLowerCase();
    const acaoTexto = a.o_que ?? "—";
    const termino = a.prazo ? fmtDataCurta(a.prazo) : (PRAZO_POR_NIVEL[nivel] ?? "—");
    return new TableRow({
      children: [
        cellTexto(String(i + 1)),
        cellTexto(catalogo[a.subescala_id]?.nome ?? "—"),
        cellTexto(NIVEL_LABEL[nivel] ?? (a.nivel_risco_origem ?? "—")),
        cellTexto(acaoTexto),
        cellTexto(a.por_que ?? "—"),
        cellTexto(PRIORIDADE_POR_NIVEL[nivel] ?? "—"),
        cellTexto(a.status ? (STATUS_LABEL[a.status] ?? a.status) : "A"),
        cellTexto("Imediato"),
        cellTexto(termino),
        cellTexto("—"),
        cellTexto("—"),
        cellTexto(a.responsavel ?? "—"),
      ],
    });
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [cabecalhoRow, ...linhas],
  });
}


function secaoPlanoAcao(c: Conteudo, bp: (k: string) => string): Array<Paragraph | Table> {
  const out: Array<Paragraph | Table> = [
    heading("7. Prioridades de intervenção e direcionamento de ação (PGR)", HeadingLevel.HEADING_2),
    heading("7.1 Critério de priorização das medidas de controle", HeadingLevel.HEADING_3),
  ];
  const criterio = bp("criterio_priorizacao");
  if (criterio && criterio.trim()) {
    out.push(...paragrafosDe(criterio));
  } else {
    out.push(p("A priorização das medidas de controle seguiu o nível de risco da Matriz 3x3. Receberam prioridade de intervenção os fatores classificados como Intolerável e Substancial. Fatores Moderados e Toleráveis são tratados de forma complementar; os Triviais permanecem sob monitoramento periódico."));
  }
  out.push(pVazio());
  out.push(heading("7.2 Plano de ação", HeadingLevel.HEADING_3));
  const acoes = c.plano_acao ?? [];
  const catalogo = c.catalogo ?? {};
  if (acoes.length === 0) {
    out.push(p("Nenhuma ação cadastrada."));
    return out;
  }
  const porSetor = new Map<string, AcaoPlano[]>();
  for (const a of acoes) {
    const chave = (a.setor_nome ?? "").trim() || "Geral";
    const lista = porSetor.get(chave) ?? [];
    lista.push(a);
    porSetor.set(chave, lista);
  }
  for (const [setorNome, listaSetor] of porSetor) {
    out.push(heading(`Setor: ${setorNome}`, HeadingLevel.HEADING_3));
    out.push(tabelaPlanoAcao(listaSetor, catalogo));
    out.push(pVazio());
  }
  out.push(p("Legenda — Situação: A Aberta · E Em execução · C Concluída · S Suspensa · P Pendente de aprovação. Prazo recomendado: Intolerável imediato a 90 dias; Substancial imediato a 120 dias."));
  return out;
}

function secaoDiscussao(bp: (k: string) => string): Paragraph[] {
  return [
    heading("8. Discussão", HeadingLevel.HEADING_2),
    ...paragrafosDe(bp("discussao")),
  ];
}


function secaoResponsaveisTecnicos(c: Conteudo): Paragraph[] {
  const out: Paragraph[] = [
    heading("9. Responsáveis técnicos", HeadingLevel.HEADING_2),
  ];
  const rts = c.responsaveis_tecnicos ?? [];
  if (rts.length === 0) {
    out.push(p("—"));
    return out;
  }
  for (const rt of rts) {
    out.push(p(rt.nome ?? "—", { bold: true }));
    const conselho = [rt.tipo_conselho, rt.uf_conselho, rt.numero_registro]
      .filter(Boolean)
      .join(" ");
    if (conselho) out.push(p(conselho));
    if (rt.papel) out.push(p(rt.papel));
    out.push(pVazio());
    out.push(p("_____________________________________________"));
    out.push(p("Assinatura"));
    out.push(pVazio());
  }
  return out;
}

// ============== EXPORT ==============

export async function exportarRelatorioDocx(
  rel: RelatorioInput,
  imagens?: ImagensExportacao,
): Promise<void> {
  const c = rel.conteudo ?? {};
  const bp = bpHelper(c);

  const children: Array<Paragraph | Table> = [
    ...secaoCapa(rel, imagens),
    pVazio(),
    ...secaoObjetivo(bp),
    pVazio(),
    ...secaoDadosOrganizacao(c),

    pVazio(),
    ...secaoIndicadores(c),
    pVazio(),
    ...secaoMetodologia(c, bp),
    pVazio(),
    ...secaoInventarioPorSetor(c, bp, imagens),
    pVazio(),
    ...secaoAnaliseIntegrada(c, bp),
    pVazio(),
    ...secaoPlanoAcao(c, bp),
    pVazio(),
    ...secaoDiscussao(bp),
    pVazio(),
    ...secaoResponsaveisTecnicos(c),
  ];

  const doc = new Document({
    creator: "Avanti HR",
    title: `Laudo NR-1 v${rel.versao}`,
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22 } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `laudo-nr1-v${rel.versao}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}