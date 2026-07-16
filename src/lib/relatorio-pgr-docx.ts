import { Document, HeadingLevel, Packer, Paragraph, Table } from "docx";

import {
  bpHelper, p, pVazio, paragrafosDe, paragrafosDeCor, heading,
  tabelaCargos, tabelaRiscosPrioritarios, tabelaPlanoAcao,
  mapaBucket, nivelComAnalise, textoAnalise, citacaoNormativa,
  secaoCapa, secaoObjetivo, secaoDadosOrganizacao, secaoIndicadores,
  secaoMetodologia, secaoDiscussao, secaoResponsaveisTecnicos,
  type AcaoPlano, type AnaliseDimensaoItem, type CatalogoItem, type Conteudo,
  type ImagensExportacao, type RelatorioInput, type SetorBlock, type SubescalaResultado,
} from "./relatorio-docx";

type H = (typeof HeadingLevel)[keyof typeof HeadingLevel];

// ============== TEXTOS FIXOS DO RELATÓRIO PARA PGR ==============

const TEXTO_INVENTARIO_PGR =
  "O inventário preliminar é gerado a partir dos fatores críticos identificados, observando-se as especificidades e o histórico da organização (grau de risco/NTEP, FAP, absenteísmo, turnover, PCMSO, PGR consolidado, requisitos das demais NRs, LTCAT e AEP, quando houver).\n\n" +
  "Além disso, os dados sociodemográficos e não somente os números gerados a partir da metodologia do COPSOQ II adaptado podem fornecer insumos importantes para enriquecer a análise e o benchmarking da organização quanto à gestão dos Fatores de Riscos Psicossociais Relacionados ao Trabalho. Ressalta-se que os riscos psicossociais identificados e apresentados nesta análise correspondem aos fatores exigidos para avaliação no âmbito da atualização da NR-01, conforme as diretrizes do Ministério do Trabalho e Emprego, servindo como base técnica para a elaboração do inventário de riscos e do respectivo plano de ação. A partir do conhecimento gerado por esse instrumento, análises mais aprofundadas, sejam qualitativas ou quantitativas, podem ser necessárias para complementar a compreensão dos fatores identificados e subsidiar a implementação de medidas preventivas e corretivas.";

const TEXTO_ABERTURA_SECAO6 =
  "Os resultados foram organizados em quatro categorias analíticas: Fatores Triviais, Fatores Toleráveis e Moderados, Fatores que Exigem Intervenção e Fatores Protetores, conforme detalhado a seguir.";

const TEXTO_PROTETORES =
  "Os fatores protetores correspondem aos aspectos da organização do trabalho que contribuem para a promoção da saúde, do bem-estar e da qualidade de vida dos trabalhadores, atuando na prevenção ou mitigação dos riscos psicossociais relacionados ao trabalho. Sua identificação permite reconhecer práticas, condições e recursos organizacionais que fortalecem o ambiente laboral e favorecem o desempenho sustentável das atividades.";

