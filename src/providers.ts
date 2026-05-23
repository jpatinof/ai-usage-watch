import { extractUsageFromWorkspace, launchPersistentContext, looksUnauthenticated, runInteractiveLogin, saveDebugHtml } from './browser.js';
import type { AppConfig, ProviderId, UsageProvider, UsageResult } from './types.js';

export const DEFAULT_PROVIDER_ID: ProviderId = 'opencode-go';
export const PROVIDER_IDS = ['opencode-go', 'claude-code', 'codex'] as const satisfies readonly ProviderId[];

const openCodeGoProvider: UsageProvider = {
  metadata: {
    id: 'opencode-go',
    displayName: 'OpenCode Go',
    supported: true,
    startTitle: 'OpenCode Go',
    startMessage: 'Checking your usage...',
    checkingMessage: 'Checking your OpenCode Go stats...',
    successTitle: 'OpenCode Go Usage',
    errorTitle: 'OpenCode Go',
    errorMessage: 'Error while checking usage',
  },
  async getUsage(config: AppConfig): Promise<UsageResult[]> {
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
        return runInteractiveLogin(config);
      }

      return extractUsageFromWorkspace(config, page);
    } catch (error) {
      const message = error instanceof Error ? error.message.split('\n')[0] : String(error);
      await saveDebugHtml(config, page, message);
      throw error;
    } finally {
      await context?.close().catch(() => {});
    }
  },
};

function unsupportedProvider(id: ProviderId, displayName: string): UsageProvider {
  return {
    metadata: {
      id,
      displayName,
      supported: false,
      startTitle: displayName,
      startMessage: 'Checking your usage...',
      checkingMessage: `Checking your ${displayName} stats...`,
      successTitle: `${displayName} Usage`,
      errorTitle: displayName,
      errorMessage: 'Usage checking is not supported yet',
    },
    async getUsage(): Promise<UsageResult[]> {
      throw new Error(`${displayName} personal subscription usage is not supported yet because no public usage API is available. This project will not scrape claude.ai or chatgpt.com for personal subscription data.`);
    },
  };
}

const providers: Record<ProviderId, UsageProvider> = {
  'opencode-go': openCodeGoProvider,
  'claude-code': unsupportedProvider('claude-code', 'Claude Code'),
  codex: unsupportedProvider('codex', 'Codex'),
};

export function isProviderId(value: string): value is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(value);
}

export function getProvider(id: ProviderId): UsageProvider {
  return providers[id];
}
