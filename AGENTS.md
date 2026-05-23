# AGENTS.md

Guidance for coding agents working on this repository. Treat this as the project-specific context that complements `README.md`.

## Project snapshot

`opencode-go-usage` is a Node.js/TypeScript CLI that checks OpenCode Go subscription usage from the terminal. It can print human output, JSON output, and optional desktop notifications through `notify-send`.

The codebase has a small multi-provider seam:

| Provider | Current state |
|----------|---------------|
| `opencode-go` | Supported and default. Uses Playwright with a persistent browser profile to read the OpenCode Go workspace usage page. |
| `claude-code` | Placeholder only. Do not claim personal subscription usage is supported until a public/reliable source exists. |
| `codex` | Placeholder only. Do not claim personal subscription usage is supported until a public/reliable source exists. |

## Setup commands

```bash
npm install
npm run build
```

`npm run build` runs `npm run clean` first so deleted source files do not leave stale package artifacts in `dist/`.

Useful local commands:

```bash
npm run help
npm run start
```

## Verification commands

Run these before finishing changes that touch code, config, tests, or docs examples:

```bash
npm test
npm run typecheck
```

Notes:

- `npm test` runs a clean build first, then Node's built-in test runner against `tests/*.test.js`.
- `npm run typecheck` uses `tsc --noEmit`.
- If a change affects CLI help, config precedence, or provider selection, add or update tests in `tests/config.test.js`.
- If a change affects usage parsing, add or update tests in `tests/usage-parser.test.js`.

## Architecture map

| File | Responsibility |
|------|----------------|
| `src/index.ts` | CLI entrypoint. |
| `src/main.ts` | Top-level CLI flow: parse args, resolve config, call app, print output/errors. |
| `src/cli.ts` | CLI flag parsing and help text. |
| `src/config.ts` | Config/env/CLI precedence and validation. |
| `src/app.ts` | Provider-agnostic usage orchestration and notifications. |
| `src/providers.ts` | Provider registry, provider IDs, OpenCode Go adapter, unsupported placeholders. |
| `src/browser.ts` | OpenCode-specific Playwright login/navigation/scraping helpers. |
| `src/usage-parser.ts` | OpenCode Go usage parser. |
| `src/output.ts` | Human and JSON output formatting. |
| `src/notifier.ts` | Best-effort desktop notifications through `notify-send`. |
| `src/types.ts` | Shared config, provider, and usage result types. |

## Code style and conventions

- Use TypeScript ESM imports with explicit `.js` extensions in source imports.
- Keep provider-specific behavior behind the provider seam. Do not add provider conditionals throughout unrelated modules.
- Preserve existing behavior for `opencode-go` unless the task explicitly asks to change it.
- Keep configuration precedence intact: CLI flags > shell/env files > config file > defaults.
- Preserve `.env` file ordering: the project `.env` may override the default global `.env` for local development, but an explicit `OPENCODE_GO_ENV` file overrides the project `.env`.
- Validate user input early and produce short, actionable errors.
- Keep browser automation isolated to provider-specific code.
- Desktop notifications are best-effort only; never fail the CLI because `notify-send` is unavailable.

## Provider implementation rules

When adding or changing providers:

1. Add or update the `ProviderId` union in `src/types.ts`.
2. Add the provider to `PROVIDER_IDS` and the registry in `src/providers.ts`.
3. Keep provider metadata accurate: display name, support state, titles, and error messages.
4. Add config validation only for the providers that need it. Unsupported providers should fail with a provider-specific message, not with unrelated OpenCode workspace/browser errors.
5. Do not scrape private web apps such as `claude.ai` or `chatgpt.com` unless the maintainer explicitly approves the tradeoff.
6. Do not read credential files for usage data. Files such as `~/.codex/auth.json` or Claude credentials are sensitive auth state, not usage sources.
7. If using official admin APIs, clearly distinguish API/org usage from personal subscription quota.

## Testing guidance

- Prefer focused tests around pure functions and config resolution.
- Parser tests should cover both normal page text and fallback formats.
- Config tests should cover precedence, invalid values, provider defaults, and provider-specific validation.
- Avoid tests that require a real browser session, real credentials, or network access.

## Security and privacy

- Never commit credentials, tokens, session files, debug HTML with private data, or browser profiles.
- Treat these paths as sensitive runtime state:
  - `~/.config/opencode-go/browser-profile`
  - `~/.config/opencode-go/debug.html`
  - `~/.codex/auth.json`
  - Claude credential files
- Keep debug output useful but avoid printing secrets.

## Documentation guidance

- Keep `README.md` user-facing and concise.
- Put agent-only implementation context here.
- If a provider is a placeholder, say so directly. Do not imply Claude Code or Codex personal subscription usage is implemented.
- Update CLI examples when adding flags, env vars, or config keys.

## Commit guidance

- Use Conventional Commits, for example `feat: add openai admin provider` or `fix: validate provider config before browser setup`.
- Keep tests and docs in the same commit as the behavior they verify or explain.
- Do not add AI attribution or `Co-Authored-By` trailers.
