# Task 2-c: Dark Mode Agent Work Record

## Task
Add dark mode support + deep theme adaptation for the "Philosophy for Life's Troubles" app.

## What Was Done

### 1. ThemeProvider Setup (layout.tsx)
- Added `ThemeProvider` from `next-themes` wrapping the app
- Configured with `attribute="class"`, `defaultTheme="light"`, `enableSystem={false}`
- `suppressHydrationWarning` was already on the html tag

### 2. CSS Custom Properties (globals.css)
Defined 40+ CSS custom properties across two themes:

**Light mode (warm vintage):**
- --app-bg: #FAF5EB, --app-bg-card: #F5E6CC, --app-accent: #C9A96E
- --app-text-primary: #3D2B1F, --app-text-secondary: #6B5344, --app-text-muted: #8B7355
- --app-border: #E8D5B7, --app-overlay: rgba(0,0,0,0.3)

**Dark mode (deep warm dark):**
- --app-bg: #1A1614, --app-bg-card: #2A2320, --app-accent: #D4B87A
- --app-text-primary: #F0E6D6, --app-text-secondary: #B8A898, --app-text-muted: #8B7D72
- --app-border: #3D352F, --app-overlay: rgba(0,0,0,0.6)

**Category badges** have separate light/dark variants for all 4 categories.

### 3. ThemeToggle Component
- Uses Sun/Moon icons from lucide-react
- Hydration-safe with mounted state check
- Adds `theme-transitioning` class for smooth 300ms CSS transitions
- Placed in: main header, chat header, debate header, quiz header, footer

### 4. All Components Updated
Every hardcoded hex color replaced with CSS variable reference:
- `bg-[#FAF5EB]` → `bg-[var(--app-bg)]`
- `text-[#3D2B1F]` → `text-[var(--app-text-primary)]`
- `bg-[#F5E6CC]` → `bg-[var(--app-bg-card)]`
- `border-[#E8D5B7]` → `border-[var(--app-border)]`
- `text-[#C9A96E]` → `text-[var(--app-accent)]`
- `bg-[#C9A96E]` → `bg-[var(--app-accent)]`
- And many more...

### 5. Special Cases
- Scrollbar adapts via --scrollbar-thumb / --scrollbar-thumb-hover
- Progress bar uses --progress-bg and --progress-fill
- Modal overlay uses --app-overlay (0.3 opacity light / 0.6 dark)
- Category badges use CSS variables (--badge-amber-bg, --badge-amber-text, etc.)
- Gradient backgrounds for philosopher detail use CSS variables

## Files Modified
- `/home/z/my-project/src/app/layout.tsx` - ThemeProvider
- `/home/z/my-project/src/app/globals.css` - CSS custom properties
- `/home/z/my-project/src/app/page.tsx` - CSS vars + ThemeToggle
- `/home/z/my-project/src/components/hero.tsx` - CSS vars
- `/home/z/my-project/src/components/philosopher-grid.tsx` - CSS vars
- `/home/z/my-project/src/components/philosopher-detail.tsx` - CSS vars
- `/home/z/my-project/src/components/chat-interface.tsx` - CSS vars + ThemeToggle
- `/home/z/my-project/src/components/debate-interface.tsx` - CSS vars + ThemeToggle
- `/home/z/my-project/src/components/quiz.tsx` - CSS vars + ThemeToggle
- `/home/z/my-project/src/components/footer.tsx` - CSS vars + ThemeToggle

## Files Created
- `/home/z/my-project/src/components/theme-toggle.tsx` - Theme toggle button component

## Verification
- `bun run lint` passes cleanly
- Dev server compiles and returns 200
