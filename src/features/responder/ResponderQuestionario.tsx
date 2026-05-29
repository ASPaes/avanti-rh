import { useEffect, useMemo, useState } from 'react';
import type { QuestionarioPayload, SociodemoResposta } from './types';
import { iniciarSessao, submeterResposta, mapearErro } from './api';
import { detectarDispositivo, getUserAgent } from './utils';
import { salvar, carregar, limpar } from './storage';
import { WelcomeStep } from './steps/WelcomeStep';
import { SetorStep } from './steps/SetorStep';
import { SociodemoStep } from './steps/SociodemoStep';
import { QuestoesStep } from './steps/QuestoesStep';
import { ReviewStep } from './steps/ReviewStep';
import { ThanksStep } from './steps/ThanksStep';
import { ProgressBar } from './steps/ProgressBar';
import { Logo } from '@/components/layout/Logo';

type Step = 'loading' | 'welcome' | 'setor' | 'sociodemo' | 'questoes' | 'review' | 'thanks' | 'erro';

const TAMANHO_BLOCO = 10;

interface Props { linkPublico: string }

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function CentralLayout({ children, mostrarProgresso, preenchidos, total, empresaNome }: {
  children: React.ReactNode;
  mostrarProgresso?: boolean;
  preenchidos?: number;
  total?: number;
  empresaNome?: string;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-2xl mx-auto px-6 py-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <Logo size="md" />
            {empresaNome && (
              <span className="text-xs text-muted-foreground truncate max-w-[60%] text-right">
                {empresaNome}
              </span>
            )}
          </div>
          {mostrarProgresso && total !== undefined && preenchidos !== undefined && (
            <ProgressBar preenchidos={preenchidos} total={total} />
          )}
        </div>
      </header>
      <main className="flex-1 flex items-start justify-center px-6 py-10 md:py-16">
        <div className="w-full max-w-2xl animate-fade-in">{children}</div>
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
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const [blocoAtual, setBlocoAtual] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitErro, setSubmitErro] = useState<string | null>(null);
  const [iniciadoEm] = useState(Date.now());
  const [isDevMode, setIsDevMode] = useState(false);

  useEffect(() => {
    setIsDevMode(new URLSearchParams(window.location.search).get('dev') === '1');
  }, []);

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
          setRespostas(salvo.respostas ?? {});
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
      respostas,
      iniciado_em: iniciadoEm,
    });
  }, [step, setorId, sociodemo, respostas, payload, linkPublico, iniciadoEm]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step, blocoAtual]);

  const blocos = useMemo(
    () => payload ? chunk(payload.questoes, TAMANHO_BLOCO) : [],
    [payload]
  );

  const totalQuestoes = payload?.questoes.length ?? 76;
  const totalInputs = 4 + totalQuestoes;
  const sociodemoCount =
    (sociodemo.sexo ? 1 : 0) +
    (sociodemo.faixa_etaria
      ? (sociodemo.faixa_etaria === 'outro' ? (sociodemo.faixa_etaria_outro ? 1 : 0) : 1)
      : 0) +
    (sociodemo.treinamento_rp ? 1 : 0);
  const preenchidos = (setorId ? 1 : 0) + sociodemoCount + Object.keys(respostas).length;

  async function handleSubmit() {
    if (!payload || !setorId) return;
    setSubmitting(true);
    setSubmitErro(null);
    try {
      const respostasArray = Object.entries(respostas).map(([questao_id, valor]) => ({ questao_id, valor }));
      const tempo = Math.floor((Date.now() - iniciadoEm) / 1000);
      const res = await submeterResposta(payload.token_sessao, setorId, sociodemo, respostasArray, tempo);
      if (res.error) {
        setSubmitErro(mapearErro(res.error));
        return;
      }
      limpar(linkPublico);
      setStep('thanks');
    } catch {
      setSubmitErro('Não foi possível enviar agora. Tente novamente em alguns instantes.');
    } finally {
      setSubmitting(false);
    }
  }

  // ------- DEV-ONLY: preencher aleatório -------
  function preencherAleatorio() {
    if (!payload) return;
    const setorRandom = payload.setores[Math.floor(Math.random() * payload.setores.length)];
    setSetorId(setorRandom.id);
    const sociodemoRandom: SociodemoResposta = {
      sexo: Math.random() < 0.5 ? 'masculino' : 'feminino',
      faixa_etaria: Math.random() < 0.5 ? 'ate_38' : 'acima_38',
      treinamento_rp: ['sim_compreendi', 'nao_recebi', 'mais_ou_menos'][
        Math.floor(Math.random() * 3)
      ] as SociodemoResposta['treinamento_rp'],
    };
    setSociodemo(sociodemoRandom);
    const respostasRandom: Record<string, number> = {};
    for (const q of payload.questoes) {
      respostasRandom[q.id] = 1 + Math.floor(Math.random() * 5);
    }
    setRespostas(respostasRandom);
    setBlocoAtual(0);
    setStep('review');
  }

  const renderComDevButton = (node: React.ReactElement) => (
    <>
      {node}
      {isDevMode && payload && step !== 'thanks' && step !== 'erro' && step !== 'loading' && (
        <button
          type="button"
          onClick={preencherAleatorio}
          className="fixed bottom-4 right-4 z-[100] px-3 py-2 rounded-md border-2 border-dashed border-yellow-400 bg-yellow-400 text-black text-[10px] font-mono uppercase tracking-[0.12em] hover:bg-yellow-300 transition-colors shadow-xl font-bold"
          title="Preenche tudo aleatório e vai pra revisão (visível só em DEV)"
        >
          DEV · preencher aleatório → review
        </button>
      )}
    </>
  );

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

  const mostrarProgresso = step !== 'welcome' && step !== 'thanks';
  const layoutProps = {
    mostrarProgresso,
    preenchidos,
    total: totalInputs,
    empresaNome: payload.avaliacao.empresa_nome,
  };

  if (step === 'welcome') {
    return renderComDevButton(
      <CentralLayout empresaNome={payload.avaliacao.empresa_nome}>
        <WelcomeStep payload={payload} onComecar={() => setStep('setor')} />
      </CentralLayout>
    );
  }
  if (step === 'setor') {
    return renderComDevButton(
      <CentralLayout {...layoutProps}>
        <SetorStep
          payload={payload}
          setorIdAtual={setorId}
          onContinuar={(id) => { setSetorId(id); setStep('sociodemo'); }}
        />
      </CentralLayout>
    );
  }
  if (step === 'sociodemo') {
    return renderComDevButton(
      <CentralLayout {...layoutProps}>
        <SociodemoStep
          payload={payload}
          valorAtual={sociodemo}
          onVoltar={() => setStep('setor')}
          onContinuar={(s) => { setSociodemo(s); setBlocoAtual(0); setStep('questoes'); }}
        />
      </CentralLayout>
    );
  }
  if (step === 'questoes') {
    const bloco = blocos[blocoAtual] ?? [];
    return renderComDevButton(
      <CentralLayout {...layoutProps}>
        <QuestoesStep
          questoesBloco={bloco}
          escalas={payload.escalas}
          respostas={respostas}
          onChange={(qid, val) => setRespostas((r) => ({ ...r, [qid]: val }))}
          blocoAtual={blocoAtual}
          totalBlocos={blocos.length}
          onVoltar={() => {
            if (blocoAtual === 0) setStep('sociodemo');
            else setBlocoAtual((n) => n - 1);
          }}
          onContinuar={() => {
            if (blocoAtual === blocos.length - 1) setStep('review');
            else setBlocoAtual((n) => n + 1);
          }}
        />
      </CentralLayout>
    );
  }
  if (step === 'review') {
    return renderComDevButton(
      <CentralLayout {...layoutProps}>
        <ReviewStep
          payload={payload}
          setorId={setorId!}
          sociodemo={sociodemo}
          totalRespondidas={Object.keys(respostas).length}
          totalEsperadas={totalQuestoes}
          submitting={submitting}
          submitErro={submitErro}
          onVoltar={() => { setBlocoAtual(blocos.length - 1); setStep('questoes'); }}
          onEnviar={handleSubmit}
        />
      </CentralLayout>
    );
  }
  if (step === 'thanks') {
    return (
      <CentralLayout empresaNome={payload.avaliacao.empresa_nome}>
        <ThanksStep payload={payload} />
      </CentralLayout>
    );
  }
  return null;
}