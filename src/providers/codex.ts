import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { chromium, type BrowserContext, type Page } from 'playwright';
import { saveDebugHtml } from '../browser.js';
import { parseCodexUsage, toCodexUsageResults } from '../parsers/codex-parser.js';
import { PROFILE_DIR_CODEX } from '../paths.js';
import type { AppConfig, UsageProvider, UsageResult } from '../types.js';

const USAGE_URL = 'https://chatgpt.com/codex/cloud/settings/analytics';
const AUTH_MARKER_FILE = `${PROFILE_DIR_CODEX}/.authenticated`;
const INTERACTIVE_LOGIN_TIMEOUT_MS = 10 * 60 * 1000;

function ensureProfileDir(): void {
  if (!existsSync(PROFILE_DIR_CODEX)) {
    mkdirSync(PROFILE_DIR_CODEX, { recursive: true, mode: 0o700 });
  }
  try {
    chmodSync(PROFILE_DIR_CODEX, 0o700);
  } catch {
    // Best effort: some filesystems may not support POSIX permissions.
  }
}

function launchCodexContext(config: AppConfig, headless: boolean): Promise<BrowserContext> {
  ensureProfileDir();
  return chromium.launchPersistentContext(PROFILE_DIR_CODEX, {
    headless,
    executablePath: config.chromiumPath,
    args: ['--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'],
  });
}

function hasCodexAuthenticatedProfile(): boolean {
  return existsSync(AUTH_MARKER_FILE);
}

function markCodexAuthenticatedProfile(): void {
  try {
    ensureProfileDir();
    writeFileSync(AUTH_MARKER_FILE, new Date().toISOString(), { mode: 0o600 });
  } catch {
    // Best effort: the browser profile still owns the real session state.
  }
}

async function waitForManualLoginConfirmation(): Promise<void> {
  const rl = createInterface({ input, output });

  try {
    await rl.question('  After the ChatGPT/Codex browser is logged in, press Enter here to continue... ');
  } finally {
    rl.close();
  }
}

export function isCodexAuthUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return url.hostname === 'auth.openai.com'
      || url.hostname.endsWith('.google.com')
      || url.hostname === 'accounts.google.com'
      || url.pathname.startsWith('/auth/login')
      || url.pathname.startsWith('/login');
  } catch {
    return false;
  }
}

async function isCodexLoginPage(page: Page): Promise<boolean> {
  if (isCodexAuthUrl(page.url())) return true;

  const loginButton = await page.locator('[data-testid="login-button"], [data-testid="signup-button"]').first().isVisible({ timeout: 1000 }).catch(() => false);
  return loginButton;
}

async function waitForCodexUsagePage(page: Page): Promise<void> {
  await page.waitForFunction(
    () => /\d+(?:\.\d+)?%\s*remaining/i.test(document.body?.innerText ?? ''),
    { timeout: 15000 },
  ).catch(() => {});
}

async function extractCodexUsage(config: AppConfig, page: Page): Promise<UsageResult[]> {
  const pageText = await page.evaluate(() => document.body.innerText);
  const rows = parseCodexUsage(pageText);

  if (rows.length > 0) {
    markCodexAuthenticatedProfile();
    return toCodexUsageResults(rows);
  }

  await saveDebugHtml(config, page, 'Codex usage not found');
  throw new Error(`Could not fetch usage data from ${USAGE_URL}. Use --debug to save page HTML for inspection.`);
}

async function runCodexInteractiveLogin(config: AppConfig): Promise<UsageResult[]> {
  const context = await launchCodexContext(config, false);
  let page: Page | undefined;

  try {
    const pages = context.pages();
    page = pages.length > 0 ? pages[0] : await context.newPage();

    console.log('  Not authenticated. Opening browser...');
    await page.goto(USAGE_URL, { waitUntil: 'domcontentloaded' });

    console.log('  Please complete ChatGPT/Codex login in the browser...');
    console.log('  Email verification and Google login may leave ChatGPT; complete the flow in this browser window.');
    if (await isCodexLoginPage(page)) {
      await waitForManualLoginConfirmation();
    } else {
      await Promise.race([
        page.waitForURL(url => !isCodexAuthUrl(url.toString()), { timeout: INTERACTIVE_LOGIN_TIMEOUT_MS }),
        waitForManualLoginConfirmation(),
      ]);
    }

    if (await isCodexLoginPage(page)) {
      console.log('  Waiting for successful login...');
      await page.waitForURL(url => !isCodexAuthUrl(url.toString()), { timeout: INTERACTIVE_LOGIN_TIMEOUT_MS });
    }

    await page.goto(USAGE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
    await waitForCodexUsagePage(page);

    return await extractCodexUsage(config, page);
  } catch (error) {
    const message = error instanceof Error ? error.message.split('\n')[0] : String(error);
    await saveDebugHtml(config, page, message);
    throw error;
  } finally {
    await context.close();
  }
}

export const codexProvider: UsageProvider = {
  metadata: {
    id: 'codex',
    displayName: 'Codex',
    supported: true,
    requiresBrowser: true,
    startTitle: 'Codex',
    startMessage: 'Checking your usage...',
    checkingMessage: 'Checking your Codex usage...',
    successTitle: 'Codex Usage',
    errorTitle: 'Codex',
    errorMessage: 'Error while checking usage',
  },
  async getUsage(config: AppConfig): Promise<UsageResult[]> {
    let context: BrowserContext | undefined;
    let page: Page | undefined;

    try {
      if (!hasCodexAuthenticatedProfile()) {
        if (config.json) throw new Error('Codex session is not authenticated. Run without --json to complete browser login.');
        return await runCodexInteractiveLogin(config);
      }

      context = await launchCodexContext(config, true);
      const pages = context.pages();
      page = pages.length > 0 ? pages[0] : await context.newPage();

      await page.goto(USAGE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });

      if (await isCodexLoginPage(page)) {
        if (config.json) throw new Error('Codex session is not authenticated. Run without --json to complete browser login.');
        await context.close();
        context = undefined;
        return await runCodexInteractiveLogin(config);
      }

      await waitForCodexUsagePage(page);

      return await extractCodexUsage(config, page);
    } catch (error) {
      const message = error instanceof Error ? error.message.split('\n')[0] : String(error);
      await saveDebugHtml(config, page, message);
      throw error;
    } finally {
      await context?.close().catch(() => {});
    }
  },
};
