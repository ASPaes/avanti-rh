import { useState } from 'react';
import type { QuestionarioPayload } from '../types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export function SetorStep({
  payload,
  setorIdAtual,
  onContinuar,
}: {
  payload: QuestionarioPayload;
  setorIdAtual: string | null;
  onContinuar: (id: string) => void;
}) {
  const [setorId, setSetorId] = useState<string | null>(setorIdAtual);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          Etapa 1 de 3
        </p>
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
          Em qual setor você trabalha?
        </h2>
        <p className="text-sm text-muted-foreground">
          Esta informação ajuda a agrupar respostas. Continua anônimo.
        </p>
      </div>

      <RadioGroup
        value={setorId ?? ''}
        onValueChange={(v) => setSetorId(v)}
        className="space-y-2"
      >
        {payload.setores.map((s) => (
          <Label
            key={s.id}
            htmlFor={`setor-${s.id}`}
            className="flex items-center gap-3 px-4 py-3.5 border border-border rounded-md cursor-pointer transition-all duration-150 hover:bg-accent/10 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/[0.06] has-[[data-state=checked]]:shadow-[0_0_0_1px_hsl(var(--primary))]"
          >
            <RadioGroupItem id={`setor-${s.id}`} value={s.id} />
            <span className="text-sm font-normal">{s.nome}</span>
          </Label>
        ))}
      </RadioGroup>

      <Button
        onClick={() => setorId && onContinuar(setorId)}
        disabled={!setorId}
        size="lg"
        className="w-full md:w-auto h-12 px-8"
      >
        Continuar
      </Button>
    </div>
  );
}