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
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Etapa 1 de 3 · Setor
        </p>
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight leading-tight">
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
            className="flex items-center gap-3 rounded-md border border-border p-4 cursor-pointer hover:bg-accent transition-colors"
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