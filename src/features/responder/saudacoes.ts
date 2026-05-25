/**
 * Banco curado de saudações. Todas em tom acolhedor, natural pt-BR,
 * sem celebração exagerada nem frieza burocrática.
 */
export const SAUDACOES_CHEGADA: string[] = [
  "Que bom te ver por aqui.",
  "É bom contar com você.",
  "Seja bem-vindo.",
  "Que bom que você chegou.",
  "Obrigado por estar aqui.",
];

export const SAUDACOES_DESPEDIDA: string[] = [
  "Obrigado por chegar até aqui.",
  "Obrigado por dedicar este tempo.",
  "Foi importante contar com você.",
  "Sua voz importa. Obrigado.",
  "Obrigado pela sua confiança.",
];

export function selecionarSaudacaoChegada(): string {
  return SAUDACOES_CHEGADA[Math.floor(Math.random() * SAUDACOES_CHEGADA.length)];
}

export function selecionarSaudacaoDespedida(): string {
  return SAUDACOES_DESPEDIDA[Math.floor(Math.random() * SAUDACOES_DESPEDIDA.length)];
}