import type { QuestionarioPayload } from '../types';

export function ThanksStep({ payload }: { payload: QuestionarioPayload }) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Avaliação enviada
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
          Obrigado pela sua participação.
        </h1>
      </div>

      <div className="space-y-4 text-sm leading-relaxed text-foreground">
        <p>
          Suas respostas foram registradas de forma anônima e vão ajudar{' '}
          <span className="font-medium">{payload.avaliacao.empresa_nome}</span>{' '}
          a entender melhor o ambiente de trabalho e identificar pontos de cuidado.
        </p>
        <p className="text-muted-foreground">
          Você pode fechar esta página.
        </p>
      </div>
    </div>
  );
}