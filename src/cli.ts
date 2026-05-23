import { DEFAULT_CONFIG_FILE, DEFAULT_ENV_FILE } from './paths.js';
import type { ParsedArgs } from './types.js';

export function printHelp(): void {
  console.log(`OpenCode Go Usage Checker

Usage:
  opencode-go-usage [options]

Options:
  --workspace <id>   OpenCode workspace ID. Recommended for every user.
  --chromium <path>  Chromium-compatible browser executable path.
  --no-notify        Disable desktop notifications.
  --json             Print usage as JSON. Also disables notifications.
  --debug            Print config resolution and save debug HTML on page errors.
  --help             Show this help message.

Configuration precedence:
  CLI flags > environment variables > .env files > config file > defaults

Environment variables:
  OPENCODE_WORKSPACE_ID  OpenCode workspace ID.
  CHROMIUM_PATH          Chromium-compatible browser executable path.
  OPENCODE_GO_CONFIG     Optional config file path. Defaults to ~/.config/opencode-go/config.json.
  OPENCODE_GO_ENV        Optional .env file path. Defaults to ~/.config/opencode-go/.env.

.env example (${DEFAULT_ENV_FILE}):
  OPENCODE_WORKSPACE_ID=wrk_your_workspace_id
  CHROMIUM_PATH=/usr/bin/chromium

Config file example (${DEFAULT_CONFIG_FILE}):
  {
    "workspaceId": "wrk_your_workspace_id",
    "chromiumPath": "/usr/bin/chromium",
    "notify": true
  }

Required:
  Configure a workspace ID before running the checker.`);
}

export function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    cli: {},
    flags: { json: false, debug: false, help: false },
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--workspace') {
      args.cli.workspaceId = readFlagValue(argv, ++i, arg);
    } else if (arg === '--chromium') {
      args.cli.chromiumPath = readFlagValue(argv, ++i, arg);
    } else if (arg === '--no-notify') {
      args.cli.notify = false;
    } else if (arg === '--json') {
      args.flags.json = true;
    } else if (arg === '--debug') {
      args.flags.debug = true;
    } else if (arg === '--help') {
      args.flags.help = true;
    } else {
      throw new Error(`Unknown option: ${arg}. Run --help for usage.`);
    }
  }

  return args;
}

function readFlagValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}. Run --help for usage.`);
  return value;
}
