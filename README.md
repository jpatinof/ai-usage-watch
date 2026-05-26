# AI Usage Watch

Monitor your AI subscription usage from the terminal, with optional desktop notifications on Linux, macOS, and Windows.

Supports multiple providers — currently **OpenCode Go**, **Claude.ai** (personal Pro subscription), and **Codex**.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)

## Requirements

- Node.js 18+
- A Chromium-compatible browser: Chromium, Google Chrome, Brave, or Microsoft Edge (used by supported browser-based providers)

Provider-specific:

| Provider | Extra requirement |
|---|---|
| `opencode-go` | OpenCode Go subscription + workspace ID |
| `claude-ai` | Claude.ai account (Pro or higher) |
| `codex` | ChatGPT account with Codex usage analytics access |

## Installation

```bash
git clone https://github.com/jpatinof/ai-usage-watch.git
cd ai-usage-watch
npm install
npm run build
npm link
```

After `npm link`, the command is available globally:

```bash
ai-usage-watch --help
```

## Configuration

### OpenCode Go

The fastest setup is a `.env` file:

```bash
cp .env.example .env
```

```env
AI_USAGE_WATCH_PROVIDER=opencode-go
OPENCODE_WORKSPACE_ID=wrk_your_workspace_id
CHROMIUM_PATH=/usr/bin/chromium
```

