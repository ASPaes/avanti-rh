import type { QuestionarioPayload } from '../types';
import { formatarDataFim } from '../utils';
import { Button } from '@/components/ui/button';
import { Clock, ShieldCheck, FileText } from 'lucide-react';

export function WelcomeStep({
  payload,
  onComecar,
}: {
  payload: QuestionarioPayload;
  onComecar: () => void;
}) {
  return (
    <div className="space-y-10 relative">
      <div className="space-y-4 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            Avaliação psicossocial · NR-1
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
          {payload.avaliacao.empresa_nome}
        </h1>
        <p className="text-sm text-muted-foreground">
          {payload.avaliacao.empresa_razao_social}
        </p>
      </div>

      <div className="animate-fade-in-delayed-1">
        <p className="text-base leading-relaxed text-foreground">
          Sua participação ajuda a identificar fatores de risco no ambiente de
          trabalho. Os resultados serão usados para apoiar decisões de cuidado
          coletivo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-fade-in-delayed-2">
        <InfoCard icon={<FileText className="h-4 w-4" />} label="Questões" value="76 + 3" />
        <InfoCard icon={<Clock className="h-4 w-4" />} label="Tempo estimado" value="10 minutos" />
        <InfoCard icon={<ShieldCheck className="h-4 w-4" />} label="Sigilo" value="100% anônimo" />
      </div>

      <div className="space-y-3 animate-fade-in-delayed-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Não pedimos seu nome, CPF ou qualquer dado que te identifique. Os
          resultados são analisados em grupo, com mínimo de 5 respondentes
          por agrupamento.
        </p>
        <p className="text-sm">
          Prazo final:{' '}
          <span className="font-medium">{formatarDataFim(payload.avaliacao.data_fim)}</span>
        </p>
      </div>

      <div className="animate-fade-in-delayed-3">
        <Button onClick={onComecar} size="lg" className="w-full md:w-auto h-12 px-8">
          Começar
        </Button>
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border border-border rounded-md p-4 bg-surface/30 space-y-2">
      <div className="text-muted-foreground">{icon}</div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}