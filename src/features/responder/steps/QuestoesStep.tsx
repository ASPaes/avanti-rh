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
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Etapa 3 de 3 · Parte {blocoAtual + 1} de {totalBlocos}
        </p>
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight leading-tight">
          Responda pensando no seu dia a dia
        </h2>
      </div>

      <div className="space-y-8">
        {questoesBloco.map((q) => {
          const escala = escalas[q.escala_codigo];
          if (!escala) return null;
          const valorAtual = respostas[q.id];

          return (
            <div key={q.id} className="space-y-3">
              <p className="text-sm font-medium leading-relaxed">
                <span className="text-muted-foreground mr-2">{q.numero}.</span>
                {q.texto}
              </p>

              <RadioGroup
                value={valorAtual !== undefined ? String(valorAtual) : ''}
                onValueChange={(v) => onChange(q.id, parseInt(v, 10))}
                className="space-y-2"
              >
                {escala.opcoes.map((op) => {
                  const inputId = `q-${q.id}-${op.valor}`;
                  const selecionado = valorAtual === op.valor;
                  return (
                    <label
                      key={op.valor}
                      htmlFor={inputId}
                      className={`flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                        selecionado ? 'border-primary bg-accent' : 'border-border hover:bg-accent/50'
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