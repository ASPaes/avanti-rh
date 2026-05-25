import type { QuestionarioPayload, SociodemoResposta } from '../types';
import { Button } from '@/components/ui/button';

interface Props {
  payload: QuestionarioPayload;
  setorId: string;
  sociodemo: SociodemoResposta;
  totalRespondidas: number;
  totalEsperadas: number;
  submitting: boolean;
  submitErro: string | null;
  onVoltar: () => void;
  onEnviar: () => void;
}

const SEXO_LABEL: Record<string, string> = { masculino: 'Masculino', feminino: 'Feminino' };
const FAIXA_LABEL: Record<string, string> = {
  ate_38: 'Até 38 anos',
  acima_38: 'Acima de 38 anos',
  outro: 'Outro',
};
const TREINAMENTO_LABEL: Record<string, string> = {
  sim_compreendi: 'Sim, compreendi',
  nao_recebi: 'Não recebi',
  mais_ou_menos: 'Mais ou menos',
};

export function ReviewStep({
  payload, setorId, sociodemo, totalRespondidas, totalEsperadas,
  submitting, submitErro, onVoltar, onEnviar,
}: Props) {
  const setor = payload.setores.find((s) => s.id === setorId);
  const completo = totalRespondidas === totalEsperadas;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Revisão final
        </p>
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight leading-tight">
          Tudo pronto para enviar?
        </h2>
        <p className="text-sm text-muted-foreground">
          Confira o resumo abaixo. Após enviar, não é possível alterar.
        </p>
      </div>

      <div className="rounded-md border border-border divide-y divide-border">
        <ResumoLinha rotulo="Setor" valor={setor?.nome ?? '—'} />
        <ResumoLinha rotulo="Sexo" valor={sociodemo.sexo ? SEXO_LABEL[sociodemo.sexo] : '—'} />
        <ResumoLinha
          rotulo="Faixa etária"
          valor={
            sociodemo.faixa_etaria === 'outro'
              ? `Outro: ${sociodemo.faixa_etaria_outro ?? ''}`
              : sociodemo.faixa_etaria
                ? FAIXA_LABEL[sociodemo.faixa_etaria]
                : '—'
          }
        />
        <ResumoLinha
          rotulo="Treinamento de riscos psicossociais"
          valor={sociodemo.treinamento_rp ? TREINAMENTO_LABEL[sociodemo.treinamento_rp] : '—'}
        />
        <ResumoLinha rotulo="Questões respondidas" valor={`${totalRespondidas} de ${totalEsperadas}`} />
      </div>

      {!completo && (
        <p className="text-sm text-destructive">
          Faltam {totalEsperadas - totalRespondidas} respostas. Volte para completá-las.
        </p>
      )}

      {submitErro && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {submitErro}
        </div>
      )}

      <div className="flex flex-col-reverse md:flex-row gap-3 md:justify-between">
        <Button variant="outline" size="lg" onClick={onVoltar} disabled={submitting} className="h-12 px-8">
          Voltar
        </Button>
        <Button size="lg" onClick={onEnviar} disabled={!completo || submitting} className="h-12 px-8">
          {submitting ? 'Enviando…' : 'Enviar respostas'}
        </Button>
      </div>
    </div>
  );
}

function ResumoLinha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <span className="text-sm text-muted-foreground">{rotulo}</span>
      <span className="text-sm font-medium text-right">{valor}</span>
    </div>
  );
}