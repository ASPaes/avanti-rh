import {
  AlignmentType,
  BorderStyle,
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

export type BoilerplateItem = { chave: string; titulo?: string; corpo: string; ordem?: number };

export type Cargo = {
  nome_funcao?: string;
  cbo_codigo?: string;
  qtd_colaboradores?: number | null;
  carga_horaria?: string | null;
  atividades?: string | null;
};

export type SubescalaResultado = {
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

export type SetorBlock = {
  setor_id: string;
  nome: string;
  descricao?: string | null;
  qtd_colaboradores_estimado?: number | null;
  cargos?: Cargo[];
  bloqueado?: boolean;
  total_respondentes?: number;
  resultado?: SubescalaResultado[];
  analises?: Array<{ dimensao: string; texto: string | null; gerado_por_ia: boolean }>;
};


export type CatalogoItem = {
  nome?: string;
  codigo?: string;
  severidade?: string;
  significado?: string;
  agravos?: string;
  acoes_pgr?: string;
  catalogo_status?: string;
  perguntas?: { numero: number; texto: string }[];
};

export type Empresa = {
  razao_social?: string;
  nome_fantasia?: string;
  cnpj?: string;
  cnae?: string;
  cnae_descricao?: string | null;
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

export type AcaoPlano = {
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

export type RespTec = {
  nome?: string;
  tipo_conselho?: string;
  uf_conselho?: string;
  numero_registro?: string;
  papel?: string;
};

export type Conteudo = {
  instrumento?: string;
  gerado_em?: string;
  logo_url?: string;
  tenant?: { razao_social?: string | null; nome_fantasia?: string | null };
  boilerplate?: BoilerplateItem[];
  empresa?: Empresa;
  setores?: SetorBlock[];
  resultado_global?: SubescalaResultado[];
  catalogo?: Record<string, CatalogoItem>;
  indicadores?: Record<string, unknown> | null;
  plano_acao?: AcaoPlano[];
  responsaveis_tecnicos?: RespTec[];
  data_realizacao?: string;
  analises_consolidado?: Array<{ dimensao: string; texto: string | null; gerado_por_ia: boolean }>;
};

export type RelatorioInput = {
  versao: number;
  versao_documento?: string | null;
  status: string;
  gerado_em: string;
  conteudo: Conteudo;
};


export type ImagensExportacao = {
  logo?: Uint8Array;
  semaforos?: Record<string, Uint8Array>;
};

// ============== HELPERS ==============

export const NAVY = "234A6E";

export const PGR_LABEL: Record<string, string> = {
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

export function fmtData(s?: string | null): string {
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

export function fmtDataCurta(s?: string | null): string {
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

export function fmtPct(n?: number): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

export function cnaeLabel(e: { cnae?: string; cnae_descricao?: string | null }): string {
  if (!e.cnae) return "—";
  return e.cnae_descricao ? `${e.cnae} - ${e.cnae_descricao}` : e.cnae;
}


export function bpHelper(conteudo: Conteudo) {
  return (chave: string): string => {
    return conteudo.boilerplate?.find((b) => b.chave === chave)?.corpo ?? "";
  };
}

export function p(text: string, opts?: { bold?: boolean; size?: number }): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 120 },
    children: [
      new TextRun({
        text,
        bold: opts?.bold,
        size: opts?.size,
      }),
    ],
  });
}

export function pVazio(): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: "" })] });
}

function runsBold(linha: string): TextRun[] {
  return linha.split("**").map((parte, i) => new TextRun({ text: parte, bold: i % 2 === 1 }));
}

export function paragrafosDe(text?: string): Paragraph[] {
  if (!text || !text.trim()) return [];
  return text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((linha) => new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 120 }, children: runsBold(linha) }));
}

export function paragrafosDeCor(text: string | undefined, cor: string): Paragraph[] {
  if (!text || !text.trim()) return [];
  return text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(
      (linha) =>
        new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 120 }, children: [new TextRun({ text: linha, color: cor })] }),
    );
}

export function nomesPorClasse(resultado: SubescalaResultado[], classes: string[]): string[] {
  return resultado
    .filter((r) => classes.includes((r.classificacao_pgr ?? "").toLowerCase()))
    .map((r) => r.nome);
}

export function listaFatores(nomes: string[]): Paragraph {
  return p(nomes.length ? nomes.join(", ") + "." : "Nenhum fator classificado neste nível.");
}

