import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
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

function cell(children: Paragraph[], opts?: { bold?: boolean; width?: number }): TableCell {
  return new TableCell({
    width: opts?.width
      ? { size: opts.width, type: WidthType.PERCENTAGE }
      : undefined,
    children,
  });
}

function cellTexto(texto: string, opts?: { bold?: boolean; width?: number }): TableCell {
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

function enderecoCompleto(e?: Empresa): string {
  if (!e) return "—";
  const partes = [
    [e.endereco_logradouro, e.endereco_numero].filter(Boolean).join(", "),
    e.endereco_complemento,
    e.endereco_bairro,
    [e.endereco_cidade, e.endereco_uf].filter(Boolean).join("/"),
    e.endereco_cep,
  ]
    .map((s) => (s ?? "").toString().trim())
    .filter(Boolean);
  return partes.length ? partes.join(" — ") : "—";
}

function nomeRT(rt: RespTec): string {
  const nome = rt.nome ?? "—";
  const conselho = [rt.tipo_conselho, rt.uf_conselho, rt.numero_registro]
    .filter(Boolean)
    .join(" ");
  const papel = rt.papel ? `— ${rt.papel}` : "";
  return [nome, conselho && `— ${conselho}`, papel].filter(Boolean).join(" ");
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
    rotuloValor("Instrumento", c.instrumento ?? "—"),
    rotuloValor("Data", fmtData(rel.gerado_em)),
    rotuloValor("Versão", String(rel.versao)),
    pVazio(),
    p("Responsáveis técnicos:", { bold: true }),
  );
  const rts = c.responsaveis_tecnicos ?? [];
  if (rts.length === 0) {
    out.push(p("—"));
  } else {
    for (const rt of rts) out.push(p(nomeRT(rt)));
  }
  return out;
}

function secaoObjetivo(bp: (k: string) => string): Paragraph[] {
  const texto = bp("objetivo");
  return [heading("2. Objetivo", HeadingLevel.HEADING_2), ...paragrafosDe(texto)];
}

function secaoDadosOrganizacao(
  c: Conteudo,
  bp: (k: string) => string,
): Paragraph[] {
  const e = c.empresa ?? {};
  const out: Paragraph[] = [
    heading("3. Dados da organização e enquadramento legal", HeadingLevel.HEADING_2),
    rotuloValor("Nome fantasia", e.nome_fantasia ?? "—"),
    rotuloValor("Segmento", e.segmento ?? "—"),
    rotuloValor("Área de atuação", e.area_atuacao ?? "—"),
    rotuloValor("Contato responsável", e.contato_responsavel ?? "—"),
    rotuloValor(
      "Colaboradores (estimado)",
      e.qtd_colaboradores_estimado != null
        ? String(e.qtd_colaboradores_estimado)
        : "—",
    ),
    rotuloValor("Endereço", enderecoCompleto(e)),
    pVazio(),
    ...paragrafosDe(bp("enquadramento_legal")),
  ];
  return out;
}

function secaoIndicadores(c: Conteudo): Array<Paragraph | Table> {
  const out: Array<Paragraph | Table> = [
    heading("4. Indicadores epidemiológicos", HeadingLevel.HEADING_2),
  ];
  const ind = c.indicadores;
  if (!ind || Object.keys(ind).length === 0) {
    out.push(p("Não apresentados."));
    return out;
  }
  const parecer = (ind["parecer_indicadores"] as string | undefined) ?? "";
  const linhas: string[][] = [];
  for (const [k, v] of Object.entries(ind)) {
    if (k === "parecer_indicadores") continue;
    if (v === null || v === undefined || v === "") continue;
    linhas.push([k, typeof v === "object" ? JSON.stringify(v) : String(v)]);
  }
  if (linhas.length > 0) {
    out.push(tabelaSimples(["Indicador", "Valor"], linhas));
  }
  if (parecer.trim()) {
    out.push(pVazio(), ...paragrafosDe(parecer));
  }
  return out;
}