For a global setup, create the app `.env` file with the same variables. The default location is platform-specific; see [Platform Support](#platform-support).

Or use JSON config at the platform-specific app config path:

```json
{
  "provider": "opencode-go",
  "workspaceId": "wrk_your_workspace_id",
  "chromiumPath": "/usr/bin/chromium",
  "notify": true
}
```

`workspaceId` is required. Without it the tool stops before querying the wrong workspace.

### Claude.ai

No API key or workspace ID needed. The provider uses a persistent browser session — the same way the OpenCode Go provider works.

**First run:**

```bash
ai-usage-watch --provider claude-ai
```

A browser window will open. Log in to your Claude.ai account, then close or leave the browser — the tool will detect the authenticated session and continue automatically.

After the first login, the session is saved to the platform-specific `browser-profile-claude-ai` directory and reused on every subsequent run. No login prompt will appear again unless the session expires.

To set `claude-ai` as the default provider, add it to your config:

```env
AI_USAGE_WATCH_PROVIDER=claude-ai
```

or in the app config JSON file:

```json
{
  "provider": "claude-ai"
}
```

`chromiumPath` is still required (or auto-detected from standard paths — see below).

### Codex

No API key or workspace ID needed. The provider uses Playwright with an isolated persistent browser profile to scrape the private ChatGPT/Codex analytics page.

```bash
ai-usage-watch --provider codex
```

A browser window will open on first run. Complete ChatGPT login in that browser; email verification and Google login can briefly leave ChatGPT during the flow.

After login, the session is saved to the platform-specific `browser-profile-codex` directory and reused on later runs.

Codex values are reported as used percentages. The analytics page shows remaining percentages, so the CLI converts them to `used = 100 - remaining` and displays `<pct> / 100`.

This provider depends on a private web page and is more fragile than an official API. Login flow or DOM changes on `chatgpt.com` may require parser/browser updates.

### Chromium auto-detection

`chromiumPath` is optional when your browser is installed in one of the standard locations checked for your OS.

Linux candidates include:

- `/usr/bin/chromium`
- `/usr/bin/chromium-browser`
- `/usr/bin/google-chrome`
- `/usr/bin/google-chrome-stable`
- `/usr/bin/brave-browser`

macOS candidates include the app bundle executables for Chrome, Chromium, Brave, and Microsoft Edge in `/Applications` and `~/Applications`.

Windows candidates include Chrome, Brave, and Microsoft Edge under `Program Files`, `Program Files (x86)`, and `LOCALAPPDATA`.

## Platform Support

| OS | Status | Paths | Notifications |
|---|---|---|---|
| Linux | Supported | Uses `XDG_CONFIG_HOME` / `XDG_DATA_HOME`, with `~/.config` and `~/.local/share` fallbacks. | Uses `notify-send` when available. |
| macOS | Supported | Uses `~/Library/Application Support/ai-usage-watch`. | Uses built-in `osascript`. |
| Windows | Best-effort | Uses `APPDATA` for config/profile and `LOCALAPPDATA` for local data. | Uses PowerShell toast/balloon fallback. |

Desktop notifications are always best-effort. If the OS notification command is unavailable or blocked, the CLI still prints terminal output.

Default app files by OS:

| OS | Config / profile root | OpenCode auth lookup |
|---|---|---|
| Linux | `~/.config/ai-usage-watch` | `~/.local/share/opencode/auth.json` |
| macOS | `~/Library/Application Support/ai-usage-watch` | `~/Library/Application Support/opencode/auth.json` |
| Windows | `%APPDATA%\\ai-usage-watch` | `%LOCALAPPDATA%\\opencode\\auth.json` |

## Usage

```bash
# Default provider (opencode-go unless configured otherwise)
ai-usage-watch

# Specific provider
ai-usage-watch --provider claude-ai
ai-usage-watch --provider codex
ai-usage-watch --provider opencode-go

# JSON output (disables desktop notifications)
ai-usage-watch --json
ai-usage-watch --provider claude-ai --json
ai-usage-watch --provider codex --json

# Override config for one run
ai-usage-watch --provider opencode-go --workspace wrk_your_workspace_id --chromium /usr/bin/brave-browser
```

From the project directory, this builds TypeScript first and runs it:

```bash
npm run start
```

## Provider Support

| Provider | Status | Notes |
|---|---|---|
| `opencode-go` | ✅ Supported | Browser scrape of `opencode.ai/workspace/<id>/go`. Requires workspace ID. |
| `claude-ai` | ✅ Supported | Browser scrape of `claude.ai/settings/usage`. Shows session and weekly limits. |
| `codex` | ✅ Supported | Browser scrape of `chatgpt.com/codex/cloud/settings/analytics`. Shows 5 hour and weekly percentage usage. |
| `claude-code` | ⏳ Placeholder | No public usage API available. |

## CLI Flags

| Flag | Description |
|---|---|
| `--provider <id>` | Usage provider: `opencode-go`, `claude-ai`, `codex`, or `claude-code`. Defaults to `opencode-go`. |
| `--workspace <id>` | OpenCode workspace ID (required for `opencode-go`). |
| `--chromium <path>` | Chromium-compatible browser executable path. |
| `--no-notify` | Disable desktop notifications. |
| `--json` | Print machine-readable JSON and disable notifications. |
| `--debug` | Print config resolution and save failed page HTML to the app debug file. |
| `--help` | Show usage help. |

## Environment Variables

| Variable | Description |
|---|---|
| `AI_USAGE_WATCH_PROVIDER` | Usage provider: `opencode-go`, `claude-ai`, `codex`, or `claude-code`. |
| `OPENCODE_WORKSPACE_ID` | OpenCode workspace ID (required for `opencode-go`). |
| `CHROMIUM_PATH` | Chromium-compatible browser executable path. |
| `AI_USAGE_WATCH_CONFIG` | Optional config file path override. |
| `AI_USAGE_WATCH_ENV` | Optional `.env` file path override. Defaults to the platform-specific app `.env`. |

Configuration precedence:

```
CLI flags > shell environment variables > .env files > config file > defaults
```

The app reads `.env` from:

1. The platform-specific app `.env` or the path in `AI_USAGE_WATCH_ENV`
2. The package/project `.env` (useful for `npm run start` during local development)

## Hyprland Binding

To run multiple providers in parallel on a single keypress (each sends its own notification):

```lua
hl.bind("ALT + apostrophe", hl.dsp.exec_cmd("bash -c 'ai-usage-watch & ai-usage-watch --provider claude-ai &'"), { description = "Show AI usage (all providers)" })
```

If you use full paths (required when Hyprland's PATH differs from your shell):

```lua
hl.bind("ALT + apostrophe", hl.dsp.exec_cmd("bash -c '/usr/local/bin/ai-usage-watch & /usr/local/bin/ai-usage-watch --provider claude-ai &'"), { description = "Show AI usage (all providers)" })
```

For a single provider in plain Hyprland config:

```ini
bind = ALT, apostrophe, exec, ai-usage-watch --provider claude-ai
```

## How It Works

### OpenCode Go

1. Reuses a persistent browser profile from the platform-specific `browser-profile` directory.
2. Opens an interactive browser login flow if the session is missing or expired.
3. Visits `https://opencode.ai/workspace/<workspaceId>/go` and extracts rolling, weekly, and monthly usage values.
4. Prints terminal output, JSON, or a desktop notification depending on flags.

### Claude.ai

1. Reuses a persistent browser profile from the platform-specific `browser-profile-claude-ai` directory (isolated from the OpenCode Go profile).
2. Opens an interactive browser login flow if the session is missing or expired.
3. Visits `https://claude.ai/settings/usage` and extracts current session and weekly usage percentages.
4. Prints terminal output, JSON, or a desktop notification depending on flags.

Usage values from Claude.ai are percentages (0–100). There is no public API for absolute token or dollar limits, so values are shown as `<pct> / 100`.

### Codex

1. Reuses a persistent browser profile from the platform-specific `browser-profile-codex` directory.
2. Opens an interactive ChatGPT login flow if the session is missing or expired.
3. Visits `https://chatgpt.com/codex/cloud/settings/analytics` and extracts 5 hour and weekly remaining percentages.
4. Converts remaining percentages to used percentages before printing output.

Codex scraping is intentionally isolated to its provider module. The page is private and unsupported by a public API, so extraction can break when ChatGPT changes login or analytics markup.

## Development

The app is written in TypeScript and compiled to `dist/`.

```bash
npm run build
npm test
npm run typecheck
```

Code structure:

| File | Responsibility |
|---|---|
| `src/cli.ts` | CLI flag parsing and help output |
| `src/config.ts` | Resolves CLI / env / config file precedence |
| `src/providers.ts` | Provider registry and dispatch |
| `src/providers/claude-ai.ts` | Claude.ai provider (Playwright) |
| `src/providers/codex.ts` | Codex provider (Playwright) |
| `src/parsers/claude-ai-parser.ts` | Claude.ai page text parser |
| `src/parsers/codex-parser.ts` | Codex analytics page text parser |
| `src/browser.ts` | OpenCode Go Playwright helpers |
| `src/usage-parser.ts` | OpenCode Go page parser |
| `src/notifier.ts` | Desktop notifications |
| `src/app.ts` | Use-case orchestration |
| `src/paths.ts` | All file system paths |

## Troubleshooting

**Browser not found**

Install Chromium or set the path explicitly:

```bash
ai-usage-watch --chromium /path/to/browser
CHROMIUM_PATH=/path/to/browser ai-usage-watch
```

**Not authenticated (OpenCode Go)**

Run without `--json` to trigger the interactive login flow:

```bash
ai-usage-watch --provider opencode-go
```

The browser session is saved in `~/.config/ai-usage-watch/browser-profile/` after login.

To force a fresh login:

```bash
rm -rf ~/.config/ai-usage-watch/browser-profile
ai-usage-watch --provider opencode-go
```

**Not authenticated (Claude.ai)**

Run without `--json` to trigger the interactive login flow:

```bash
ai-usage-watch --provider claude-ai
```

The browser session is saved in `~/.config/ai-usage-watch/browser-profile-claude-ai/` after login.

To force a fresh login:

```bash
rm -rf ~/.config/ai-usage-watch/browser-profile-claude-ai
ai-usage-watch --provider claude-ai
```

**Not authenticated (Codex)**

Run without `--json` to trigger the interactive login flow:

```bash
ai-usage-watch --provider codex
```

The browser session is saved in `~/.config/ai-usage-watch/browser-profile-codex/` after login.

To force a fresh login:

```bash
rm -rf ~/.config/ai-usage-watch/browser-profile-codex
ai-usage-watch --provider codex
```

**Usage not found**

Run with debug to inspect the page HTML:

```bash
ai-usage-watch --provider claude-ai --debug
# or
ai-usage-watch --provider codex --debug
```

If extraction fails, the page HTML is saved to `~/.config/ai-usage-watch/debug.html`.
This file may contain private account details, Codex analytics, or session-specific page content — do not share it publicly or commit it.

## License

MIT
