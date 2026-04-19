# Changelog

Release notes are auto-generated from commit messages on each tagged release. See the [Releases](https://github.com/marcbaque/pi-ui/releases) page for the full history.

## v0.2.1...main

[compare changes](https://github.com/marcbaque/pi-ui/compare/v0.2.1...main)

### 📖 Documentation

- Add README for open source users ([b604d7b](https://github.com/marcbaque/pi-ui/commit/b604d7b))
- Add CONTRIBUTING, CHANGELOG, issue templates, PR template ([f155c12](https://github.com/marcbaque/pi-ui/commit/f155c12))

### 🏡 Chore

- Gitignore docs/ and .superpowers/; remove docs from tracking ([4d9e8c9](https://github.com/marcbaque/pi-ui/commit/4d9e8c9))
- Remove .superpowers/ from git tracking ([99c4850](https://github.com/marcbaque/pi-ui/commit/99c4850))

### ❤️ Contributors

- Marc Baqué <marc.baque@factorial.co>

## v0.2.1

- Windows build support (x64 NSIS installer)
- Fix: pass model to resumed sessions so streaming works correctly
- Fix: stop button now properly resets thinking state
- Fix: preserve chat history when resuming a past session
- Fix: only show models from configured providers in dropdowns
- UI: bouncing dots loading indicator while pi is thinking
- UI: draggable sidebar header (double-click to zoom, drag to move)
- UI: macOS traffic light button padding in sidebar header

## v0.1.0

- Initial release
- Multi-session tab bar
- Session history sidebar (browse, read, resume past sessions)
- Live tool call streaming (bash, file read/write/edit)
- Provider API key and OAuth configuration
- macOS universal binary (Apple Silicon + Intel)
