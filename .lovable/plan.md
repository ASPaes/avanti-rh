## Adaptação necessária ao stack real

O prompt foi escrito assumindo Vite + React Router + `index.html` + `src/index.css` + `tailwind.config.ts`. Este projeto é **TanStack Start + Tailwind v4**, então alguns arquivos do prompt não existem aqui. Vou adaptar mantendo 100% das decisões de design (paleta, fontes Geist, tokens, dark default, Logo, ThemeToggle), apenas movendo para os arquivos corretos.

### Diferenças e como vou tratar

- **Sem `index.html`** → fontes Geist entram via `head.links` em `src/routes/__root.tsx` (preconnect + stylesheet Google Fonts). Classe `dark` aplicada no `<html>` dentro de `shellComponent`.
- **Sem `src/index.css`** → tokens vão para `src/styles.css` (já existente), no formato Tailwind v4 (`@theme inline` + `:root`/`.dark`). Vou converter os valores HSL do prompt para o formato que o projeto usa, mantendo exatamente as mesmas cores.
- **Sem `tailwind.config.ts`** (Tailwind v4 usa CSS-first) → fontes e cores semânticas extras (`surface`, `surface-elevated`, `success`, `warning`) registradas em `@theme inline` em `src/styles.css`.
- **Sem React Router / `src/pages/`** → a página de validação vai em `src/routes/index.tsx` (substituindo o placeholder). Não vou criar `src/pages/` (proibido em TanStack Start).
- **Sem `main.tsx`** → `ThemeProvider` envolve o app em `src/routes/__root.tsx` (dentro de `RootComponent`, em volta do `QueryClientProvider`).

### Arquivos a criar/modificar

1. `src/styles.css` — substituir tokens pela paleta Conecta (coral `7 78% 68%` primary, navy `210 53% 28%` secondary), adicionar `surface`, `surface-elevated`, `success`, `warning`, registrar `font-sans: Geist` e `font-mono: Geist Mono` no `@theme inline`, ajustar `body` font-feature-settings.
2. `src/routes/__root.tsx` — adicionar `<link>` Geist nos `head.links`, montar `<html class="dark">` no `shellComponent`, envolver `<Outlet />` com `<ThemeProvider>`.
3. `src/contexts/ThemeContext.tsx` — `ThemeProvider` + `useTheme()`, persistência `localStorage['avanti-theme']`, default `dark`, toggla classe no `documentElement`. SSR-safe (ler `localStorage` só em `useEffect`).
4. `src/components/theme/ThemeToggle.tsx` — Button ghost icon com Sun/Moon (lucide).
5. `src/components/layout/Logo.tsx` — `avanti` em `text-primary` + `.` em `text-muted-foreground` + `rh` em `text-secondary`, tamanhos sm/md/lg conforme prompt.
6. `src/hooks/.gitkeep` e `src/lib/.gitkeep` — pastas vazias (na verdade `src/lib/utils.ts` já existe, então só `src/hooks/` precisa — mas `use-mobile.tsx` já está lá; nada a fazer).
7. `src/routes/index.tsx` — tela de validação: Logo centralizada, texto "Setup carregado.", três botões (default/secondary/outline), `<ThemeToggle />` no canto superior direito.

### Regras que vou seguir

- Sentence case em toda UI.
- Nenhuma fonte Inter; apenas Geist / Geist Mono.
- Nenhuma instalação de pacote novo (Sun/Moon vêm de `lucide-react` já presente; `sonner` já presente).
- Não tocar em `src/components/ui/*`, schema do Supabase, nem criar Auth/Sidebar/Layout (Parte 2).
- Nenhum `select('*')` (não há queries nesta parte).

### Validação

Após a implementação vou abrir o preview para confirmar: fundo `#0A0A0A` no dark, Logo com coral+navy, toggle alternando tema e persistindo, botões nas cores corretas, sem erros de console/TS.
