import { extractUsageFromWorkspace, launchPersistentContext, looksUnauthenticated, runInteractiveLogin, saveDebugHtml } from './browser.js';
import { formatUsageNotification, maybeNotify, notifyStart } from './notifier.js';
import type { AppConfig, UsageResult } from './types.js';

export async function getUsage(config: AppConfig): Promise<UsageResult[]> {
  if (!config.json) console.log('\n  Checking your OpenCode Go stats...\n');
  notifyStart(config.notify);

  let context;
  let page;

  try {
    context = await launchPersistentContext(config, true);
    page = await context.newPage();

    await page.goto('https://opencode.ai', { waitUntil: 'domcontentloaded', timeout: 15000 });

    if (await looksUnauthenticated(page)) {
      if (config.json) throw new Error('OpenCode session is not authenticated. Run without --json to complete browser login.');

      await context.close();
      context = undefined;
      const usages = await runInteractiveLogin(config);
      maybeNotify(config.notify, 'OpenCode Go Usage', formatUsageNotification(usages));
      return usages;
    }

    const usages = await extractUsageFromWorkspace(config, page);
    maybeNotify(config.notify, 'OpenCode Go Usage', formatUsageNotification(usages));
    return usages;
  } catch (error) {
    const message = error instanceof Error ? error.message.split('\n')[0] : String(error);
    await saveDebugHtml(config, page, message);
    maybeNotify(config.notify, 'OpenCode Go', 'Error while checking usage');
    throw error;
  } finally {
    await context?.close().catch(() => {});
  }
}
