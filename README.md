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
npm link
```

After `npm link`, the command is available as:

```bash
opencode-go-usage --help
```

You can also run it without linking:

```bash
node src/index.js --help
```

## Configuration

Create `~/.config/opencode-go/config.json`:

```json
{
  "workspaceId": "wrk_your_workspace_id",
  "chromiumPath": "/usr/bin/chromium",
  "notify": true
}
```

`workspaceId` is strongly recommended. If it is not configured, the script keeps the previous hardcoded workspace ID as a backward-compatible fallback, which may be wrong for your account.

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

Configuration precedence is:

```text
CLI flags > environment variables > config file > defaults
```

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
2. Reuses browser cookies from `~/.config/opencode-go/session.json` when available.
3. Opens a browser login flow if the saved OpenCode web session is missing.
4. Visits `https://opencode.ai/workspace/<workspaceId>/go` and extracts usage values.
5. Prints terminal output, JSON output, or a desktop notification depending on flags.

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

**Usage not found**

Run with debug enabled:

```bash
opencode-go-usage --debug
```

If extraction fails after the page loads, debug HTML is saved to `~/.config/opencode-go/debug.html`.

## License

MIT
