import type { ProgressoSalvo } from './types';

const PREFIX = 'avanti.responder.';

export function salvar(linkPublico: string, estado: ProgressoSalvo) {
  try { localStorage.setItem(PREFIX + linkPublico, JSON.stringify(estado)); } catch { /* noop */ }
}

export function carregar(linkPublico: string): ProgressoSalvo | null {
  try {
    const raw = localStorage.getItem(PREFIX + linkPublico);
    return raw ? JSON.parse(raw) as ProgressoSalvo : null;
  } catch { return null; }
}

export function limpar(linkPublico: string) {
  try { localStorage.removeItem(PREFIX + linkPublico); } catch { /* noop */ }
}