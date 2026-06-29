import { Check, Loader2, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  titulo: string;
  texto: string;
  geradoPorIa: boolean;
  carregandoIA: boolean;
  salvando: boolean;
  onTextoChange: (v: string) => void;
  onGerar: () => void;
  onAprovar: () => void;
  onSalvar: () => void;
}

export function AnaliseDimensaoCard({
  titulo,
  texto,
  geradoPorIa,
  carregandoIA,
  salvando,
  onTextoChange,
  onGerar,
  onAprovar,
  onSalvar,
}: Props) {
  const ocupado = carregandoIA || salvando;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-sm">
          <span>{titulo}</span>
          {geradoPorIa && (
            <Badge variant="outline" className="text-[11px]">
              Gerado por IA — revisar
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={texto}
          onChange={(e) => onTextoChange(e.target.value)}
          placeholder="Descreva a análise…"
          className="min-h-28 text-[13px]"
        />
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onGerar} disabled={ocupado}>
            {carregandoIA ? (
              <Loader2 className="animate-spin mr-1.5" size={14} />
            ) : (
              <Sparkles size={14} className="mr-1.5" />
            )}
            Gerar com IA
          </Button>
          {geradoPorIa && (
            <Button
              type="button"
              size="sm"
              onClick={onAprovar}
              disabled={ocupado}
              className="bg-[#ED7D6E] hover:bg-[#d96b5c] text-white"
            >
              <Check size={14} className="mr-1.5" /> Aprovar
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={onSalvar}
            disabled={ocupado}
            className="bg-[#234A6E] hover:bg-[#1a3a58] text-white"
          >
            {salvando ? (
              <Loader2 className="animate-spin mr-1.5" size={14} />
            ) : (
              <Save size={14} className="mr-1.5" />
            )}
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}