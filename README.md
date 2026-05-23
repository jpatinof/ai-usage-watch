# AI Usage Watch

Monitor your AI subscription usage from the terminal, optionally with a desktop notification for Hyprland or any Linux desktop that supports `notify-send`.

The project now has a small provider seam so more usage sources can be added later. Today, only OpenCode Go is supported.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)

## Requirements

- Node.js 18+
- Chromium, Chromium Browser, Google Chrome, or Brave
- An OpenCode Go subscription and workspace ID

## Installation

```bash
git clone https://github.com/jpatinof/ai-usage-watch.git
cd ai-usage-watch
npm install
npm run build
npm link
```

After `npm link`, the command is available as:

```bash
ai-usage-watch --help
```

You can also run it without linking:

```bash
npm run help
```

## Configuration

The fastest local setup is a `.env` file. Copy the example and edit your workspace ID:

```bash
cp .env.example .env
```

```env
AI_USAGE_WATCH_PROVIDER=opencode-go
OPENCODE_WORKSPACE_ID=wrk_your_workspace_id
CHROMIUM_PATH=/usr/bin/chromium
```

For an installed/global setup, you can also create `~/.config/ai-usage-watch/.env` with the same variables. This works no matter where you run `ai-usage-watch` from.

If you prefer JSON config, create `~/.config/ai-usage-watch/config.json`:

```json
{
  "provider": "opencode-go",
  "workspaceId": "wrk_your_workspace_id",
  "chromiumPath": "/usr/bin/chromium",
  "notify": true
}
```

`provider` defaults to `opencode-go`, so existing configs do not need to change.

`workspaceId` is required for OpenCode Go. Without it, the checker stops instead of querying the wrong workspace.

`chromiumPath` is optional when your browser is installed in one of these paths:

- `/usr/bin/chromium`
- `/usr/bin/chromium-browser`
- `/usr/bin/google-chrome`
- `/usr/bin/google-chrome-stable`
- `/usr/bin/brave-browser`

## Usage

```bash
ai-usage-watch
```

From the project directory, this also works and builds TypeScript first:

```bash
npm run start
```

JSON output disables desktop notifications by default:

```bash
ai-usage-watch --json
```

Override config for one run:

```bash
ai-usage-watch --provider opencode-go --workspace wrk_your_workspace_id --chromium /usr/bin/brave-browser
```

Current provider support:

| Provider | Status | Notes |
|----------|--------|-------|
| `opencode-go` | Supported | Uses the existing OpenCode Go browser session and workspace usage page. |
| `claude-code` | Unsupported placeholder | Personal subscription usage does not currently have a public usage API. The project intentionally does not scrape `claude.ai`. |
| `codex` | Unsupported placeholder | Personal subscription usage does not currently have a public usage API. The project intentionally does not scrape `chatgpt.com`. |

## CLI Flags

| Flag | Description |
|------|-------------|
| `--provider <id>` | Usage provider. Defaults to `opencode-go`. |
| `--workspace <id>` | OpenCode workspace ID. |
| `--chromium <path>` | Chromium-compatible browser executable path. |
| `--no-notify` | Disable desktop notifications. |
| `--json` | Print machine-readable JSON and disable notifications. |
| `--debug` | Print config resolution and save failed page HTML to `~/.config/ai-usage-watch/debug.html`. |
| `--help` | Show usage help. |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `AI_USAGE_WATCH_PROVIDER` | Usage provider: `opencode-go`, `claude-code`, or `codex`. |
| `OPENCODE_WORKSPACE_ID` | OpenCode workspace ID. |
| `CHROMIUM_PATH` | Chromium-compatible browser executable path. |
| `AI_USAGE_WATCH_CONFIG` | Optional config file path override. |
| `AI_USAGE_WATCH_ENV` | Optional `.env` file path override. Defaults to `~/.config/ai-usage-watch/.env`. |

Configuration precedence is:

```text
CLI flags > shell environment variables > .env files > config file > defaults
```

The app reads `.env` from:

1. `~/.config/ai-usage-watch/.env` or the path in `AI_USAGE_WATCH_ENV`
2. the package/project `.env`, useful for `npm run start` during local development

When using the default global env file, the package/project `.env` can override it for local development. When `AI_USAGE_WATCH_ENV` is set explicitly, that file overrides the package/project `.env`.

## Hyprland Binding

Add a binding that runs the package command:

```lua
hl.bind("ALT + apostrophe", hl.dsp.exec_cmd("ai-usage-watch"), { description = "Show AI usage" })
```

If you use plain Hyprland config instead of Omarchy Lua bindings:

```ini
bind = ALT, apostrophe, exec, ai-usage-watch
```

## How OpenCode Go Works

The current supported provider is `opencode-go`:

1. Reuses a persistent browser profile from `~/.config/ai-usage-watch/browser-profile` when available.
2. Opens an interactive browser login flow if the saved session is missing or expired.
3. Saves the session state to `~/.config/ai-usage-watch/session.json` after a successful login.
4. Visits `https://opencode.ai/workspace/<workspaceId>/go` and extracts usage values.
5. Prints terminal output, JSON output, or a desktop notification depending on flags.

## Development

The app is written in TypeScript and compiled to `dist/`.

```bash
npm run build
npm test
npm run typecheck
```

The code is split by responsibility:

- `src/cli.ts` parses CLI flags and help output.
- `src/config.ts` resolves CLI/env/config precedence.
- `src/providers.ts` selects a usage provider and contains current provider capabilities.
- `src/browser.ts` owns Playwright login and usage-page navigation.
- `src/usage-parser.ts` parses usage values from page text/HTML.
- `src/notifier.ts` owns desktop notifications.
- `src/app.ts` orchestrates the use case.

## Troubleshooting

**Browser not found**

Install Chromium or set one of these:

```bash
ai-usage-watch --chromium /path/to/browser
CHROMIUM_PATH=/path/to/browser ai-usage-watch
```

**Not authenticated in the browser**

Run `ai-usage-watch` without `--json`, complete the browser login, and try again.
The browser session is saved in `~/.config/ai-usage-watch/browser-profile` after login.

To force a fresh login:

```bash
rm ~/.config/ai-usage-watch/session.json
rm -rf ~/.config/ai-usage-watch/browser-profile
ai-usage-watch
```

**Usage not found**

Run with debug enabled:

```bash
ai-usage-watch --debug
```

If extraction fails after the page loads, debug HTML is saved to `~/.config/ai-usage-watch/debug.html`.
This file can contain private account or workspace details. Do not share it publicly or commit it.

## License

MIT