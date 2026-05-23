# OpenCode Go Usage Checker

Check your OpenCode Go subscription usage from the terminal, optionally with a desktop notification for Hyprland or any Linux desktop that supports `notify-send`.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)

## Requirements

- Node.js 18+
- Chromium, Chromium Browser, Google Chrome, or Brave
- OpenCode credentials created by running `/connect` in OpenCode
- OpenCode Go subscription and workspace ID

## Installation

```bash
git clone https://github.com/YOUR_USER/opencode-go-usage.git
cd opencode-go-usage
npm install
npm run build
npm link
```

After `npm link`, the command is available as:

```bash
opencode-go-usage --help
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
OPENCODE_WORKSPACE_ID=wrk_your_workspace_id
CHROMIUM_PATH=/usr/bin/chromium
```

For an installed/global setup, you can also create `~/.config/opencode-go/.env` with the same variables. This works no matter where you run `opencode-go-usage` from.

If you prefer JSON config, create `~/.config/opencode-go/config.json`:

```json
{
  "workspaceId": "wrk_your_workspace_id",
  "chromiumPath": "/usr/bin/chromium",
  "notify": true
}
```

`workspaceId` is required. Without it, the checker stops instead of querying the wrong workspace.

`chromiumPath` is optional when your browser is installed in one of these paths:

- `/usr/bin/chromium`
- `/usr/bin/chromium-browser`
- `/usr/bin/google-chrome`
- `/usr/bin/google-chrome-stable`
- `/usr/bin/brave-browser`

## Usage

```bash
opencode-go-usage
```

From the project directory, this also works and builds TypeScript first:

```bash
npm run start
```

JSON output disables desktop notifications by default:

```bash
opencode-go-usage --json
```

Override config for one run:

```bash
opencode-go-usage --workspace wrk_your_workspace_id --chromium /usr/bin/brave-browser
```

## CLI Flags

| Flag | Description |
|------|-------------|
| `--workspace <id>` | OpenCode workspace ID. |
| `--chromium <path>` | Chromium-compatible browser executable path. |
| `--no-notify` | Disable desktop notifications. |
| `--json` | Print machine-readable JSON and disable notifications. |
| `--debug` | Print config resolution and save failed page HTML to `~/.config/opencode-go/debug.html`. |
| `--help` | Show usage help. |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENCODE_WORKSPACE_ID` | OpenCode workspace ID. |
| `CHROMIUM_PATH` | Chromium-compatible browser executable path. |
| `OPENCODE_GO_CONFIG` | Optional config file path override. |
| `OPENCODE_GO_ENV` | Optional `.env` file path override. Defaults to `~/.config/opencode-go/.env`. |

Configuration precedence is:

```text
CLI flags > shell environment variables > .env files > config file > defaults
```

The app reads `.env` from:

1. `~/.config/opencode-go/.env` or the path in `OPENCODE_GO_ENV`
2. the package/project `.env`, useful for `npm run start` during local development

## Hyprland Binding

Add a binding that runs the package command:

```lua
hl.bind("ALT + apostrophe", hl.dsp.exec_cmd("opencode-go-usage"), { description = "Show OpenCode Go usage" })
```

If you use plain Hyprland config instead of Omarchy Lua bindings:

```ini
bind = ALT, apostrophe, exec, opencode-go-usage
```

## How It Works

1. Reads OpenCode credentials from `~/.local/share/opencode/auth.json`.
2. Reuses a persistent browser profile from `~/.config/opencode-go/browser-profile` when available.
3. Opens a browser login flow if the saved OpenCode web session is missing.
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
- `src/browser.ts` owns Playwright login and usage-page navigation.
- `src/usage-parser.ts` parses usage values from page text/HTML.
- `src/notifier.ts` owns desktop notifications.
- `src/app.ts` orchestrates the use case.

## Troubleshooting

**No OpenCode credentials found**

Run `/connect` inside OpenCode first. The script expects credentials at `~/.local/share/opencode/auth.json`.

**Browser not found**

Install Chromium or set one of these:

```bash
opencode-go-usage --chromium /path/to/browser
CHROMIUM_PATH=/path/to/browser opencode-go-usage
```

**Not authenticated in the browser**

Run `opencode-go-usage` without `--json`, complete the browser login, and try again.
The browser session is saved in `~/.config/opencode-go/browser-profile` after login.

To force a fresh login:

```bash
rm ~/.config/opencode-go/session.json
rm -rf ~/.config/opencode-go/browser-profile
opencode-go-usage
```

**Usage not found**

Run with debug enabled:

```bash
opencode-go-usage --debug
```

If extraction fails after the page loads, debug HTML is saved to `~/.config/opencode-go/debug.html`.

## License

MIT
