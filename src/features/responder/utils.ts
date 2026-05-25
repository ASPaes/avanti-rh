import type { Dispositivo } from './types';

export function detectarDispositivo(): Dispositivo {
  if (typeof navigator === 'undefined') return 'desconhecido';
  const ua = navigator.userAgent;
  if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) return 'tablet';
  if (/Mobile|Android|iPhone|iPod/i.test(ua)) return 'mobile';
  return 'desktop';
}

export function getUserAgent(): string | null {
  return typeof navigator !== 'undefined' ? navigator.userAgent : null;
}

export function formatarDataFim(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function saudacaoPorHorario(date: Date = new Date()): string {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  if (h >= 18 && h < 24) return 'Boa noite';
  return 'Boa madrugada';
}