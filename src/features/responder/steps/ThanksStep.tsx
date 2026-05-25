import { useMemo } from 'react';
import type { QuestionarioPayload } from '../types';
import { saudacaoPorHorario } from '../utils';
import { selecionarCitacao } from '../citacoes';

export function ThanksStep({ payload }: { payload: QuestionarioPayload }) {
  const citacao = useMemo(() => selecionarCitacao(), []);
  const saudacao = useMemo(() => saudacaoPorHorario(), []);

  return (
    <div className="relative space-y-14 py-6">
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
        <h1 className="text-3xl md:text-5xl font-semibold tracking-[-0.02em] leading-[1.05] text-foreground max-w-lg">
          {saudacao}.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground max-w-lg">
          Suas respostas foram registradas de forma anônima e somam-se à leitura
          coletiva sobre {payload.avaliacao.empresa_nome}. Obrigado por
          dedicar este momento.
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

      <div className="relative space-y-2 animate-fade-in-delayed-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-foreground/80">
          Próximos passos
        </p>
        <p className="text-[14px] leading-[1.7] text-foreground/85 max-w-xl">
          Os resultados serão analisados em grupo, com mínimo de 5 respondentes
          por agrupamento, e compartilhados pela sua organização nas próximas
          semanas.
        </p>
      </div>

      <div className="relative pt-6 border-t border-border/60 animate-fade-in-delayed-3">
        <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
          Avaliação conduzida conforme NR-1 e ISO 45003. Dados protegidos pela LGPD.
          Você pode fechar esta página.
        </p>
      </div>
    </div>
  );
}