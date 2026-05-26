import type { UsageResult } from './types.js';

function formatPercent(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/\.00$/, '').replace(/0$/, '');
}

function formatUsageValue(usage: UsageResult): string {
  if (usage.unit === 'percent') {
    return `${formatPercent(usage.used)}% / 100%`;
  }

  return `$${usage.used.toFixed(2)} / $${usage.limit}`;
}

export function printHumanUsage(usages: UsageResult[]): void {
  console.log('  ✓  Fetched! Here\'s your usage:\n');

  for (const usage of usages) {
    const resetStr = usage.reset ? ` ↻ resets ${usage.reset}` : '';
    console.log('  ┌─────────────────────────────────────┐');
    console.log(`  │  ${usage.name.padEnd(12)} ${usage.bars}  ${formatPercent(usage.pct).padStart(3)}%`);
    console.log(`  │  ${formatUsageValue(usage)}${resetStr}`);
    console.log('  └─────────────────────────────────────┘');
  }

  console.log('');
}

export function printJson(workspaceId: string, usages: UsageResult[]): void {
  console.log(JSON.stringify({ workspaceId, usages }, null, 2));
}

export function printJsonError(message: string): void {
  console.log(JSON.stringify({ error: message }, null, 2));
}
