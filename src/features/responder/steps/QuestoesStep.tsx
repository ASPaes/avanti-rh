import type { QuestaoLikert, Escala } from '../types';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface Props {
  questoesBloco: QuestaoLikert[];
  escalas: Record<string, Escala>;
  respostas: Record<string, number>;
  onChange: (questaoId: string, valor: number) => void;
  blocoAtual: number;
  totalBlocos: number;
  onVoltar: () => void;
  onContinuar: () => void;
}

export function QuestoesStep({
  questoesBloco, escalas, respostas, onChange,
  blocoAtual, totalBlocos, onVoltar, onContinuar,
}: Props) {
  const todasRespondidas = questoesBloco.every((q) => respostas[q.id] !== undefined);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          Etapa 3 de 3 · Parte {blocoAtual + 1} de {totalBlocos}
        </p>
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
          Pensando no seu trabalho atual
        </h2>
      </div>

      <div className="space-y-10">
        {questoesBloco.map((q) => {
          const escala = escalas[q.escala_codigo];
          if (!escala) return null;
          const valorAtual = respostas[q.id];

          return (
            <div key={q.id} className="space-y-4">
              <div className="flex items-start gap-3 md:gap-4">
                <span className="font-mono text-xs text-muted-foreground pt-0.5 tabular-nums shrink-0 w-6">
                  {String(q.numero).padStart(2, '0')}
                </span>
                <p className="text-base font-medium leading-relaxed text-foreground">
                  {q.texto}
                </p>
              </div>

              <RadioGroup
                value={valorAtual !== undefined ? String(valorAtual) : ''}
                onValueChange={(v) => onChange(q.id, parseInt(v, 10))}
                className="space-y-2 pl-0 md:pl-10"
              >
                {escala.opcoes.map((op) => {
                  const inputId = `q-${q.id}-${op.valor}`;
                  const selecionado = valorAtual === op.valor;
                  return (
                    <label
                      key={op.valor}
                      htmlFor={inputId}
                      className={`flex items-center gap-3 rounded-md border px-4 py-3 cursor-pointer transition-all duration-150 ${
                        selecionado
                          ? 'border-primary bg-primary/[0.06] shadow-[0_0_0_1px_hsl(var(--primary))]'
                          : 'border-border hover:bg-accent/10'
                      }`}
                    >
                      <RadioGroupItem id={inputId} value={String(op.valor)} />
                      <span className="text-sm">{op.rotulo}</span>
                    </label>
                  );
                })}
              </RadioGroup>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col-reverse md:flex-row gap-3 md:justify-between">
        <Button variant="outline" size="lg" onClick={onVoltar} className="h-12 px-8">
          Voltar
        </Button>
        <Button
          size="lg"
          onClick={onContinuar}
          disabled={!todasRespondidas}
          className="h-12 px-8"
        >
          {blocoAtual === totalBlocos - 1 ? 'Revisar' : 'Continuar'}
        </Button>
      </div>
    </div>
  );
}