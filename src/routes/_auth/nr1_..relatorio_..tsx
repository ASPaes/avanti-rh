import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Printer, FileDown } from "lucide-react";
import { toast } from "sonner";
import { renderAsync } from "docx-preview";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  buildDocxBlob,
  exportarRelatorioDocx,
  type ImagensExportacao,
  type RelatorioInput,
} from "@/lib/relatorio-docx";

export const Route = createFileRoute("/_auth/nr1_/relatorio_/")({
  component: RelatorioVisualizarPage,
});

const NAVY = "#234A6E";
const CORAL = "#ED7D6E";

async function carregarLogoComoBytes(url?: string): Promise<Uint8Array | undefined> {
  if (!url) return undefined;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return undefined;
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return undefined;
  }
}

function RelatorioVisualizarPage() {
  const { id: avaliacaoId, relatorioId } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [rel, setRel] = useState<RelatorioInput | null>(null);
  const [imagens, setImagens] = useState<ImagensExportacao>({});
  const [renderizando, setRenderizando] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("nr1_relatorio")
        .select("id, versao, versao_documento, status, gerado_em, conteudo")
        .eq("id", relatorioId)
        .maybeSingle();
      if (cancel) return;
      if (error || !data) {
        toast.error("Não foi possível carregar o relatório.");
        setLoading(false);
        return;
      }
      const logoUrl = (data as { conteudo?: { logo_url?: string } }).conteudo?.logo_url;
      const logo = await carregarLogoComoBytes(logoUrl);
      if (cancel) return;
      setImagens({ logo });
      setRel(data as unknown as RelatorioInput);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [relatorioId]);

  useEffect(() => {
    if (!rel || !containerRef.current) return;
    let cancel = false;
    const host = containerRef.current;
    setRenderizando(true);
    (async () => {
      try {
        const blob = await buildDocxBlob(rel, imagens);
        if (cancel) return;
        host.innerHTML = "";
        await renderAsync(blob, host, undefined, {
          className: "docx",
          inWrapper: true,
          breakPages: true,
          ignoreWidth: false,
          ignoreHeight: false,
        });
      } catch (e) {
        toast.error("Erro ao renderizar a prévia.", {
          description: e instanceof Error ? e.message : "Tente novamente.",
        });
      } finally {
        if (!cancel) setRenderizando(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [rel, imagens]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando relatório…</p>
      </div>
    );
  }

  if (!rel) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">Relatório não encontrado.</p>
        <Button asChild variant="outline">
          <Link to="/nr1/$id/relatorio" params={{ id: avaliacaoId }}>
            <ArrowLeft className="mr-2" />
            Voltar
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .docx-preview-host .docx-wrapper { background: white !important; padding: 0 !important; }
          .docx-preview-host .docx { box-shadow: none !important; margin: 0 !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/nr1/$id/relatorio" params={{ id: avaliacaoId }}>
              <ArrowLeft className="mr-2" />
              Voltar
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            {renderizando && (
              <span className="text-xs text-muted-foreground">Gerando prévia…</span>
            )}
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await exportarRelatorioDocx(rel, imagens);
                } catch (e) {
                  toast.error("Erro ao exportar .docx", {
                    description: e instanceof Error ? e.message : "Tente novamente.",
                  });
                }
              }}
              style={{ borderColor: NAVY, color: NAVY }}
            >
              <FileDown className="mr-2" />
              Exportar .docx
            </Button>
            <Button
              onClick={() => window.print()}
              className="text-white"
              style={{ backgroundColor: CORAL }}
            >
              <Printer className="mr-2" />
              Imprimir / salvar PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <div ref={containerRef} className="docx-preview-host" />
      </div>
    </div>
  );
}
