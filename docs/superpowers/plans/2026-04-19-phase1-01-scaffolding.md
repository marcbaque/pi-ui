# pi-ui Phase 1 — Plan 1: Scaffolding & Toolchain

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the Electron + Vite + React + TypeScript project with ESLint, Prettier, Husky, Vitest, and Tailwind, so every subsequent plan has a working build and test environment.

**Architecture:** electron-vite manages the three-process build (main/preload/renderer). ESLint + Prettier enforce style. Husky runs lint-staged on commit and typecheck + tests on push. Vitest runs main-process tests in `node` env and renderer tests in `jsdom` env.

**Tech Stack:** Electron 41, electron-vite 5, React 19, TypeScript 6, Tailwind CSS 4, shadcn/ui, Vitest 4, ESLint 9 (flat config), Prettier 3, Husky 9, lint-staged 16. **Package manager: pnpm.**

---

### Task 1: Directory structure + package.json

**Files:**
- Create: `package.json`
- Create: `src/main/.gitkeep`
- Create: `src/preload/.gitkeep`
- Create: `src/shared/.gitkeep`
- Create: `src/renderer/index.html`
- Create: `src/renderer/src/main.tsx`
- Create: `src/renderer/src/App.tsx`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "pi-ui",
  "version": "0.1.0",
  "description": "Desktop UI for the pi coding agent",
  "main": "out/main/index.js",
  "type": "module",
  "packageManager": "pnpm@10.29.1",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "start": "electron-vite preview",
    "test": "vitest",
    "test:run": "vitest run",
    "coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --max-warnings 0",
    "lint:fix": "eslint src --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,json,css}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,json,css}\"",
    "check": "pnpm typecheck && pnpm lint && pnpm test:run"
  },
  "pnpm": {
    "onlyBuiltDependencies": ["electron", "esbuild", "koffi", "protobufjs"]
  }
}
```

> **Note:** `lint-staged` config lives in `.lintstagedrc.cjs` (CommonJS, uses `pnpm eslint` / `pnpm prettier`).

- [ ] **Step 2: Install all dependencies**

```bash
# Runtime
pnpm add electron @mariozechner/pi-coding-agent react react-dom zustand

# Build (pin vite@7 — electron-vite 5 requires vite ^5||^6||^7, not vite 8)
pnpm add -D electron-vite vite@7 @vitejs/plugin-react@4 typescript @types/node @types/react @types/react-dom @electron-toolkit/utils

# Styling
pnpm add class-variance-authority clsx tailwind-merge lucide-react
pnpm add -D tailwindcss autoprefixer postcss

# Testing (@testing-library/dom must be added explicitly in pnpm)
pnpm add -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom jsdom

# Linting / Formatting
pnpm add -D @eslint/js@^9 eslint globals @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-react eslint-plugin-react-hooks eslint-config-prettier prettier husky lint-staged
```

> **Note:** `@eslint/js` must be pinned to `^9` to match `eslint@9`. Installing `@eslint/js@latest` pulls v10 which requires eslint 10.

- [ ] **Step 3: Create renderer entry files**

`src/renderer/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'" />
    <title>pi-ui</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/renderer/src/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './assets/main.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

`src/renderer/src/App.tsx`:
```tsx
export default function App() {
  return (
    <div className="flex h-screen bg-[#0f0f0f] text-[#e0e0e0]">
      <p className="m-auto text-sm text-zinc-500">pi-ui loading…</p>
    </div>
  )
}
```

- [ ] **Step 4: Create placeholder directories**

```bash
touch src/main/.gitkeep src/preload/.gitkeep src/shared/.gitkeep
mkdir -p src/renderer/src/assets src/renderer/src/components src/renderer/src/store src/renderer/src/hooks src/renderer/src/lib
```

