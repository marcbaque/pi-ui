# pi-ui

A desktop UI for the [pi coding agent](https://github.com/badlogic/pi-mono) — run multiple concurrent pi sessions in a tabbed interface, browse and resume past sessions, and watch tool calls stream in real time. No terminal required.

![pi-ui screenshot](docs/screenshot.png)

## Features

- **Multi-session tabs** — run several pi sessions side by side, each with its own working directory, model, and message history
- **Session history** — all past sessions are listed in the sidebar, grouped by project; click to read, click Resume to continue
- **Live tool call visibility** — bash commands, file edits, and reads stream in as they happen with expandable output
- **Model selection** — switch models mid-session; only shows models from providers you've configured
- **Settings** — configure API keys and defaults without touching a config file

## Download

Pre-built binaries are available on the [Releases](../../releases) page:

| Platform | File |
|---|---|
| macOS (Apple Silicon + Intel) | `pi-ui-*.dmg` |
| Windows (x64) | `pi-ui-*-setup.exe` |

> **macOS note:** The app is unsigned. On first launch, right-click → Open to bypass Gatekeeper, or run `xattr -cr pi-ui.dmg` in Terminal before mounting.

## Prerequisites

pi-ui embeds the pi SDK directly — you don't need pi installed separately. You do need at least one AI provider configured:

- **API key providers** (Anthropic, OpenAI, Google, Mistral, Groq, xAI, OpenRouter) — add keys in Settings → API Keys
- **OAuth providers** (GitHub Copilot, Claude Pro/Max) — run `pi /login` in a terminal once to authenticate, then pi-ui picks up the credentials automatically

## Building from source

**Requirements:** Node.js 22+, pnpm

```bash
git clone https://github.com/marcbaque/pi-ui
cd pi-ui
pnpm install
```

**Run in development:**
```bash
pnpm dev
```

**Build distributable:**
```bash
# macOS (universal binary)
pnpm dist

# Windows (x64)
pnpm dist:win
```

## Tech stack

| Layer | Choice |
|---|---|
| Desktop shell | Electron |
| Frontend | React + TypeScript (Vite) |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand |
| pi integration | `@mariozechner/pi-coding-agent` SDK (in-process, no subprocess) |

## Contributing

Issues and PRs welcome. The codebase is documented in [`docs/superpowers/specs/`](docs/superpowers/specs/).

Run checks before pushing:
```bash
pnpm typecheck
pnpm test:run
pnpm e2e
```

## License

MIT