export function disclaimer14457(resultado: SubescalaResultado[]): Paragraph[] {
  const cos = resultado.filter((r) => (r.nome ?? "").toLowerCase().includes("ofensiv"));
  if (!cos.length) return [];
  const temPositivo = cos.some((co) => (co.pct_risco ?? 0) > 0 || (co.pct_atencao ?? 0) > 0);
  const textoLegal =
    "EXPOSIÇÃO A COMPORTAMENTOS OFENSIVOS NO TRABALHO — assédio moral, assédio sexual, ameaças e violência física ou verbal. DISCLAIMER LEGAL — Lei nº 14.457/2022 (Programa Emprega + Mulheres): foram identificadas respostas positivas a itens de violência e/ou assédio. Independentemente da magnitude estatística, a legislação obriga as empresas com CIPA a (i) instituir canal de denúncia que garanta o anonimato e proteja o(a) denunciante; (ii) estabelecer procedimentos de apuração com sigilo e imparcialidade; (iii) aplicar sanções administrativas aos responsáveis; e (iv) promover ações de capacitação e sensibilização sobre prevenção e combate ao assédio sexual e demais formas de violência, incluindo o tema na política formal da organização e nos treinamentos da CIPA. A presença de qualquer relato exige resposta institucional imediata.";
  const textoPreventivo =
    "Em relação ao fator Comportamentos Ofensivos, embora não tenham sido relatadas situações pela amostra, este fator é mantido em nível moderado como medida de vigilância preventiva, conforme a lógica de classificação do instrumento. Dessa forma, o resultado deve ser interpretado como um alerta para acompanhamento contínuo e promoção de um ambiente de trabalho respeitoso, e não como indicação da ocorrência efetiva de assédio, discriminação ou violência ocupacional.";
  const texto = temPositivo ? textoLegal : textoPreventivo;
  return [pVazio(), new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: texto, bold: temPositivo })] })];
}


export function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]): Paragraph {
  const txt = level === HeadingLevel.HEADING_2 ? text.toUpperCase() : text;
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text: txt, bold: true, color: NAVY })],
  });
}

export function rotuloValor(rotulo: string, valor: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${rotulo}: `, bold: true }),
      new TextRun({ text: valor }),
    ],
  });
}

function rotuloValorEmpresa(rotulo: string, nome: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${rotulo}: `, bold: true }),
      new TextRun({ text: nome.toUpperCase(), bold: true }),
    ],
  });
}

export function cell(children: Paragraph[], opts?: { bold?: boolean; width?: number; fill?: string }): TableCell {
  return new TableCell({
    width: opts?.width
      ? { size: opts.width, type: WidthType.PERCENTAGE }
      : undefined,
    shading: opts?.fill ? { type: ShadingType.CLEAR, color: "auto", fill: opts.fill } : undefined,
    children,
  });
}

export function cellTexto(texto: string, opts?: { bold?: boolean; width?: number; fill?: string }): TableCell {
  return cell(
    [
      new Paragraph({
        children: [new TextRun({ text: texto, bold: opts?.bold })],
      }),
    ],
    opts,
  );
}

export function caixaDestaque(titulo: string, paragrafos: Paragraph[]): Table {
  const CORAL = "ED7D6E";
  const conteudo: Paragraph[] = [
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: titulo, bold: true, color: CORAL })],
    }),
    ...paragrafos,
  ];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.SINGLE, size: 24, color: CORAL },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, color: "auto", fill: "FFF6F4" },
            margins: { top: 100, bottom: 100, left: 150, right: 150 },
            children: conteudo,
          }),
        ],
      }),
    ],
  });
}

export function tabelaSimples(
  cabecalhos: string[],
  linhas: string[][],
  larguras?: number[],
): Table {
  const w = (i: number) =>
    larguras?.[i] ?? Math.floor(100 / Math.max(cabecalhos.length, 1));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: cabecalhos.map((h, i) => cellTexto(h, { bold: true, width: w(i) })),
      }),
      ...linhas.map(
        (linha) =>
          new TableRow({
            children: linha.map((c, i) => cellTexto(c, { width: w(i) })),
          }),
      ),
    ],
  });
}

export function instrumentoLabel(s?: string): string {
  if (!s) return "COPSOQ-II";
  return (s.split(/\s+(?:Versão|—)/i)[0] ?? "").trim() || "COPSOQ-II";
}




// ============== MATRIZ DE RISCO 3x3 ==============

const MATRIZ: Array<{ prob: string; valores: [string, string, string] }> = [
  { prob: "Alta", valores: ["Moderado", "Substancial", "Intolerável"] },
  { prob: "Média", valores: ["Tolerável", "Moderado", "Substancial"] },
  { prob: "Baixa", valores: ["Trivial", "Tolerável", "Moderado"] },
];

