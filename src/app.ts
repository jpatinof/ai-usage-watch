import { formatUsageNotification, maybeNotify, notifyStart } from './notifier.js';
import { getProvider } from './providers.js';
import type { AppConfig, UsageResult } from './types.js';

export async function getUsage(config: AppConfig): Promise<UsageResult[]> {
  const provider = getProvider(config.providerId);
  const { metadata } = provider;

  if (!config.json) console.log(`\n  ${metadata.checkingMessage}\n`);
  notifyStart(config.notify, metadata.startTitle, metadata.startMessage);

  try {
    const usages = await provider.getUsage(config);
    maybeNotify(config.notify, metadata.successTitle, formatUsageNotification(usages));
    return usages;
  } catch (error) {
    maybeNotify(config.notify, metadata.errorTitle, metadata.errorMessage);
    throw error;
  }
}