- [ ] **Step 5: Add `.gitignore`** (before committing — pnpm doesn't auto-create one)

```
node_modules/
out/
dist/
.DS_Store
*.log
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: initial project structure and dependencies"
```

---

### Task 2: Build config (electron-vite + TypeScript)

**Files:**
- Create: `electron.vite.config.ts`
- Create: `tsconfig.json`

- [ ] **Step 1: Create electron.vite.config.ts**

```typescript
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: { '@shared': resolve('src/shared') },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: { '@shared': resolve('src/shared') },
    },
  },
  renderer: {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve('src/renderer/src'),
        '@shared': resolve('src/shared'),
      },
    },
    css: { postcss: './postcss.config.js' },
  },
})
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vitest/globals"],
    "ignoreDeprecations": "6.0",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/renderer/src/*"],
      "@shared/*": ["src/shared/*"]
    }
  },
  "include": ["src/**/*", "electron.vite.config.*", "vitest.config.*"]
}
```

> **Note:** `ignoreDeprecations: "6.0"` is required because TypeScript 6 deprecated `baseUrl` without `paths`. `types: ["vitest/globals"]` provides `describe`/`it`/`expect` without importing them.

- [ ] **Step 3b: Create `src/renderer/src/vite-env.d.ts`** (required for CSS side-effect imports)

```typescript
/// <reference types="vite/client" />
```

- [ ] **Step 3: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add electron.vite.config.ts tsconfig.json src/renderer/src/vite-env.d.ts
git commit -m "chore: add electron-vite and TypeScript config"
```

---

### Task 3: Code quality (ESLint + Prettier + Husky)

**Files:**
- Create: `eslint.config.js` (ESLint 9 flat config — no `.eslintrc.cjs`)
- Create: `.lintstagedrc.cjs`
- Create: `.prettierrc`
- Create: `.prettierignore`

- [ ] **Step 1: Create `eslint.config.js`**

```js
import js from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'

export default [
  {
    ignores: ['out/', 'node_modules/', '*.config.js', '*.config.cjs', '.lintstagedrc.cjs'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      globals: { ...globals.browser, ...globals.node, ...globals.es2022 },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}', 'src/**/test-setup.ts'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: { 'no-undef': 'off' }, // vitest globals handled by TypeScript types
  },
  prettierConfig,
]
```

- [ ] **Step 2: Create .prettierrc**

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

- [ ] **Step 3: Create .prettierignore**

```
out/
node_modules/
*.md
```

- [ ] **Step 2b: Create `.lintstagedrc.cjs`**

```js
module.exports = {
  'src/**/*.{ts,tsx}': (files) => {
    const escaped = files.map((f) => `"${f}"`).join(' ')
    return [
      `pnpm eslint --fix --max-warnings 0 ${escaped}`,
      `pnpm prettier --write ${escaped}`,
    ]
  },
  'src/**/*.{json,css}': (files) => {
    const escaped = files.map((f) => `"${f}"`).join(' ')
    return [`pnpm prettier --write ${escaped}`]
  },
}
```

- [ ] **Step 4: Verify lint passes**

```bash
pnpm lint
```

Expected: no errors (only `App.tsx` exists and it's clean).

- [ ] **Step 5: Set up Husky**

```bash
pnpm husky init
```

Replace `.husky/pre-commit` with (Husky 9 format — no shebang):
```
pnpm lint-staged
```

Create `.husky/pre-push`:
```
pnpm typecheck && pnpm test:run
```

- [ ] **Step 6: Commit**

```bash
git add eslint.config.js .lintstagedrc.cjs .prettierrc .prettierignore .husky/
git commit -m "chore: add ESLint, Prettier, and Husky pre-commit hooks"
```

---

### Task 4: Test config (Vitest)

**Files:**
- Create: `vitest.config.ts`
- Create: `src/renderer/src/test-setup.ts`

- [ ] **Step 1: Create vitest.config.ts**

```typescript
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve('src/renderer/src'),
      '@shared': resolve('src/shared'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',  // global default; main/preload/shared tests use `// @vitest-environment node`
    setupFiles: ['src/renderer/src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/renderer/src/test-setup.ts',
        'src/renderer/src/main.tsx',
        'src/**/*.d.ts',
      ],
      thresholds: { lines: 70, functions: 70 },
    },
  },
})
```

> **Note:** `environmentMatchGlobs` was removed — it does not exist in Vitest 4's `InlineConfig` type. Main-process test files opt into `node` environment with `// @vitest-environment node` at the top of the file.