const MATRIZ_FILL: Record<string, string> = {
  Trivial: "90B0D8",
  Tolerável: "C0D0A0",
  Moderado: "F8E0A0",
  Substancial: "E8B088",
  Intolerável: "E07068",
};

export function matrizSeveridade(): Table {
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
          cellTexto(linha.valores[0], { width: 25, fill: MATRIZ_FILL[linha.valores[0]] }),
          cellTexto(linha.valores[1], { width: 25, fill: MATRIZ_FILL[linha.valores[1]] }),
          cellTexto(linha.valores[2], { width: 25, fill: MATRIZ_FILL[linha.valores[2]] }),
        ],
      }),
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [cabecalho, ...linhas],
  });
}

// ============== SEÇÕES ==============

export function secaoCapa(rel: RelatorioInput, imagens?: ImagensExportacao): Paragraph[] {
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
            `${rt.nome ?? "—"} — ${[
              [rt.tipo_conselho, rt.uf_conselho].filter(Boolean).join("-"),
              rt.numero_registro,
            ]
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
            "AEP/PGR COM ÊNFASE NOS FATORES DE RISCO PSICOSSOCIAL RELACIONADOS AO TRABALHO",
          bold: true,
          color: NAVY,
        }),
      ],
    }),
    pVazio(),
    rotuloValorEmpresa("Razão social", e.razao_social ?? "—"),
    rotuloValor("CNPJ", e.cnpj ?? "—"),
    rotuloValor("CNAE", cnaeLabel(e)),
    rotuloValor(
      "Grau de risco",
      e.grau_risco !== undefined && e.grau_risco !== null
        ? String(e.grau_risco)
        : "—",
    ),
    rotuloValor("Instrumento", instrumentoLabel(c.instrumento)),
    rotuloValor("Data", fmtDataCurta(rel.gerado_em)),
    rotuloValor("Versão do documento", rel.versao_documento ?? "—"),

    ...rtParas,
    pVazio(),
  );
  return out;
}


export function secaoObjetivo(bp: (k: string) => string): Paragraph[] {
  const texto = bp("objetivo");
  return [heading("1. Objetivo", HeadingLevel.HEADING_2), ...paragrafosDe(texto)];
}

export function secaoDadosOrganizacao(c: Conteudo): Paragraph[] {
  const e = c.empresa ?? {};
  return [
    heading("2. Dados da organização e enquadramento legal", HeadingLevel.HEADING_2),
    rotuloValorEmpresa("Empresa", e.razao_social ?? "—"),
    rotuloValor("CNPJ", e.cnpj ?? "—"),
    rotuloValor("CNAE principal", cnaeLabel(e)),
    rotuloValor("Grau de risco", e.grau_risco != null ? String(e.grau_risco) : "—"),
    ...(e.area_atuacao && e.area_atuacao.trim()
      ? [pVazio(), p("Caracterização da empresa", { bold: true }), ...paragrafosDe(e.area_atuacao)]
      : []),
  ];
}


export const INDICADORES_SECAO3 = [
  { chave: "num_empregados_referencia", rotulo: "Número de empregados" },
  { chave: "afastamentos_b31", rotulo: "Afastamentos B31" },
  { chave: "afastamentos_b91", rotulo: "Afastamentos B91" },
  { chave: "taxa_turnover", rotulo: "Turnover (%)" },
];

export function secaoIndicadores(c: Conteudo): Array<Paragraph | Table> {
  const out: Array<Paragraph | Table> = [
    heading("3. Indicadores epidemiológicos (últimos 12 meses)", HeadingLevel.HEADING_2),
  ];
  const ind = (c.indicadores ?? {}) as Record<string, unknown>;
  const status = (ind["status_indicadores"] ?? {}) as Record<string, unknown>;
  const linhas = INDICADORES_SECAO3.map(({ chave, rotulo }) => {
    const v = ind[chave];
    return [
      rotulo,
      v === null || v === undefined || v === "" ? "—" : String(v),
      status[chave] ? String(status[chave]) : "—",
    ];
  });
  out.push(tabelaSimples(["Indicador", "Valor", "Status"], linhas, [50, 25, 25]));
  const parecer = (ind["parecer_indicadores"] as string | undefined) ?? "";
  if (parecer.trim()) {
    out.push(pVazio(), p("Parecer técnico:", { bold: true }), ...paragrafosDe(parecer));
  }
  return out;
}

export function secaoMetodologia(c: Conteudo, bp: (k: string) => string): Array<Paragraph | Table> {
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
  out.push(heading("4.2.1 Método de coleta de dados, tamanho amostral e representatividade", HeadingLevel.HEADING_3));
  if (colaboradores && pct !== null) {
    const censo = respondentes >= colaboradores;
    out.push(p(censo
      ? `A empresa conta com ${colaboradores} colaboradores, todos participantes da avaliação, resultando em taxa de participação de ${pct}%. Dessa forma, os resultados representam a percepção de todo o grupo avaliado no momento da aplicação do instrumento, conferindo elevada representatividade aos dados coletados. Considerando o porte da organização, os resultados fornecem subsídios consistentes para a identificação dos fatores organizacionais e psicossociais presentes no ambiente de trabalho, devendo sua interpretação considerar as características específicas das atividades desenvolvidas e da estrutura organizacional avaliada.`
      : `A empresa conta com ${colaboradores} colaboradores, dos quais ${respondentes} participaram da avaliação, resultando em taxa de participação de ${pct}%. Os resultados representam a percepção dos respondentes no momento da aplicação do instrumento e devem ser interpretados como indicativos das tendências do grupo participante, considerando as características específicas das atividades desenvolvidas e da estrutura organizacional avaliada.`));
  } else {
    out.push(p("Número de colaboradores não informado; taxa de participação não pôde ser calculada."));
  }
  out.push(new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 120 },
    children: [
      new TextRun({ text: "A coleta de dados foi realizada por meio de " }),
      new TextRun({ text: "XXXX", color: "FF0000" }),
      new TextRun({ text: " aplicado de forma de " }),
      new TextRun({ text: "XXXX", color: "FF0000" }),
      new TextRun({ text: ", após uma apresentação " }),
      new TextRun({ text: "XXXX", color: "FF0000" }),
      new TextRun({ text: " que abordou aspectos conceituais da atualização da NR-01, com ênfase na exigência de avaliação dos riscos psicossociais, nos papéis e responsabilidades da empresa e dos colaboradores, bem como em conceitos relacionados à saúde mental, em caráter de sensibilização. Nessa oportunidade, foi reforçado que a participação seria voluntária, assegurando o sigilo da identidade dos participantes, o anonimato das respostas e a proteção dos dados coletados." }),
    ],
  }));
  out.push(heading("4.2.2 Corte transversal", HeadingLevel.HEADING_3));
  out.push(p(`Esta avaliação representa um retrato do momento da coleta (${c.data_realizacao ? fmtData(c.data_realizacao) : "—"}) e não permite inferências sobre tendências temporais, causalidade ou evolução dos fatores identificados.`));
  return out;
}

export function tabelaCargos(cargos: Cargo[]): Table {
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
    [22, 12, 10, 11, 45],
  );
}

export function perguntasTexto(cat?: CatalogoItem): string {
  if (!cat?.perguntas || cat.perguntas.length === 0) return "—";
  return cat.perguntas.map((q) => `Q${q.numero}. ${q.texto}`).join("\n");
}

export const PGR_FILL: Record<string, string> = {
  trivial: "90B0D8",
  toleravel: "C0D0A0",
  moderado: "F8E0A0",
  substancial: "E8B088",
  intoleravel: "E07068",
};

export const PROB_LABEL: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };

const GRAV_LABEL: Record<string, string> = { critica: "Crítica", moderada: "Moderada", leve: "Leve" };

export function tabelaRiscosPrioritarios(
  setor: SetorBlock,
  catalogo: Record<string, CatalogoItem>,
  rotuloPrimeiraColuna: string = "RISCO",
): Table | Paragraph {
  const CLASSES = ["intoleravel", "substancial", "moderado", "toleravel", "trivial"];

  // mantém a ordem natural do resultado (RPC já devolve order by ordem); NÃO reordenar por risco
  const linhasResultado = (setor.resultado ?? []).filter((r) =>
    CLASSES.includes(r.classificacao_pgr),
  );

  if (linhasResultado.length === 0) {
    return p("Nenhuma subescala classificada neste setor.");
  }

  const cabecalhos = [
    rotuloPrimeiraColuna,
    "CLASS. SEVERIDADE",
    "PERGUNTAS RELACIONADAS AO FATOR",
    "CIRCUNSTÂNCIA",
    "CONSEQUÊNCIA",
    "PROB.",
    "GRAV.",
  ];

  const larguras = [13, 10, 21, 15, 29, 6, 6];

  const cabecalhoRow = new TableRow({
    tableHeader: true,
    children: cabecalhos.map((h, i) => cellTexto(h, { bold: true, width: larguras[i] })),
  });

  const linhas = linhasResultado.map((r) => {
    const cat = catalogo[r.subescala_id];
    const perguntas = (cat?.perguntas ?? []).length
      ? (cat?.perguntas ?? []).map(
          (q) => new Paragraph({ children: [new TextRun({ text: `Q${q.numero}. ${q.texto}` })] }),
        )
      : [p("—")];
    return new TableRow({
      children: [
        cellTexto(r.nome, { width: larguras[0] }),
        cellTexto(PGR_LABEL[r.classificacao_pgr] ?? r.classificacao_pgr, {
          width: larguras[1],
          fill: PGR_FILL[r.classificacao_pgr],
        }),
        cell(perguntas, { width: larguras[2] }),
        cellTexto(cat?.significado ?? "—", { width: larguras[3] }),
        cellTexto(cat?.agravos ?? "—", { width: larguras[4] }),
        cellTexto(PROB_LABEL[r.probabilidade ?? ""] ?? "—", { width: larguras[5] }),
        cellTexto(
          GRAV_LABEL[r.severidade ?? ""] ?? GRAV_LABEL[(cat?.severidade as string) ?? ""] ?? "—",
          { width: larguras[6] },
        ),
      ],
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [cabecalhoRow, ...linhas],
  });
}

export const SEMAFORO_FILL = { risco: "E07068", atencao: "F8E0A0", favoravel: "C0D0A0" };

export function tabelaSemaforo(setor: SetorBlock): Table | Paragraph {
  const resultado = setor.resultado ?? [];
  if (resultado.length === 0) {
    return p("Sem dados de subescalas para este setor.");
  }

  const colW = [40, 20, 20, 20];

  const cabecalhoRow = new TableRow({
    tableHeader: true,
    children: [
      cellTexto("Subescala", { bold: true, width: colW[0] }),
      cellTexto("% risco", { bold: true, width: colW[1] }),
      cellTexto("% atenção", { bold: true, width: colW[2] }),
      cellTexto("% favorável", { bold: true, width: colW[3] }),
    ],
  });

  const linhas = resultado.map(
    (r) =>
      new TableRow({
        children: [
          cellTexto(r.nome, { width: colW[0] }),
          cellTexto(fmtPct(r.pct_risco), { width: colW[1], fill: SEMAFORO_FILL.risco }),
          cellTexto(fmtPct(r.pct_atencao), { width: colW[2], fill: SEMAFORO_FILL.atencao }),
          cellTexto(fmtPct(r.pct_favoravel), { width: colW[3], fill: SEMAFORO_FILL.favoravel }),
        ],
      }),
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [cabecalhoRow, ...linhas],
  });
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
      continue;
    }
    const cargos = setor.cargos ?? [];
    if (cargos.length > 0) {
      out.push(pVazio());
      out.push(p("Cargos / funções", { bold: true }));
      out.push(tabelaCargos(cargos));
    }
    out.push(pVazio());
    out.push(p("Resultados aplicando a matriz 3x3", { bold: true }));
    out.push(tabelaRiscosPrioritarios(setor, catalogo));
  }
  return out;
}

const DIMENSAO_ORDEM_DOCX = [
  "demandas", "organizacao", "relacoes", "valores",
  "personalidade", "interface", "saude", "comportamentos",
];

const DIMENSAO_LABELS_DOCX: Record<string, string> = {
  demandas: "Exigências laborais",
  organizacao: "Organização do trabalho e conteúdo",
  relacoes: "Relações sociais e liderança",
  valores: "Valores no local de trabalho",
  personalidade: "Personalidade",
  interface: "Interface trabalho-indivíduo",
  saude: "Saúde e bem-estar",
  comportamentos: "Comportamentos ofensivos",
};

export type AnaliseDimensaoItem = { dimensao: string; texto: string | null; gerado_por_ia: boolean };

export function textoAnalise(item?: AnaliseDimensaoItem): Paragraph[] {
  const texto = (item?.texto ?? "").trim();
  if (!texto) return [p("Análise pendente de preenchimento.")];
  if (item?.gerado_por_ia) {
    return [
      new Paragraph({
        children: [
          new TextRun({
            text: "(Análise sugerida por IA — pendente de revisão e aprovação do responsável técnico.)",
            italics: true,
            color: "ED7D6E",
          }),
        ],
      }),
      ...paragrafosDeCor(texto, "ED7D6E"),
    ];
  }
  return paragrafosDe(texto);
}

export function citacaoNormativa(resultado: SubescalaResultado[]): Paragraph[] {
  const temPrioritario = resultado.some((r) =>
    ["substancial", "intoleravel"].includes((r.classificacao_pgr ?? "").toLowerCase()),
  );
  if (!temPrioritario) return [];
  return [
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 60, after: 120 },
      children: [
        new TextRun({
          text: "Os fatores classificados como Substancial ou Intolerável determinam a necessidade de adoção ou manutenção de medidas de prevenção e a elaboração de plano de ação, nos termos dos subitens 1.5.4.4.3 e 1.5.5.2.1 da NR-1. Recomenda-se que as medidas observem as diretrizes de boas práticas da ISO 45003:2021 (gestão de riscos psicossociais relacionados ao trabalho).",
          italics: true,
        }),
      ],
    }),
  ];
}

export function fatoresDoNivel(resultado: SubescalaResultado[], nivel: string): string[] {
  return resultado
    .filter((r) => (r.classificacao_pgr ?? "").toLowerCase() === nivel)
    .map((r) => {
      return r.nome;
    });
}

export function mapaBucket(
  analises: Array<{ dimensao: string; texto: string | null; gerado_por_ia: boolean }>,
): Map<string, AnaliseDimensaoItem> {
  const m = new Map<string, AnaliseDimensaoItem>();
  for (const a of analises) m.set(a.dimensao, a);
  return m;
}

export function nivelComAnalise(
  resultado: SubescalaResultado[],
  porBucket: Map<string, AnaliseDimensaoItem>,
  nivel: string,
  titulo: string | null,
  Hsub: (typeof HeadingLevel)[keyof typeof HeadingLevel],
): Paragraph[] {
  const fatores = fatoresDoNivel(resultado, nivel);
  if (!fatores.length) return [];
  const out: Paragraph[] = [];
  if (titulo) out.push(heading(titulo, Hsub));
  out.push(p(fatores.join("; ") + "."));
  out.push(...textoAnalise(porBucket.get(nivel)));
  const rowsNivel = resultado.filter((r) => (r.classificacao_pgr ?? "").toLowerCase() === nivel);
  out.push(...disclaimer14457(rowsNivel));
  return out;
}

function blocosNiveis(
  resultado: SubescalaResultado[],
  analises: Array<{ dimensao: string; texto: string | null; gerado_por_ia: boolean }>,
  numerado: boolean,
  Htop: (typeof HeadingLevel)[keyof typeof HeadingLevel],
  Hsub: (typeof HeadingLevel)[keyof typeof HeadingLevel],
): Paragraph[] {
  const m = mapaBucket(analises);
  const out: Paragraph[] = [];
  out.push(heading(numerado ? "6.1 Fatores protetores" : "Fatores protetores", Htop));
  out.push(p("Enquadram-se nesta categoria os fatores classificados como Trivial na matriz de risco, cujos resultados indicam condições favoráveis percebidas pelos trabalhadores e a presença de recursos psicossociais consolidados no ambiente laboral. Esses fatores atuam como elementos protetivos, contribuindo para a manutenção da saúde, do bem-estar e da capacidade de enfrentamento das demandas inerentes ao trabalho."));
  const trivial = nivelComAnalise(resultado, m, "trivial", null, Hsub);
  if (trivial.length) out.push(...trivial);
  else out.push(p("Nenhum fator classificado como Trivial."));
  out.push(heading(numerado ? "6.2 Fatores de atenção" : "Fatores de atenção", Htop));
  const tol = nivelComAnalise(resultado, m, "toleravel", "Em nível tolerável", Hsub);
  const mod = nivelComAnalise(resultado, m, "moderado", "Em nível moderado", Hsub);
  if (tol.length) out.push(...tol);
  if (mod.length) out.push(...mod);
  if (!tol.length && !mod.length) out.push(p("Nenhum fator classificado como Tolerável ou Moderado."));
  out.push(heading(numerado ? "6.3 Fatores que exigem intervenção" : "Fatores que exigem intervenção", Htop));
  out.push(p("Os fatores classificados como Substancial e Intolerável compõem esta categoria e indicam condições de exposição que requerem ação organizada e dentro de prazos definidos. Embora apresentem graus distintos de urgência, sua leitura conjunta revela um padrão de inter-relação: os fatores substanciais frequentemente alimentam ou agravam os intoleráveis, tornando a intervenção coordenada mais eficaz do que ações isoladas por fator."));
  const sub = nivelComAnalise(resultado, m, "substancial", numerado ? "6.3.1 Substancial" : "Substancial", Hsub);
  const into = nivelComAnalise(resultado, m, "intoleravel", numerado ? "6.3.2 Intolerável" : "Intolerável", Hsub);
  if (sub.length) out.push(...sub);
  if (into.length) out.push(...into);
  if (!sub.length && !into.length) out.push(p("Nenhum fator classificado como Substancial ou Intolerável."));
  return out;
}

function blocoSintese(
  analises: Array<{ dimensao: string; texto: string | null; gerado_por_ia: boolean }>,
  numerado: boolean,
  Htop: (typeof HeadingLevel)[keyof typeof HeadingLevel],
): Paragraph[] {
  const s = mapaBucket(analises).get("sintese");
  if (!s || !(s.texto ?? "").trim()) return [];
  return [
    heading(numerado ? "6.4 Síntese relacional dos achados" : "Síntese relacional dos achados", Htop),
    ...textoAnalise(s),
  ];
}

function secaoAnaliseIntegrada(c: Conteudo, bp: (k: string) => string): Array<Paragraph | Table> {
  const out: Array<Paragraph | Table> = [
    heading("6. Análise dos fatores psicossociais", HeadingLevel.HEADING_2),
    p("Os resultados foram organizados em três categorias analíticas: Fatores Protetores, Fatores de Atenção e Fatores que Exigem Intervenção, conforme detalhado a seguir."),
  ];
  const setores = (c.setores ?? []).filter((s) => !s.bloqueado && (s.total_respondentes ?? 0) > 0);
  if (setores.length <= 1) {
    const usarSetor = setores.length === 1;
    const resultado = usarSetor ? (setores[0].resultado ?? []) : (c.resultado_global ?? []);
    const analisesSetor = usarSetor ? (setores[0].analises ?? []) : [];

    const temConteudoSetor = analisesSetor.some((a) => ((a?.texto ?? "").trim().length > 0));

    const analises = temConteudoSetor ? analisesSetor : (c.analises_consolidado ?? []);
    out.push(...blocosNiveis(resultado, analises, true, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4));
    out.push(caixaDestaque("AVISO CLÍNICO", paragrafosDe(bp("aviso_clinico"))));
    out.push(...blocoSintese(analises, true, HeadingLevel.HEADING_3));
    out.push(...citacaoNormativa(resultado));
  } else {
    let n = 0;
    setores.forEach((s) => {
      n += 1;
      out.push(heading(`6.${n} Setor: ${s.nome}`, HeadingLevel.HEADING_3));
      out.push(...blocosNiveis(s.resultado ?? [], s.analises ?? [], false, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5));
      out.push(...blocoSintese(s.analises ?? [], false, HeadingLevel.HEADING_4));
      out.push(pVazio());
    });
    out.push(caixaDestaque("AVISO CLÍNICO", paragrafosDe(bp("aviso_clinico"))));
    const resultadoConsolidado = setores.flatMap((s) => s.resultado ?? []);
    out.push(...citacaoNormativa(resultadoConsolidado));
  }
  return out;
}


export const PRIORIDADE_POR_NIVEL: Record<string, string> = {
  intoleravel: "A",
  substancial: "M",
};

export const STATUS_LETRA: Record<string, string> = {
  pendente: "P",
  em_andamento: "E",
  concluida: "C",
  cancelada: "S",
};

export const PRAZO_POR_NIVEL: Record<string, string> = {
  intoleravel: "Imediato a 90 dias",
  substancial: "Imediato a 120 dias",
};

const NIVEL_RANK: Record<string, number> = {
  intoleravel: 5,
  substancial: 4,
  moderado: 3,
  toleravel: 2,
  trivial: 1,
};

export function rankNivel(n?: string): number {
  return NIVEL_RANK[(n ?? "").toLowerCase()] ?? 0;
}

export function tabelaPlanoAcao(
  acoes: AcaoPlano[],
  catalogo: Record<string, CatalogoItem>,
): Table {
  const cabecalhos = [
    "Ord.", "Ação", "Meta", "Prioridade", "Sit.",
    "Planejado início", "Planejado término",
    "Realizado início", "Realizado término", "Responsável",
  ];
  const larg = [4, 26, 16, 6, 5, 9, 11, 6, 6, 11];
  const cabecalhoRow = new TableRow({
    tableHeader: true,
    children: cabecalhos.map((h, i) => cellTexto(h, { bold: true, width: larg[i] })),
  });
  const linhas = acoes.map((a, i) => {
    const nivel = (a.nivel_risco_origem ?? "").toLowerCase();
    const nomeRisco = catalogo[a.subescala_id]?.nome ?? "";
    const acaoBase = a.o_que ?? "—";
    const acao = nomeRisco ? `${acaoBase} (${nomeRisco})` : acaoBase;
    const termino = a.prazo ? fmtDataCurta(a.prazo) : (PRAZO_POR_NIVEL[nivel] ?? "—");
    const responsavel = a.responsavel && a.responsavel.trim() ? a.responsavel : "Gestão/RH";
    return new TableRow({
      children: [
        cellTexto(String(i + 1), { width: larg[0] }),
        cell(
          [
            new Paragraph({ children: [new TextRun({ text: acao })] }),
            new Paragraph({
              spacing: { before: 20 },
              children: [new TextRun({ text: `Setor: ${a.setor_nome ?? "Geral"}`, italics: true, size: 18 })],
            }),
          ],
          { width: larg[1] },
        ),
        cellTexto(a.por_que ?? "—", { width: larg[2] }),
        cellTexto(PRIORIDADE_POR_NIVEL[nivel] ?? "—", { width: larg[3] }),
        cellTexto(STATUS_LETRA[a.status ?? ""] ?? "A", { width: larg[4] }),
        cellTexto("Imediato", { width: larg[5] }),
        cellTexto(termino, { width: larg[6] }),
        cellTexto("—", { width: larg[7] }),
        cellTexto("—", { width: larg[8] }),
        cellTexto(responsavel, { width: larg[9] }),
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
  out.push(
    p('As ações estão organizadas por setor e contemplam os fatores classificados como Intolerável e Substancial — a prioridade máxima de intervenção do PGR —, apresentados nessa ordem. Para cada setor são listadas as medidas de controle definidas, com o respectivo fator de risco, o nível de risco de origem e os parâmetros de execução. As ações de alcance organizacional, sem setor específico, são apresentadas no grupo "Geral".'),
  );
  const SEM_SETOR = "Geral";
  const ORDEM_NIVEL_PLANO: Record<string, number> = { intoleravel: 0, substancial: 1 };
  const porSetor = new Map<string, AcaoPlano[]>();
  for (const a of acoes) {
    if (a.nivel_risco_origem !== "intoleravel" && a.nivel_risco_origem !== "substancial") continue;
    const chave = a.setor_nome && a.setor_nome.trim() ? a.setor_nome : SEM_SETOR;
    const lista = porSetor.get(chave) ?? [];
    lista.push(a);
    porSetor.set(chave, lista);
  }
  let n = 0;
  for (const [setorNome, lista] of porSetor) {
    const ordenada = lista
      .slice()
      .sort(
        (a, b) =>
          (ORDEM_NIVEL_PLANO[a.nivel_risco_origem ?? ""] ?? 9) -
          (ORDEM_NIVEL_PLANO[b.nivel_risco_origem ?? ""] ?? 9),
      );
    n += 1;
    out.push(heading(`7.2.${n} Setor: ${setorNome}`, HeadingLevel.HEADING_4));
    out.push(tabelaPlanoAcao(ordenada, catalogo));
    out.push(pVazio());
  }
  out.push(p("Legenda — Situação: A: Aberta · E: Em execução · C: Concluída · S: Suspensa · P: Pendente de Aprovação. Prazo recomendado: Intolerável imediato a 90 dias; Substancial imediato a 120 dias."));
  return out;
}

export function secaoDiscussao(bp: (k: string) => string): Paragraph[] {
  return [
    heading("8. Discussão", HeadingLevel.HEADING_2),
    ...paragrafosDe(bp("discussao")),
  ];
}


export function secaoResponsaveisTecnicos(c: Conteudo): Paragraph[] {
  const out: Paragraph[] = [
    heading("9. Responsáveis técnicos", HeadingLevel.HEADING_2),
  ];
  const rts = c.responsaveis_tecnicos ?? [];
  if (rts.length === 0) {
    out.push(p("—"));
    return out;
  }
  const empresaAssinatura = c.tenant?.razao_social ?? c.tenant?.nome_fantasia ?? "";
  for (const rt of rts) {
    out.push(p(rt.nome ?? "—", { bold: true }));
    const conselho = [
      [rt.tipo_conselho, rt.uf_conselho].filter(Boolean).join("-"),
      rt.numero_registro,
    ]
      .filter(Boolean)
      .join(" ");
    if (conselho) out.push(p(conselho));
    if (empresaAssinatura) out.push(p(empresaAssinatura));
    out.push(pVazio());
    out.push(p("_____________________________________________"));
    out.push(p("Assinatura"));
    out.push(pVazio());
  }
  return out;
}

// ============== EXPORT ==============

export async function buildDocxBlob(
  rel: RelatorioInput,
  imagens?: ImagensExportacao,
): Promise<Blob> {
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

  return await Packer.toBlob(doc);
}

export async function exportarRelatorioDocx(
  rel: RelatorioInput,
  imagens?: ImagensExportacao,
): Promise<void> {
  const blob = await buildDocxBlob(rel, imagens);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `laudo-nr1-v${rel.versao}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}