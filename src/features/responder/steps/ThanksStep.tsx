import { useMemo } from 'react';
import type { QuestionarioPayload } from '../types';
import { selecionarCitacao } from '../citacoes';
import { selecionarSaudacaoDespedida } from '../saudacoes';

export function ThanksStep({ payload }: { payload: QuestionarioPayload }) {
  const citacao = useMemo(() => selecionarCitacao(), []);
  const saudacao = useMemo(() => selecionarSaudacaoDespedida(), []);

  return (
    <div className="relative space-y-12 py-6">
      <div
        aria-hidden
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full opacity-[0.05] bg-gradient-to-br from-primary via-accent to-primary blur-3xl pointer-events-none"
      />

      <div className="relative animate-fade-in">
        <div className="flex items-center gap-2 mb-5">
          <span className="w-8 h-px bg-primary" />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
            Resposta registrada
          </span>
        </div>
        <h1 className="text-3xl md:text-5xl font-semibold tracking-[-0.02em] leading-[1.05] text-foreground max-w-xl">
          {saudacao}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground max-w-lg">
          Suas respostas foram registradas de forma anônima e somam-se à leitura
          coletiva sobre {payload.avaliacao.empresa_nome}.
        </p>
      </div>

      <figure className="relative animate-fade-in-delayed-1 border-l-2 border-primary/40 pl-6 py-2">
        <blockquote className="text-[18px] md:text-[22px] leading-[1.45] font-medium text-foreground/95 tracking-[-0.005em] max-w-2xl">
          <span className="text-primary font-serif text-[28px] leading-none mr-1 align-[-0.1em]">"</span>
          {citacao.texto}
          <span className="text-primary font-serif text-[28px] leading-none ml-0.5 align-[-0.1em]">"</span>
        </blockquote>
        <figcaption className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          — {citacao.fonte}
        </figcaption>
      </figure>
    </div>
  );
}