const TEXTO_CRITERIO_PGR =
  "O inventário de fatores psicossociais contempla as dimensões avaliadas pelo instrumento COPSOQ II, exigidas pelo Ministério do Trabalho e Emprego, independentemente da classificação obtida, com o objetivo de garantir a rastreabilidade integral dos fatores organizacionais, relacionais e individuais identificados durante o processo de avaliação.\n\n" +
  "Em conformidade com os princípios do Gerenciamento de Riscos Ocupacionais (GRO) previstos na NR-01, a priorização das medidas de prevenção e controle foi realizada com base no nível de risco obtido por meio da Matriz de Risco 3x3 adotada pela organização, construída a partir da combinação entre severidade e probabilidade, conforme metodologia descrita anteriormente neste relatório.\n\n" +
  "Dessa forma, receberam prioridade para intervenção os fatores psicossociais classificados como Intoleráveis e Substancial, considerando seu potencial de impacto sobre a saúde dos trabalhadores e a necessidade de implementação de medidas de controle compatíveis com o nível de risco identificado.\n\n" +
  "Os fatores classificados como Toleráveis e Moderados foram analisados de forma complementar, podendo ser contemplados em ações preventivas quando identificados como fatores contribuintes para outros riscos ocupacionais classificados como intoleráveis ou substanciais, quando apresentarem relevância estratégica para a organização ou quando houver indicação de tendência de agravamento em avaliações futuras.\n\n" +
  "Por sua vez, os fatores classificados como Triviais permanecem sob monitoramento periódico, sendo recomendada a manutenção das condições organizacionais atualmente existentes e das práticas que contribuem para seus resultados favoráveis.\n\n" +
  "As recomendações técnicas apresentadas nas seções subsequentes possuem caráter orientativo e foram elaboradas com base nos resultados obtidos na avaliação. Compete à organização definir a viabilidade, prioridade, abrangência, cronograma de implementação, recursos necessários e mecanismos de acompanhamento da eficácia das medidas adotadas, observando os requisitos do GRO/PGR estabelecidos pela NR-01.";

// ============== SELEÇÃO DE SUBESCALAS (nomes canônicos COPSOQ) ==============

type Alvo = { rotulo: string; codigo: string };

const INVENTARIO_PGR: Alvo[] = [
  { rotulo: "Exigências quantitativas", codigo: "exigencias_quantitativas" },
  { rotulo: "Ritmo de trabalho", codigo: "ritmo_trabalho" },
  { rotulo: "Previsibilidade", codigo: "previsibilidade" },
  { rotulo: "Comportamentos ofensivos", codigo: "comportamentos_ofensivos" },
  { rotulo: "Transparência do papel", codigo: "transparencia_papel" },
  { rotulo: "Recompensas", codigo: "recompensas" },
  { rotulo: "Apoio social de colegas", codigo: "apoio_social_colegas" },
  { rotulo: "Apoio social de superiores", codigo: "apoio_social_superiores" },
  { rotulo: "Influência no trabalho", codigo: "influencia_trabalho" },
  { rotulo: "Comunidade social no trabalho", codigo: "comunidade_social" },
  { rotulo: "Justiça e respeito", codigo: "justica_respeito" },
];

const PROTETORES_PGR: Alvo[] = [
  { rotulo: "Qualidade da liderança", codigo: "qualidade_lideranca" },
  { rotulo: "Significado do trabalho", codigo: "significado_trabalho" },
  { rotulo: "Possibilidade de desenvolvimento", codigo: "possibilidade_desenvolvimento" },
  { rotulo: "Autoeficácia", codigo: "autoeficacia" },
];

const NIVEIS_PROTETOR = ["trivial", "toleravel", "moderado"];

function casa(r: SubescalaResultado, alvo: Alvo): boolean {
  return (r.codigo ?? "").trim().toLowerCase() === alvo.codigo;
}

function selecionar(
  resultado: SubescalaResultado[],
  alvos: Alvo[],
): { achados: SubescalaResultado[]; faltantes: string[] } {
  const ids = new Set<string>();
  const faltantes: string[] = [];
  for (const alvo of alvos) {
    const hit = resultado.filter((r) => casa(r, alvo));
    if (hit.length) hit.forEach((r) => ids.add(r.subescala_id));
    else faltantes.push(alvo.rotulo);
  }
  return { achados: resultado.filter((r) => ids.has(r.subescala_id)), faltantes };
}

function universoDe(c: Conteudo): SubescalaResultado[] {
  const g = c.resultado_global ?? [];
  if (g.length) return g;
  return (c.setores ?? []).flatMap((s) => s.resultado ?? []);
}

