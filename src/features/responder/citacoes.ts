export type Citacao = {
  texto: string;
  fonte: string;
};

/**
 * Banco curado de reflexões. Todas têm fonte verificável ou são reflexões
 * originais Avanti (sem atribuição enganosa). Expandir com curadoria da
 * equipe clínica antes de produção em larga escala.
 */
export const CITACOES: Citacao[] = [
  {
    texto: "Tudo vale a pena se a alma não é pequena.",
    fonte: "Fernando Pessoa, em Mensagem",
  },
  {
    texto: "Caminhante, não há caminho. Faz-se caminho ao andar.",
    fonte: "Antonio Machado, em Provérbios e Cantares",
  },
  {
    texto: "Sozinho vais mais rápido. Juntos, vamos mais longe.",
    fonte: "Provérbio africano",
  },
  {
    texto: "Devagar se vai ao longe.",
    fonte: "Provérbio popular",
  },
  {
    texto: "Saúde no trabalho não é apenas ausência de doença — é bem-estar físico, mental e social.",
    fonte: "Adaptado da Constituição da OMS",
  },
  {
    texto: "Cuidar de si também é trabalho.",
    fonte: "Avanti RH",
  },
  {
    texto: "Um ambiente saudável se constrói no coletivo, não no esforço individual.",
    fonte: "Avanti RH",
  },
  {
    texto: "Sua voz, somada à de quem trabalha ao seu lado, tem peso.",
    fonte: "Avanti RH",
  },
  {
    texto: "Pequenas pausas sustentam longas trajetórias.",
    fonte: "Avanti RH",
  },
  {
    texto: "Trabalho digno é aquele que cabe na vida de quem o faz.",
    fonte: "Avanti RH",
  },
];

/** Seleciona uma citação aleatória. */
export function selecionarCitacao(): Citacao {
  const idx = Math.floor(Math.random() * CITACOES.length);
  return CITACOES[idx];
}