function secaoMetodologia(bp: (k: string) => string): Array<Paragraph | Table> {
  return [
    heading("5. Metodologia e critérios", HeadingLevel.HEADING_2),
    ...paragrafosDe(bp("metodologia")),
    pVazio(),
    ...paragrafosDe(bp("criterios_severidade")),
    pVazio(),
    matrizSeveridade(),
  ];
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
    return p("Sem riscos prioritários identificados neste setor.");
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
    heading("6. Inventário de risco (por setor)", HeadingLevel.HEADING_2),
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
    out.push(p("Riscos prioritários", { bold: true }));
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

function secaoAnaliseIntegrada(c: Conteudo): Paragraph[] {
  const out: Paragraph[] = [
    heading("7. Análise integrada por setor", HeadingLevel.HEADING_2),
  ];
  const setores = c.setores ?? [];
  if (setores.length === 0) {
    out.push(p("Nenhum setor informado."));
    return out;
  }
  for (const setor of setores) {
    out.push(heading(setor.nome, HeadingLevel.HEADING_3));
    const analise = (setor.analise ?? "").trim();
    if (analise) {
      out.push(...paragrafosDe(analise));
    } else {
      out.push(p("Análise não preenchida para este setor."));
    }
  }
  return out;
}

function secaoPlanoAcao(c: Conteudo): Paragraph[] {
  const out: Paragraph[] = [];
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
    const porSubescala = new Map<string, AcaoPlano[]>();
    for (const a of listaSetor) {
      const lista = porSubescala.get(a.subescala_id) ?? [];
      lista.push(a);
      porSubescala.set(a.subescala_id, lista);
    }
    for (const [subId, listaSub] of porSubescala) {
      const subNome = catalogo[subId]?.nome ?? subId;
      out.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Subescala: ", bold: true }),
            new TextRun({ text: subNome }),
          ],
        }),
      );
      for (const a of listaSub) {
        out.push(pVazio());
        out.push(rotuloValor("O quê", a.o_que ?? "—"));
        out.push(rotuloValor("Por quê", a.por_que ?? "—"));
        out.push(rotuloValor("Onde", a.onde ?? "—"));
        out.push(rotuloValor("Quando", a.quando ?? "—"));
        out.push(rotuloValor("Quem", a.quem ?? "—"));
        out.push(rotuloValor("Como", a.como ?? "—"));
        out.push(rotuloValor("Quanto", a.quanto ?? "—"));
        out.push(
          rotuloValor(
            "Status",
            a.status ? STATUS_LABEL[a.status] ?? a.status : "—",
          ),
        );
        out.push(rotuloValor("Prazo", fmtDataCurta(a.prazo ?? undefined)));
        out.push(rotuloValor("Responsável", a.responsavel ?? "—"));
      }
      out.push(pVazio());
    }
  }
  return out;
}

function secaoDiscussao(bp: (k: string) => string): Paragraph[] {
  return [
    heading("8. Discussão", HeadingLevel.HEADING_2),
    ...paragrafosDe(bp("discussao")),
    pVazio(),
    p("Aviso clínico:", { bold: true }),
    ...paragrafosDe(bp("aviso_clinico")),
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

function secaoAnexo(bp: (k: string) => string): Paragraph[] {
  return [
    heading("Anexo I — Plano de ação (5W2H)", HeadingLevel.HEADING_2),
    ...paragrafosDe(bp("anexo_instrucoes")),
  ];
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
    ...secaoDadosOrganizacao(c, bp),
    pVazio(),
    ...secaoIndicadores(c),
    pVazio(),
    ...secaoMetodologia(bp),
    pVazio(),
    ...secaoInventarioPorSetor(c, bp, imagens),
    pVazio(),
    ...secaoAnaliseIntegrada(c),
    pVazio(),
    ...secaoDiscussao(bp),
    pVazio(),
    ...secaoResponsaveisTecnicos(c),
    pVazio(),
    ...secaoAnexo(bp),
    pVazio(),
    ...secaoPlanoAcao(c),
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