function filtrarConteudo(c: Conteudo): { conteudo: Conteudo; faltantes: string[]; disponiveis: string[] } {
  const idsMantidos = new Set<string>();
  const setores = (c.setores ?? []).map((s) => {
    const { achados } = selecionar(s.resultado ?? [], INVENTARIO_PGR);
    achados.forEach((r) => idsMantidos.add(r.subescala_id));
    return { ...s, resultado: achados };
  });
  const glob = selecionar(c.resultado_global ?? [], INVENTARIO_PGR);
  glob.achados.forEach((r) => idsMantidos.add(r.subescala_id));
  const plano = (c.plano_acao ?? []).filter((a: AcaoPlano) => idsMantidos.has(a.subescala_id));
  const universo = universoDe(c);
  const { faltantes } = selecionar(universo, INVENTARIO_PGR);
  const disponiveis = universo.map((r) => `${r.nome} [${r.codigo}]`);
  return {
    conteudo: { ...c, setores, resultado_global: glob.achados, plano_acao: plano },
    faltantes,
    disponiveis,
  };
}

function avisoFaltantes(faltantes: string[], disponiveis: string[]): Paragraph[] {
  if (!faltantes.length) return [];
  return [
    ...paragrafosDeCor(
      "VERIFICAR — subescalas do inventário para PGR não localizadas no catálogo desta avaliação: " +
        faltantes.join("; ") +
        ".",
      "C00000",
    ),
    ...paragrafosDeCor(
      "DIAGNÓSTICO — nomes e códigos presentes no catálogo desta avaliação: " +
        disponiveis.join(" · "),
      "C00000",
    ),
  ];
}

// ============== SEÇÃO 5 ==============

