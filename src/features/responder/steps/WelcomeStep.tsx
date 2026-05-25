import type { QuestionarioPayload } from '../types';
import { formatarDataFim } from '../utils';
import { Button } from '@/components/ui/button';

export function WelcomeStep({
  payload,
  onComecar,
}: {
  payload: QuestionarioPayload;
  onComecar: () => void;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Avaliação psicossocial · NR-1
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
          {payload.avaliacao.empresa_nome}
        </h1>
        <p className="text-sm text-muted-foreground">
          {payload.avaliacao.empresa_razao_social}
        </p>
      </div>

      <div className="space-y-4 text-sm leading-relaxed text-foreground">
        <p>
          Sua participação ajuda a identificar fatores de risco no ambiente de
          trabalho. São 76 questões + 3 dados gerais. Tempo estimado: 10 minutos.
        </p>
        <p className="text-muted-foreground">
          Suas respostas são totalmente anônimas. Não pedimos seu nome, CPF ou
          qualquer dado que te identifique. Os resultados são analisados em
          grupo (mínimo de 5 respondentes por agrupamento).
        </p>
        <p className="text-sm">
          Prazo final:{' '}
          <span className="font-medium">{formatarDataFim(payload.avaliacao.data_fim)}</span>
        </p>
      </div>

      <Button onClick={onComecar} size="lg" className="w-full md:w-auto h-12 px-8">
        Começar
      </Button>
    </div>
  );
}