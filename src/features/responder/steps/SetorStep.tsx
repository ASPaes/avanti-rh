import { useState } from 'react';
import type { QuestionarioPayload } from '../types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

  // Defensivo: avaliação sem setor configurado.
  if (payload.setores.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
          Avaliação sem setor configurado
        </h2>
        <p className="text-sm text-muted-foreground">
          Esta avaliação ainda não tem setor configurado. Contate o RH responsável
          para que ele finalize a configuração antes de você responder.
        </p>
      </div>
    );
  }

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

      <div className="space-y-2">
        <Label htmlFor="setor-select" className="text-sm font-medium">
          Setor
        </Label>
        <Select value={setorId ?? ''} onValueChange={(v) => setSetorId(v)}>
          <SelectTrigger id="setor-select" className="h-11">
            <SelectValue placeholder="Selecione seu setor" />
          </SelectTrigger>
          <SelectContent>
            {payload.setores.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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