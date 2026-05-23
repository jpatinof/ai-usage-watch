import { execFileSync } from 'node:child_process';
import type { UsageResult } from './types.js';

export function notify(title: string, body: string): void {
  try {
    execFileSync('notify-send', ['-u', 'low', '-t', '12000', title, body], { stdio: 'ignore' });
  } catch {
    // Desktop notifications are best-effort only.
  }
}

export function notifyStart(enabled: boolean): void {
  if (!enabled) return;

  try {
    execFileSync('notify-send', ['-u', 'low', '-t', '5000', 'OpenCode Go', 'Checking your usage...'], { stdio: 'ignore' });
  } catch {
    // Desktop notifications are best-effort only.
  }
}

export function maybeNotify(enabled: boolean, title: string, body: string): void {
  if (enabled) notify(title, body);
}

export function formatUsageNotification(usages: UsageResult[]): string {
  return usages.map(usage => {
    const resetLine = usage.reset ? ` ↻ ${usage.reset}` : '';
    return `${usage.name}: ${usage.bars} ${usage.pct}%${resetLine}`;
  }).join('\n');
}
