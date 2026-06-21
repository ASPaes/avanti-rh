ALTER TABLE public.nr1_indicador_epidemiologico
ADD COLUMN IF NOT EXISTS status_indicadores jsonb NOT NULL DEFAULT '{}'::jsonb;