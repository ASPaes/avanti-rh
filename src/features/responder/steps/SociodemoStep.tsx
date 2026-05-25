import { useState } from 'react';
import type { QuestionarioPayload, SociodemoResposta } from '../types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export function SociodemoStep({
  payload,
  valorAtual,
  onVoltar,
  onContinuar,
}: {
  payload: QuestionarioPayload;
  valorAtual: SociodemoResposta;
  onVoltar: () => void;
  onContinuar: (s: SociodemoResposta) => void;
}) {
  const [s, setS] = useState<SociodemoResposta>(valorAtual);

  const completo =
    !!s.sexo &&
    !!s.faixa_etaria &&
    !!s.treinamento_rp &&
    (s.faixa_etaria !== 'outro' || !!s.faixa_etaria_outro?.trim());

  function renderOpcoes(
    q: QuestionarioPayload['sociodemo'][number],
    valor: string | undefined,
    onChange: (v: string) => void,
  ) {
    return (
      <RadioGroup value={valor ?? ''} onValueChange={onChange} className="space-y-2">
        {q.opcoes.map((op) => (
          <Label
            key={op.valor}
            htmlFor={`${q.codigo}-${op.valor}`}
            className="flex items-center gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-accent transition-colors"
          >
            <RadioGroupItem id={`${q.codigo}-${op.valor}`} value={op.valor} />
            <span className="text-sm font-normal">{op.rotulo}</span>
          </Label>
        ))}
      </RadioGroup>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Etapa 2 de 3 · Dados gerais
        </p>
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight leading-tight">
          Sobre você
        </h2>
        <p className="text-sm text-muted-foreground">
          Apenas 3 informações gerais. Continua anônimo.
        </p>
      </div>

      {payload.sociodemo.map((q) => {
        if (q.codigo === 'sociodemo_sexo') {
          return (
            <div key={q.id} className="space-y-3">
              <p className="text-sm font-medium">{q.texto}</p>
              {renderOpcoes(q, s.sexo, (v) =>
                setS({ ...s, sexo: v as 'masculino' | 'feminino' }),
              )}
            </div>
          );
        }
        if (q.codigo === 'sociodemo_faixa_etaria') {
          return (
            <div key={q.id} className="space-y-3">
              <p className="text-sm font-medium">{q.texto}</p>
              {renderOpcoes(q, s.faixa_etaria, (v) =>
                setS({
                  ...s,
                  faixa_etaria: v as 'ate_38' | 'acima_38' | 'outro',
                  faixa_etaria_outro: v === 'outro' ? s.faixa_etaria_outro : undefined,
                }),
              )}
              {s.faixa_etaria === 'outro' && (
                <Input
                  placeholder="Informe sua faixa etária"
                  value={s.faixa_etaria_outro ?? ''}
                  onChange={(e) => setS({ ...s, faixa_etaria_outro: e.target.value })}
                  className="mt-2"
                />
              )}
            </div>
          );
        }
        if (q.codigo === 'sociodemo_treinamento_rp') {
          return (
            <div key={q.id} className="space-y-3">
              <p className="text-sm font-medium">{q.texto}</p>
              {renderOpcoes(q, s.treinamento_rp, (v) =>
                setS({
                  ...s,
                  treinamento_rp: v as 'sim_compreendi' | 'nao_recebi' | 'mais_ou_menos',
                }),
              )}
            </div>
          );
        }
        return null;
      })}

      <div className="flex gap-3">
        <Button variant="outline" size="lg" className="h-12 px-6" onClick={onVoltar}>
          Voltar
        </Button>
        <Button
          onClick={() => onContinuar(s)}
          disabled={!completo}
          size="lg"
          className="flex-1 md:flex-none h-12 px-8"
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}