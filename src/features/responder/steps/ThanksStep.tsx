import type { QuestionarioPayload } from '../types';
import { Heart } from 'lucide-react';

export function ThanksStep({ payload }: { payload: QuestionarioPayload }) {
  return (
    <div className="space-y-10">
      <div className="space-y-4 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface">
          <Heart className="h-3 w-3 text-primary" />
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            Resposta registrada
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
          Sua voz foi registrada.
        </h1>
        <p className="text-base leading-relaxed text-foreground">
          Obrigado por dedicar este momento. Suas respostas se somam às de
          seus colegas para construir um ambiente de trabalho mais saudável
          em <span className="font-medium">{payload.avaliacao.empresa_nome}</span>.
        </p>
      </div>

      <div className="space-y-4 animate-fade-in-delayed-1">
        <Bloco
          eyebrow="O que acontece agora"
          texto="As respostas são agrupadas com as de outros colegas e analisadas em conjunto, sem identificação individual. Os resultados serão apresentados como parte do plano de cuidado coletivo da empresa."
        />
        <Bloco
          eyebrow="Se precisar conversar"
          texto="Cuidar da própria saúde mental também é importante. Se este questionário trouxe questões que você gostaria de conversar com alguém, considere os recursos abaixo."
        />
      </div>

      <div className="border border-border rounded-md p-5 space-y-3 animate-fade-in-delayed-2 bg-surface/30">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          Recursos de apoio
        </p>
        <p className="text-sm leading-relaxed">
          <span className="font-medium text-foreground">CVV · 188</span>
          <span className="text-muted-foreground"> — Centro de Valorização da Vida, ligação gratuita, 24h</span>
        </p>
        <p className="text-sm leading-relaxed">
          <a
            href="https://www.cvv.org.br"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-primary transition-colors underline-offset-4 hover:underline font-medium"
          >
            cvv.org.br
          </a>
          <span className="text-muted-foreground"> — Chat e atendimento online</span>
        </p>
      </div>

      <div className="pt-4 border-t border-border animate-fade-in-delayed-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Avaliação conduzida conforme NR-1 e ISO 45003. Dados protegidos
          pela LGPD. Você pode fechar esta página.
        </p>
      </div>
    </div>
  );
}

function Bloco({ eyebrow, texto, icon }: { eyebrow: string; texto: string; icon?: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          {eyebrow}
        </p>
      </div>
      <p className="text-sm leading-relaxed text-foreground">{texto}</p>
    </div>
  );
}