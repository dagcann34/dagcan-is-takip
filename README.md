<p align="center">
  <img src="public/favicon.svg" width="96" alt="Dağcan İş Takip logo" />
</p>

<h1 align="center">Dağcan İş Takip</h1>
<p align="center"><b>Enterprise Task & Security Hub for IT infrastructure teams</b><br/>
Neon cyberpunk Kanban · zero-knowledge vault · AI reporting · Windows & macOS</p>

<p align="center">
  <a href="README.tr.md">🇹🇷 Türkçe</a> ·
  <a href="CHANGELOG.md">Changelog</a> ·
  <a href="https://github.com/dagcann34/dagcan-is-takip/releases">Download</a> ·
  <a href="SECURITY.md">Security</a>
</p>

<p align="center">
  <img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-0052CC" />
  <img alt="Tauri v2" src="https://img.shields.io/badge/Tauri-v2-00B8D9" />
  <img alt="Platforms" src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS-172B4D" />
  <img alt="Languages" src="https://img.shields.io/badge/UI-English%20%7C%20T%C3%BCrk%C3%A7e-36B37E" />
</p>

<p align="center"><img src="docs/screenshots/board.png" width="860" alt="Board screenshot" /></p>

## Why

Sysadmins juggle tickets, PowerShell snippets, server passwords and status emails across five different tools. Dağcan İş Takip puts the work board, an encrypted vault and an AI writing assistant into one fast, local-first desktop app — free and open source.

## Features

| | |
|---|---|
| **Year calendar** | Fixed right-side panel with all 12 months, due dates, completions, overdue days and Turkish public holidays; click a day to see its tasks |
| **Overview dashboard** | Open, overdue, due-this-week, done-in-7-days, blocked and tracked-time KPIs, status distribution, upcoming deadlines |
| **Fixed Kanban board** | Four columns that always fit the window — no accidental dragging; move cards with ◀ ▶ or `Alt + ←/→`, dependencies, priorities, due-date badges |
| **Export & share** | Whole board as high-res PNG, vector SVG or PDF; any single card as an image (saved + copied to clipboard) |
| **Recurring tasks & templates** | Daily → yearly repeats that recreate themselves on completion; ready templates for patching, certificate renewal, backup tests, onboarding/offboarding, access reviews |
| **Filter & calendar export** | Search/priority filter on the board; export due dates to Apple Calendar / Outlook as .ics |
| **Checklists & time tracking** | Sub-steps with progress bar, start/stop timer per task |
| **Zero-knowledge vault** | Passwords, servers, PowerShell scripts, notes and API keys encrypted with Argon2id + AES-256-GCM in Rust |
| **Auto-lock & clipboard clear** | Locks after idle time (1–30 min) or 60 s in background; copied secrets wiped after 30 s |
| **Password generator** | Unbiased CSPRNG generator, 24 characters by default |
| **AI Studio (Claude)** | Executive summary email, STAR-method CV/LinkedIn bullets, ITIL change request (RFC/CAB), blameless post-incident report |
| **Local redaction** | IPs, emails, UNC paths and password-like strings are masked before anything leaves the device |
| **Command palette** | `⌘K` / `Ctrl+K` to jump anywhere, search tasks, create tasks, lock the vault, switch language |
| **Tray / menu bar** | Runs in the background; `⌘⇧Space` / `Ctrl+Shift+Space` opens the Quick Task window |
| **Native notifications** | macOS & Windows notification center for due and overdue tasks |
| **Bilingual** | Full English and Turkish UI, tray menu and error messages |
| **Backups** | Board JSON export/import, encrypted vault backup |

## Download

Grab the latest `.dmg` (macOS, Apple Silicon & Intel) or `.msi` / `.exe` (Windows) from **[Releases](https://github.com/dagcann34/dagcan-is-takip/releases)**.

> Builds are not code-signed yet. On macOS right-click → **Open** the first time; on Windows choose **More info → Run anyway** in SmartScreen.

## Build from source

Requirements: Node.js 20+, Rust (stable), and on Windows the WebView2 runtime + MSVC build tools.

```bash
git clone https://github.com/dagcann34/dagcan-is-takip.git
cd dagcan-is-takip
npm install
npm run tauri dev      # desktop app with hot reload
npm run tauri build    # installers in src-tauri/target/release/bundle
npm run dev            # UI-only browser preview (vault & AI disabled)
cd src-tauri && cargo test   # crypto unit tests
```

## AI setup

1. Get an API key from the [Claude Console](https://platform.claude.com/).
2. In **Secure Vault**, add an item of type **API Key** whose title contains `Anthropic`.
3. Open **AI Studio**, pick tasks and generate. The key is read inside the Rust process and never reaches the web view.

Model: `claude-opus-5-5` (effort `medium`) with server-side fallback on refusals.

## Security model

| Topic | Implementation |
|---|---|
| Key derivation | Argon2id, m = 64 MiB, t = 3, p = 4, 16-byte random salt |
| Encryption | AES-256-GCM, random 96-bit nonce per item, item id bound as AAD |
| Key hierarchy | Password → KEK → wrapped random DEK. Password and keys are never written to disk |
| Zero knowledge | Titles, tags and usernames are encrypted too; the vault file is safe to sync |
| Memory | Keys and decrypted payloads are zeroized on drop |
| Web view | Strict CSP, no network access; the Claude call runs in Rust |

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## Architecture

```
src/                     React 19 + TypeScript + Tailwind v4
├── i18n/                English & Turkish dictionaries
├── components/          UI kit, command palette
├── features/
│   ├── overview/        KPI dashboard
│   ├── board/           Fixed Kanban grid, export, store
│   ├── vault/           Vault UI (crypto lives in Rust)
│   ├── ai/              Prompt templates, redaction, AI Studio
│   ├── settings/        Language, backups, about
│   └── quick/           Quick Task window
src-tauri/src/           Rust core (Tauri v2)
├── crypto.rs            Argon2id + AES-256-GCM + envelope encryption
├── vault.rs             Encrypted vault, auto-lock, clipboard clearing
├── ai.rs                Claude API client
└── lib.rs               Tray, global shortcut, windows, exports
```

## Roadmap

- End-to-end encrypted sync (iCloud Drive / OneDrive folder or Supabase)
- SQLite storage with the board encrypted by the vault key
- Touch ID / Windows Hello unlock
- PowerShell playground: run vault scripts and attach output to tasks
- Code-signed and notarized releases

## Contributing

Issues and pull requests are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Please keep UI strings in both `tr` and `en` dictionaries.

## License

[MIT](LICENSE) © 2026 Dağcan
