# Claude.ai Provider Specification

## Purpose

Defines requirements and acceptance scenarios for the `claude-ai` provider that scrapes `https://claude.ai/settings/usage` via Playwright to surface personal Pro subscription usage limits within the ai-usage-watch application.

---

## Requirements

### Requirement: Provider Registration

The provider MUST register as ProviderId `'claude-ai'` with `displayName: 'Claude.ai'` and `supported: true`. It MUST be added to the `PROVIDER_IDS` array in `src/providers.ts` so the dispatch layer can route to it. The `ProviderId` union in `src/types.ts` MUST include `'claude-ai'`.

#### Scenario: Provider is discoverable by ID

- GIVEN the application initialises its provider registry
- WHEN the runtime looks up a provider by id `'claude-ai'`
- THEN it MUST return the `claudeAiProvider` instance
- AND `metadata.id` MUST equal `'claude-ai'`
- AND `metadata.displayName` MUST equal `'Claude.ai'`
- AND `metadata.supported` MUST be `true`

---

### Requirement: Usage Extraction

The provider MUST navigate to `https://claude.ai/settings/usage`, wait for the usage section to load, and extract all available usage rows. Each row MUST be mapped to a `UsageResult` with `used = pct`, `limit = 100`, `bars = getBars(pct)`, and `reset` equal to the parsed reset string from the page.

Expected rows when present:
- **Session** — current session percentage + "Resets in X hr Y min"
- **Weekly — All models** — weekly aggregate percentage + reset datetime
- **Weekly — Claude Design** — weekly design percentage + reset info (MAY be absent)

#### Scenario: Authenticated user receives all three rows

- GIVEN the browser profile contains a valid authenticated session
- AND the Claude Design section is present on the page
- WHEN `getUsage(config)` is called
- THEN it MUST return an array of exactly 3 `UsageResult` objects
- AND each object's `pct` MUST be a number in the range `[0, 100]`
- AND each object's `reset` MUST be a non-empty string
- AND each object's `limit` MUST equal `100`
- AND each object's `used` MUST equal that object's `pct`

#### Scenario: Claude Design row absent returns two rows

- GIVEN the authenticated page shows no Claude Design usage section
- WHEN `getUsage(config)` is called
- THEN it MUST return exactly 2 `UsageResult` objects (Session + Weekly All models)
- AND no error MUST be thrown

---

### Requirement: Authentication Handling

The provider MUST detect when the browser is redirected to a login URL. A URL is considered a login URL when its hostname is `login.anthropic.com` OR its pathname is `/login`. When unauthenticated, it MUST open a headful browser and wait for the user to complete the interactive login flow before proceeding.

#### Scenario: Unauthenticated user completes login

- GIVEN the browser profile has no saved session
- WHEN `getUsage(config)` is called
- THEN a headful browser window MUST open
- AND the provider MUST block until the current URL no longer matches a login URL
- AND after login completes it MUST navigate to `https://claude.ai/settings/usage`
- AND it MUST extract and return usage rows normally

#### Scenario: Authenticated user skips login

- GIVEN the browser profile contains a valid authenticated session
- WHEN `getUsage(config)` is called
- THEN no login URL redirect MUST occur
- AND the provider MUST proceed directly to usage extraction

---

### Requirement: Browser Profile Isolation

The provider MUST use its own persistent browser profile stored at `~/.config/ai-usage-watch/browser-profile-claude-ai`. This path MUST be exported as `PROFILE_DIR_CLAUDE_AI` from `src/paths.ts`. This profile MUST NOT be shared with the `opencode-go` profile.

#### Scenario: Claude.ai profile path is distinct from opencode-go

- GIVEN `PROFILE_DIR_CLAUDE_AI` and `PROFILE_DIR_OPENCODE_GO` are resolved from `src/paths.ts`
- WHEN compared as strings
- THEN the two paths MUST be different strings
- AND `PROFILE_DIR_CLAUDE_AI` MUST end with `browser-profile-claude-ai`

---

### Requirement: Notification Strings

Provider metadata MUST use the exact notification strings listed below and MUST NOT reuse strings from the `opencode-go` provider:

| Field | Required Value |
|---|---|
| `startTitle` | `'🤖 Claude.ai'` |
| `startMessage` | `'🔍 Checking your plan usage...'` |
| `successTitle` | `'🤖 Claude.ai Usage'` |
| `errorTitle` | `'Claude.ai'` |
| `errorMessage` | `'⚠️ Error while checking usage'` |

#### Scenario: Metadata contains correct notification strings

- GIVEN `claudeAiProvider.metadata` is read at runtime
- WHEN each notification field is inspected
- THEN all five fields MUST exactly match the values in the table above

---

### Requirement: Debug Support

When the `--debug` flag is active and the parser fails to find expected usage content on the page, the provider MUST call `saveDebugHtml(config, page, reason)` from `src/browser.ts` with a non-empty `reason` string before throwing.

#### Scenario: Parse failure with debug flag saves HTML and throws

- GIVEN the `--debug` flag is active
- AND the usage section is absent or unparseable in the DOM
- WHEN `getUsage(config)` is called
- THEN `saveDebugHtml` MUST be called once with a non-empty `reason` string
- AND the provider MUST throw an error that propagates to the caller

#### Scenario: Parse failure without debug flag throws without saving HTML

- GIVEN the `--debug` flag is NOT active
- AND the usage section is absent or unparseable in the DOM
- WHEN `getUsage(config)` is called
- THEN `saveDebugHtml` MUST NOT be called
- AND the provider MUST throw an error that propagates to the caller

---

### Requirement: Parser Resilience and Selector Safety

The parser in `src/parsers/claude-ai-parser.ts` MUST extract `name`, `pct`, and `reset` for each row using `page.evaluate()` for DOM queries with `innerText` regex as fallback. The parser MUST NOT rely on CSS class selectors. Missing optional sections (e.g. Claude Design) MUST produce an empty result for that section — not a thrown error.

#### Scenario: Parser extracts pct and reset for each row

- GIVEN valid HTML with Session and Weekly rows present
- WHEN the parser runs against the page
- THEN it MUST return objects with numeric `pct` in `[0, 100]` and non-empty `reset` per row

#### Scenario: Parser skips absent Claude Design section without error

- GIVEN valid HTML where the Claude Design block is absent
- WHEN the parser runs
- THEN it MUST return only the rows that are present
- AND no error MUST be thrown

#### Scenario: Parser does not use CSS class selectors

- GIVEN any DOM structure for `https://claude.ai/settings/usage`
- WHEN the parser extracts usage data
- THEN it MUST NOT query elements by CSS class names
- AND it MUST use semantic/structural selectors or text-based regex patterns

---

## Non-Functional Constraints

| ID | Constraint |
|---|---|
| NFR-1 | Zero new npm dependencies — only already-installed packages MAY be used |
| NFR-2 | `src/browser.ts`, `src/usage-parser.ts`, and `src/notifier.ts` MUST NOT be modified |
| NFR-3 | Browser profile MUST be isolated from the opencode-go profile |
| NFR-4 | `ProviderId` union in `src/types.ts` MUST include `'claude-ai'` after the change is applied |
| NFR-5 | `src/providers.ts` MUST register `claudeAiProvider` and include `'claude-ai'` in `PROVIDER_IDS` |
