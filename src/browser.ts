import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { chromium, type BrowserContext, type Page } from 'playwright';
import { DEBUG_FILE, PROFILE_DIR, SESSION_DIR, SESSION_FILE } from './paths.js';
import { extractUsages } from './usage-parser.js';
import type { AppConfig, UsageResult } from './types.js';

function ensureSessionDir(): void {
  if (!existsSync(SESSION_DIR)) mkdirSync(SESSION_DIR, { recursive: true, mode: 0o700 });

  try {
    chmodSync(SESSION_DIR, 0o700);
  } catch {
    // Best effort: some filesystems may not support POSIX permissions.
  }
}

function chmodPrivate(path: string): void {
  try {
    chmodSync(path, 0o600);
  } catch {
    // Best effort: some filesystems may not support POSIX permissions.
  }
}

function workspaceGoUrl(workspaceId: string): string {
  return `https://opencode.ai/workspace/${encodeURIComponent(workspaceId)}/go`;
}

async function waitForExpectedContent(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const text = document.body?.innerText ?? '';
    return /Rolling Usage|Weekly Usage|Monthly Usage|\$[0-9.]+\s*\/\s*\$?(12|30|60)|sign in|log in|login|continue with google|continue with github/i.test(text);
  }, { timeout: 15000 }).catch(() => {});
}

export function isAuthUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return url.hostname.includes('auth') || url.pathname.startsWith('/auth') || url.pathname.includes('/login');
  } catch {
    return false;
  }
}

export function isAuthenticatedOpenCodeUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return url.hostname === 'opencode.ai' && !isAuthUrl(rawUrl);
  } catch {
    return false;
  }
}

export async function looksUnauthenticated(page: Page): Promise<boolean> {
  if (isAuthUrl(page.url())) return true;

  try {
    const text = await page.evaluate(() => document.body.innerText.toLowerCase());
    return /sign in|log in|login|continue with google|continue with github/.test(text);
  } catch {
    return false;
  }
}

export async function saveDebugHtml(config: AppConfig, page: Page | undefined, reason: string): Promise<void> {
  if (!config.debug || !page) return;

  try {
    ensureSessionDir();
    const html = await page.evaluate(() => document.documentElement.outerHTML);
    writeFileSync(DEBUG_FILE, `<!-- ${reason} -->\n${html}`, { mode: 0o600 });
    chmodPrivate(DEBUG_FILE);
    console.error(`Debug HTML saved to ${DEBUG_FILE}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Could not save debug HTML: ${message}`);
  }
}

export async function launchPersistentContext(config: AppConfig, headless: boolean): Promise<BrowserContext> {
  ensureSessionDir();

  return chromium.launchPersistentContext(PROFILE_DIR, {
    headless,
    executablePath: config.chromiumPath,
    args: ['--disable-dev-shm-usage'],
  });
}

export async function extractUsageFromWorkspace(config: AppConfig, page: Page): Promise<UsageResult[]> {
  await page.goto(workspaceGoUrl(config.workspaceId), { waitUntil: 'domcontentloaded', timeout: 20000 });
  await waitForExpectedContent(page);

  if (await looksUnauthenticated(page)) {
    throw new Error('OpenCode session is still not authenticated after login. Complete the full login flow and return to opencode.ai before the browser closes.');
  }

  const pageText = await page.evaluate(() => document.body.innerText);
  const pageHtml = await page.evaluate(() => document.body.innerHTML);
  const usages = extractUsages(pageText, pageHtml);

  if (usages.length > 0) return usages;

  await saveDebugHtml(config, page, 'Usage not found');
  throw new Error(`Could not fetch usage data for workspace ${config.workspaceId}. Use --debug to save page HTML for inspection.`);
}

export async function runInteractiveLogin(config: AppConfig): Promise<UsageResult[]> {
  const loginContext = await launchPersistentContext(config, false);
  let loginPage: Page | undefined;

  try {
    loginPage = await loginContext.newPage();

    console.log('  Not authenticated. Opening browser...');
    await loginPage.goto(workspaceGoUrl(config.workspaceId), { waitUntil: 'domcontentloaded' });

    console.log('  Please complete login in the browser...');
    await loginPage.waitForURL(url => isAuthenticatedOpenCodeUrl(url.toString()), { timeout: 300000 });
    await loginPage.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});

    const usages = await extractUsageFromWorkspace(config, loginPage);

    await loginContext.storageState({ path: SESSION_FILE });
    chmodPrivate(SESSION_FILE);
    console.log(`  Saved browser session to ${SESSION_FILE}`);
    return usages;
  } catch (error) {
    const message = error instanceof Error ? error.message.split('\n')[0] : String(error);
    await saveDebugHtml(config, loginPage, message);
    throw error;
  } finally {
    await loginContext.close();
  }
}
