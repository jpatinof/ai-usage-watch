import { chmodSync, existsSync, mkdirSync } from 'node:fs';
import { chromium, type BrowserContext, type Page } from 'playwright';
import { saveDebugHtml } from '../browser.js';
import { parseClaudeAiUsage, toUsageResults } from '../parsers/claude-ai-parser.js';
import { PROFILE_DIR_CLAUDE_AI } from '../paths.js';
import type { AppConfig, UsageProvider, UsageResult } from '../types.js';

const USAGE_URL = 'https://claude.ai/settings/usage';

function ensureProfileDir(): void {
  if (!existsSync(PROFILE_DIR_CLAUDE_AI)) {
    mkdirSync(PROFILE_DIR_CLAUDE_AI, { recursive: true, mode: 0o700 });
  }
  try {
    chmodSync(PROFILE_DIR_CLAUDE_AI, 0o700);
  } catch {
    // Best effort: some filesystems may not support POSIX permissions.
  }
}

function launchClaudeAiContext(config: AppConfig, headless: boolean): Promise<BrowserContext> {
  ensureProfileDir();
  return chromium.launchPersistentContext(PROFILE_DIR_CLAUDE_AI, {
    headless,
    executablePath: config.chromiumPath,
    args: ['--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'],
  });
}

export function isClaudeAiAuthUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return url.hostname === 'login.anthropic.com' || url.pathname.startsWith('/login');
  } catch {
    return false;
  }
}

async function waitForClaudeAiUsagePage(page: Page): Promise<void> {
  await page.waitForFunction(
    () => /\d+%\s*used/i.test(document.body?.innerText ?? ''),
    { timeout: 15000 },
  ).catch(() => {});
}

async function extractClaudeAiUsage(config: AppConfig, page: Page): Promise<UsageResult[]> {
  const pageText = await page.evaluate(() => document.body.innerText);
  const rows = parseClaudeAiUsage(pageText);

  if (rows.length > 0) return toUsageResults(rows);

  await saveDebugHtml(config, page, 'Claude.ai usage not found');
  throw new Error(`Could not fetch usage data from ${USAGE_URL}. Use --debug to save page HTML for inspection.`);
}

async function runClaudeAiInteractiveLogin(config: AppConfig): Promise<UsageResult[]> {
  const context = await launchClaudeAiContext(config, false);
  let page: Page | undefined;

  try {
    page = await context.newPage();

    console.log('  Not authenticated. Opening browser...');
    await page.goto(USAGE_URL, { waitUntil: 'domcontentloaded' });

    console.log('  Please complete login in the browser...');
    await page.waitForURL(url => !isClaudeAiAuthUrl(url.toString()), { timeout: 300000 });
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
    await waitForClaudeAiUsagePage(page);

    return await extractClaudeAiUsage(config, page);
  } catch (error) {
    const message = error instanceof Error ? error.message.split('\n')[0] : String(error);
    await saveDebugHtml(config, page, message);
    throw error;
  } finally {
    await context.close();
  }
}

export const claudeAiProvider: UsageProvider = {
  metadata: {
    id: 'claude-ai',
    displayName: 'Claude.ai',
    supported: true,
    startTitle: '🤖 Claude.ai',
    startMessage: '🔍 Checking your plan usage...',
    checkingMessage: '🔍 Checking your Claude.ai plan usage...',
    successTitle: '🤖 Claude.ai Usage',
    errorTitle: 'Claude.ai',
    errorMessage: '⚠️ Error while checking usage',
  },
  async getUsage(config: AppConfig): Promise<UsageResult[]> {
    let context: BrowserContext | undefined;
    let page: Page | undefined;

    try {
      context = await launchClaudeAiContext(config, true);
      page = await context.newPage();

      await page.goto(USAGE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await waitForClaudeAiUsagePage(page);

      if (isClaudeAiAuthUrl(page.url())) {
        if (config.json) throw new Error('Claude.ai session is not authenticated. Run without --json to complete browser login.');
        await context.close();
        context = undefined;
        return await runClaudeAiInteractiveLogin(config);
      }

      return await extractClaudeAiUsage(config, page);
    } catch (error) {
      const message = error instanceof Error ? error.message.split('\n')[0] : String(error);
      await saveDebugHtml(config, page, message);
      throw error;
    } finally {
      await context?.close().catch(() => {});
    }
  },
};
