import { useEffect, useState } from 'react';
import type { QuestionarioPayload, SociodemoResposta } from './types';
import { iniciarSessao, mapearErro } from './api';
import { detectarDispositivo, getUserAgent } from './utils';
import { salvar, carregar } from './storage';
import { WelcomeStep } from './steps/WelcomeStep';
import { SetorStep } from './steps/SetorStep';
import { SociodemoStep } from './steps/SociodemoStep';
import { Logo } from '@/components/layout/Logo';

type Step = 'loading' | 'welcome' | 'setor' | 'sociodemo' | 'questoes_pendente' | 'erro';

interface Props { linkPublico: string }

function CentralLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <Logo size="sm" />
        </div>
      </header>
      <main className="flex-1 flex items-start justify-center px-6 py-10 md:py-16">
        <div className="w-full max-w-2xl">{children}</div>
      </main>
    </div>
  );
}

export function ResponderQuestionario({ linkPublico }: Props) {
  const [step, setStep] = useState<Step>('loading');
  const [payload, setPayload] = useState<QuestionarioPayload | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [setorId, setSetorId] = useState<string | null>(null);
  const [sociodemo, setSociodemo] = useState<SociodemoResposta>({});
  const [iniciadoEm] = useState(Date.now());

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await iniciarSessao(linkPublico, detectarDispositivo(), getUserAgent());
        if (!mounted) return;
        if ('error' in resp) {
          setErro(mapearErro(resp.error));
          setStep('erro');
          return;
        }
        setPayload(resp);
        const salvo = carregar(linkPublico);
        if (salvo && salvo.token_sessao === resp.token_sessao) {
          setSetorId(salvo.setor_id ?? null);
          setSociodemo(salvo.sociodemo ?? {});
          setStep((salvo.passo_atual as Step) || 'welcome');
        } else {
          setStep('welcome');
        }
      } catch {
        if (!mounted) return;
        setErro('Não foi possível conectar agora. Verifique sua internet e tente novamente.');
        setStep('erro');
      }
    })();
    return () => { mounted = false; };
  }, [linkPublico]);

  useEffect(() => {
    if (!payload) return;
    salvar(linkPublico, {
      token_sessao: payload.token_sessao,
      passo_atual: step,
      setor_id: setorId ?? undefined,
      sociodemo,
      respostas: {},
      iniciado_em: iniciadoEm,
    });
  }, [step, setorId, sociodemo, payload, linkPublico, iniciadoEm]);

  if (step === 'loading') {
    return (
      <CentralLayout>
        <p className="text-sm text-muted-foreground">Carregando questionário…</p>
      </CentralLayout>
    );
  }

  if (step === 'erro') {
    return (
      <CentralLayout>
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight">Não foi possível continuar</h1>
          <p className="text-sm text-muted-foreground">{erro}</p>
        </div>
      </CentralLayout>
    );
  }

  if (!payload) return null;

  if (step === 'welcome') {
    return (
      <CentralLayout>
        <WelcomeStep payload={payload} onComecar={() => setStep('setor')} />
      </CentralLayout>
    );
  }
  if (step === 'setor') {
    return (
      <CentralLayout>
        <SetorStep
          payload={payload}
          setorIdAtual={setorId}
          onContinuar={(id) => { setSetorId(id); setStep('sociodemo'); }}
        />
      </CentralLayout>
    );
  }
  if (step === 'sociodemo') {
    return (
      <CentralLayout>
        <SociodemoStep
          payload={payload}
          valorAtual={sociodemo}
          onVoltar={() => setStep('setor')}
          onContinuar={(s) => { setSociodemo(s); setStep('questoes_pendente'); }}
        />
      </CentralLayout>
    );
  }
  if (step === 'questoes_pendente') {
    return (
      <CentralLayout>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Próxima etapa</h2>
          <p className="text-sm text-muted-foreground">
            As 76 questões serão implementadas na próxima parte. Por enquanto, dados salvos:
          </p>
          <pre className="text-xs bg-muted p-4 rounded-md overflow-auto">
            {JSON.stringify({ setorId, sociodemo }, null, 2)}
          </pre>
        </div>
      </CentralLayout>
    );
  }
  return null;
}