- [ ] **Step 2: Create test-setup.ts**

```typescript
// src/renderer/src/test-setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 3: Write a smoke test to verify the setup**

`src/renderer/src/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    expect(screen.getByText('pi-ui loading…')).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Run the test**

```bash
pnpm test:run
```

Expected output:
```
✓ src/renderer/src/App.test.tsx (1)
  ✓ App > renders without crashing

Test Files  1 passed (1)
Tests       1 passed (1)
```

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts src/renderer/src/test-setup.ts src/renderer/src/App.test.tsx
git commit -m "chore: add Vitest config and smoke test"
```

---

### Task 3b: Post-install warnings resolved

These were addressed during the implementation and do not require manual steps for future workers, but are documented here for reference:

- **`@eslint/js` peer dep:** Pinned to `^9` (matches eslint 9). `@eslint/js@10` requires eslint 10.
- **Electron audit CVEs:** Resolved by upgrading from Electron 33 → 41.
- **pnpm build script approval:** `pnpm.onlyBuiltDependencies` in `package.json` pre-approves `electron`, `esbuild`, `koffi`, `protobufjs` so `pnpm install` downloads the Electron binary without interactive prompts.

---

### Task 5: Tailwind CSS + shadcn/ui

**Files:**
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `src/renderer/src/assets/main.css`
- Create: `components.json`
- Create: `src/renderer/src/lib/utils.ts`

- [ ] **Step 1: Create Tailwind config files**

`tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/renderer/src/**/*.{ts,tsx}', './src/renderer/index.html'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}
```

`postcss.config.js`:
```js
module.exports = {
  plugins: { tailwindcss: {}, autoprefixer: {} },
}
```

- [ ] **Step 2: Create global CSS with dark theme variables**

`src/renderer/src/assets/main.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 6%;
    --foreground: 0 0% 88%;
    --muted: 0 0% 12%;
    --muted-foreground: 0 0% 53%;
    --border: 0 0% 14%;
    --input: 0 0% 14%;
    --ring: 142 71% 45%;
    --primary: 142 71% 45%;
    --primary-foreground: 0 0% 6%;
    --radius: 0.375rem;
  }
}

* {
  @apply border-border;
}

body {
  @apply bg-background text-foreground;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
}
```

- [ ] **Step 3: Create shadcn/ui utils**

`src/renderer/src/lib/utils.ts`:
```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 4: Create components.json for shadcn/ui**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/renderer/src/assets/main.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

- [ ] **Step 5: Add shadcn/ui primitives used by the app**

```bash
pnpm dlx shadcn@latest add button input select dialog textarea scroll-area
```

This installs components to `src/renderer/src/components/ui/`.

- [ ] **Step 6: Update App.tsx to verify Tailwind works**

`src/renderer/src/App.tsx`:
```tsx
export default function App() {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <p className="m-auto text-sm text-muted-foreground">pi-ui loading…</p>
    </div>
  )
}
```

- [ ] **Step 7: Run tests to confirm nothing broke**

```bash
pnpm test:run
```

Expected: 1 test passes.

- [ ] **Step 8: Run full check**

```bash
pnpm check
```

Expected: typecheck passes, lint passes, tests pass.

- [ ] **Step 9: Commit**

```bash
git add tailwind.config.js postcss.config.js components.json src/renderer/src/assets/ src/renderer/src/lib/ src/renderer/src/components/ui/ src/renderer/src/App.tsx src/renderer/src/App.test.tsx
git commit -m "chore: add Tailwind CSS, dark theme variables, and shadcn/ui primitives"
```