function secaoInventarioPgr(
  c: Conteudo,
  faltantes: string[],
  disponiveis: string[],
): Array<Paragraph | Table> {
  const out: Array<Paragraph | Table> = [
    heading("5. Inventário de risco (por setor)", HeadingLevel.HEADING_2),
    ...paragrafosDe(TEXTO_INVENTARIO_PGR),
    ...avisoFaltantes(faltantes, disponiveis),
  ];
  const setores = c.setores ?? [];
  const catalogo = c.catalogo ?? {};
  if (setores.length === 0) {
    out.push(p("Nenhum setor informado."));
    return out;
  }
  for (const setor of setores) {
    out.push(heading(`Setor: ${setor.nome}`, HeadingLevel.HEADING_3));
    out.push(p(`${setor.total_respondentes ?? 0} respondente${(setor.total_respondentes ?? 0) === 1 ? "" : "s"}`));
    if (setor.bloqueado) continue;
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

// ============== SEÇÃO 6 ==============

function blocosNiveisPgr(
  resultado: SubescalaResultado[],
  analises: AnaliseDimensaoItem[],
  numerado: boolean,
  Htop: H,
  Hsub: H,
): Paragraph[] {
  const m = mapaBucket(analises);
  const out: Paragraph[] = [];
  out.push(heading(numerado ? "6.1 Fatores Triviais" : "Fatores Triviais", Htop));
  out.push(p("Enquadram-se nesta categoria os fatores classificados como Trivial na matriz de risco, cujos resultados indicam condições favoráveis percebidas pelos trabalhadores e a presença de recursos psicossociais consolidados no ambiente laboral. Esses fatores atuam como elementos protetivos, contribuindo para a manutenção da saúde, do bem-estar e da capacidade de enfrentamento das demandas inerentes ao trabalho."));
  const trivial = nivelComAnalise(resultado, m, "trivial", null, Hsub);
  if (trivial.length) out.push(...trivial);
  else out.push(p("Nenhum fator classificado como Trivial."));
  out.push(heading(numerado ? "6.2 Fatores Toleráveis e Moderados" : "Fatores Toleráveis e Moderados", Htop));
  const tol = nivelComAnalise(resultado, m, "toleravel", "Em nível tolerável", Hsub);
  const mod = nivelComAnalise(resultado, m, "moderado", "Em nível moderado", Hsub);
  if (tol.length) out.push(...tol);
  if (mod.length) out.push(...mod);
  if (!tol.length && !mod.length) out.push(p("Nenhum fator classificado como Tolerável ou Moderado."));
  out.push(heading(numerado ? "6.3 Fatores que exigem intervenção" : "Fatores que exigem intervenção", Htop));
  out.push(p("Os fatores classificados como Substancial e Intolerável compõem esta categoria e indicam condições de exposição que requerem ação organizada e dentro de prazos definidos. Embora apresentem graus distintos de urgência, sua leitura conjunta revela um padrão de inter-relação: os fatores substanciais frequentemente alimentam ou agravam os intoleráveis, tornando a intervenção coordenada mais eficaz do que ações isoladas por fator."));
  const sub = nivelComAnalise(resultado, m, "substancial", numerado ? "6.3.1 Nível Substancial" : "Nível Substancial", Hsub);
  const into = nivelComAnalise(resultado, m, "intoleravel", numerado ? "6.3.2 Nível Intolerável" : "Nível Intolerável", Hsub);
  if (sub.length) out.push(...sub);
  if (into.length) out.push(...into);
  if (!sub.length && !into.length) out.push(p("Nenhum fator classificado como Substancial ou Intolerável."));
  return out;
}

function blocoProtetoresPgr(
  resultadoCompleto: SubescalaResultado[],
  catalogo: Record<string, CatalogoItem>,
  titulo: string,
  Htop: H,
): Array<Paragraph | Table> {
  const { achados } = selecionar(resultadoCompleto, PROTETORES_PGR);
  const bons = achados.filter((r) => NIVEIS_PROTETOR.includes((r.classificacao_pgr ?? "").toLowerCase()));
  if (!bons.length) return [];
  const setorSintetico = { setor_id: "protetores", nome: "Fatores protetores", resultado: bons } as SetorBlock;
  return [
    heading(titulo, Htop),
    ...paragrafosDe(TEXTO_PROTETORES),
    p("Enquadram-se nessa categoria:"),
    tabelaRiscosPrioritarios(setorSintetico, catalogo, ""),
  ];
}

function blocoSintesePgr(analises: AnaliseDimensaoItem[], titulo: string, Htop: H): Paragraph[] {
  const s = mapaBucket(analises).get("sintese");
  if (!s || !(s.texto ?? "").trim()) return [];
  return [heading(titulo, Htop), ...textoAnalise(s)];
}

function secaoAnalisePgr(cFiltrado: Conteudo, cOriginal: Conteudo): Array<Paragraph | Table> {
  const out: Array<Paragraph | Table> = [
    heading("6. Análise dos fatores psicossociais", HeadingLevel.HEADING_2),
    p(TEXTO_ABERTURA_SECAO6),
  ];
  const catalogo = cOriginal.catalogo ?? {};
  const setoresF = (cFiltrado.setores ?? []).filter((s) => !s.bloqueado && (s.total_respondentes ?? 0) > 0);
  const setoresO = (cOriginal.setores ?? []).filter((s) => !s.bloqueado && (s.total_respondentes ?? 0) > 0);
  if (setoresF.length <= 1) {
    const usarSetor = setoresF.length === 1;
    const resultado = usarSetor ? (setoresF[0].resultado ?? []) : (cFiltrado.resultado_global ?? []);
    const analisesSetor = usarSetor ? (setoresF[0].analises ?? []) : [];
    const temConteudoSetor = analisesSetor.some((a) => ((a?.texto ?? "").trim().length > 0));
    const analises = temConteudoSetor ? analisesSetor : (cOriginal.analises_consolidado ?? []);
    const completo = usarSetor && setoresO[0] ? (setoresO[0].resultado ?? []) : universoDe(cOriginal);
    out.push(...blocosNiveisPgr(resultado, analises, true, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4));
    out.push(...blocoProtetoresPgr(completo, catalogo, "6.4 Fatores protetores", HeadingLevel.HEADING_3));
    out.push(...blocoSintesePgr(analises, "6.5 Síntese relacional dos achados", HeadingLevel.HEADING_3));
    out.push(...citacaoNormativa(resultado));
  } else {
    let n = 0;
    setoresF.forEach((s, idx) => {
      n += 1;
      out.push(heading(`6.${n} Setor: ${s.nome}`, HeadingLevel.HEADING_3));
      out.push(...blocosNiveisPgr(s.resultado ?? [], s.analises ?? [], false, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5));
      out.push(...blocoProtetoresPgr(setoresO[idx]?.resultado ?? [], catalogo, "Fatores protetores", HeadingLevel.HEADING_4));
      out.push(...blocoSintesePgr(s.analises ?? [], "Síntese relacional dos achados", HeadingLevel.HEADING_4));
      out.push(pVazio());
    });
    out.push(...citacaoNormativa(setoresF.flatMap((s) => s.resultado ?? [])));
  }
  return out;
}

// ============== SEÇÃO 7 ==============

function secaoPlanoAcaoPgr(c: Conteudo): Array<Paragraph | Table> {
  const out: Array<Paragraph | Table> = [
    heading("7. Prioridades de intervenção e direcionamento de ação (PGR)", HeadingLevel.HEADING_2),
    heading("7.1 Critério de priorização das medidas de controle", HeadingLevel.HEADING_3),
    ...paragrafosDe(TEXTO_CRITERIO_PGR),
    pVazio(),
    heading("7.2 Plano de ação", HeadingLevel.HEADING_3),
  ];
  const acoes = c.plano_acao ?? [];
  const catalogo = c.catalogo ?? {};
  if (acoes.length === 0) {
    out.push(p("Nenhuma ação cadastrada."));
    return out;
  }
  out.push(p('As ações estão organizadas por setor e contemplam os fatores classificados como Intolerável e Substancial — a prioridade máxima de intervenção do PGR —, apresentados nessa ordem. Para cada setor são listadas as medidas de controle definidas, com o respectivo fator de risco, o nível de risco de origem e os parâmetros de execução. As ações de alcance organizacional, sem setor específico, são apresentadas no grupo "Geral".'));
  const SEM_SETOR = "Geral";
  const ORDEM: Record<string, number> = { intoleravel: 0, substancial: 1 };
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
    const ordenada = lista.slice().sort((a, b) => (ORDEM[a.nivel_risco_origem ?? ""] ?? 9) - (ORDEM[b.nivel_risco_origem ?? ""] ?? 9));
    n += 1;
    out.push(heading(`7.2.${n} Setor: ${setorNome}`, HeadingLevel.HEADING_4));
    out.push(tabelaPlanoAcao(ordenada, catalogo));
    out.push(pVazio());
  }
  out.push(p("Legenda — Situação: A: Aberta · E: Em execução · C: Concluída · S: Suspensa · P: Pendente de Aprovação. Prazo recomendado: Intolerável imediato a 90 dias; Substancial imediato a 120 dias."));
  return out;
}

// ============== EXPORT ==============

export async function buildDocxPgrBlob(rel: RelatorioInput, imagens?: ImagensExportacao): Promise<Blob> {
  const c = rel.conteudo ?? {};
  const bp = bpHelper(c);
  const { conteudo: cf, faltantes, disponiveis } = filtrarConteudo(c);
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
    ...secaoInventarioPgr(cf, faltantes, disponiveis),
    pVazio(),
    ...secaoAnalisePgr(cf, c),
    pVazio(),
    ...secaoPlanoAcaoPgr(cf),
    pVazio(),
    ...secaoDiscussao(bp),
    pVazio(),
    ...secaoResponsaveisTecnicos(c),
  ];
  const doc = new Document({
    creator: "Avanti HR",
    title: `Relatório para PGR v${rel.versao}`,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [
      { properties: { page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } }, children },
    ],
  });
  return await Packer.toBlob(doc);
}

export async function exportarRelatorioPgrDocx(rel: RelatorioInput, imagens?: ImagensExportacao): Promise<void> {
  const blob = await buildDocxPgrBlob(rel, imagens);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `relatorio-pgr-v${rel.versao}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
