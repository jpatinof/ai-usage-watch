# AI Usage Watch

Monitor your AI subscription usage from the terminal, with optional desktop notifications for Hyprland or any Linux desktop that supports `notify-send`.

Supports multiple providers — currently **OpenCode Go** and **Claude.ai** (personal Pro subscription).

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)

## Requirements

- Node.js 18+
- Chromium, Chromium Browser, Google Chrome, or Brave (used by both providers)

Provider-specific:

| Provider | Extra requirement |
|---|---|
| `opencode-go` | OpenCode Go subscription + workspace ID |
| `claude-ai` | Claude.ai account (Pro or higher) |

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

For a global setup, create `~/.config/ai-usage-watch/.env` with the same variables.

Or use JSON config at `~/.config/ai-usage-watch/config.json`:

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

After the first login, the session is saved to `~/.config/ai-usage-watch/browser-profile-claude-ai/` and reused on every subsequent run. No login prompt will appear again unless the session expires.

To set `claude-ai` as the default provider, add it to your config:

```env
AI_USAGE_WATCH_PROVIDER=claude-ai
```

or in `~/.config/ai-usage-watch/config.json`:

```json
{
  "provider": "claude-ai"
}
```

`chromiumPath` is still required (or auto-detected from standard paths — see below).

### Chromium auto-detection

`chromiumPath` is optional when your browser is installed in one of these locations:

- `/usr/bin/chromium`
- `/usr/bin/chromium-browser`
- `/usr/bin/google-chrome`
- `/usr/bin/google-chrome-stable`
- `/usr/bin/brave-browser`

## Usage

```bash
# Default provider (opencode-go unless configured otherwise)
ai-usage-watch

# Specific provider
ai-usage-watch --provider claude-ai
ai-usage-watch --provider opencode-go

# JSON output (disables desktop notifications)
ai-usage-watch --json
ai-usage-watch --provider claude-ai --json

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
| `claude-code` | ⏳ Placeholder | No public usage API available. |
| `codex` | ⏳ Placeholder | No public usage API available. |

## CLI Flags

| Flag | Description |
|---|---|
| `--provider <id>` | Usage provider: `opencode-go`, `claude-ai`. Defaults to `opencode-go`. |
| `--workspace <id>` | OpenCode workspace ID (required for `opencode-go`). |
| `--chromium <path>` | Chromium-compatible browser executable path. |
| `--no-notify` | Disable desktop notifications. |
| `--json` | Print machine-readable JSON and disable notifications. |
| `--debug` | Print config resolution and save failed page HTML to `~/.config/ai-usage-watch/debug.html`. |
| `--help` | Show usage help. |

## Environment Variables

| Variable | Description |
|---|---|
| `AI_USAGE_WATCH_PROVIDER` | Usage provider: `opencode-go` or `claude-ai`. |
| `OPENCODE_WORKSPACE_ID` | OpenCode workspace ID (required for `opencode-go`). |
| `CHROMIUM_PATH` | Chromium-compatible browser executable path. |
| `AI_USAGE_WATCH_CONFIG` | Optional config file path override. |
| `AI_USAGE_WATCH_ENV` | Optional `.env` file path override. Defaults to `~/.config/ai-usage-watch/.env`. |

Configuration precedence:

```
CLI flags > shell environment variables > .env files > config file > defaults
```

The app reads `.env` from:

1. `~/.config/ai-usage-watch/.env` or the path in `AI_USAGE_WATCH_ENV`
2. The package/project `.env` (useful for `npm run start` during local development)

## Hyprland Binding

To run both providers in parallel on a single keypress (each sends its own notification):

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

1. Reuses a persistent browser profile from `~/.config/ai-usage-watch/browser-profile/`.
2. Opens an interactive browser login flow if the session is missing or expired.
3. Visits `https://opencode.ai/workspace/<workspaceId>/go` and extracts rolling, weekly, and monthly usage values.
4. Prints terminal output, JSON, or a desktop notification depending on flags.

### Claude.ai

1. Reuses a persistent browser profile from `~/.config/ai-usage-watch/browser-profile-claude-ai/` (isolated from the OpenCode Go profile).
2. Opens an interactive browser login flow if the session is missing or expired.
3. Visits `https://claude.ai/settings/usage` and extracts current session and weekly usage percentages.
4. Prints terminal output, JSON, or a desktop notification depending on flags.

Usage values from Claude.ai are percentages (0–100). There is no public API for absolute token or dollar limits, so values are shown as `<pct> / 100`.

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
| `src/parsers/claude-ai-parser.ts` | Claude.ai page text parser |
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

**Usage not found**

Run with debug to inspect the page HTML:

```bash
ai-usage-watch --provider claude-ai --debug
```

If extraction fails, the page HTML is saved to `~/.config/ai-usage-watch/debug.html`.
This file may contain private account details — do not share it publicly or commit it.

## License

MIT
