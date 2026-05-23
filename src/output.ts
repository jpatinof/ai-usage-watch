import type { UsageResult } from './types.js';

export function printHumanUsage(usages: UsageResult[]): void {
  console.log('  ✓  Fetched! Here\'s your usage:\n');

  for (const usage of usages) {
    const resetStr = usage.reset ? ` ↻ resets ${usage.reset}` : '';
    console.log('  ┌─────────────────────────────────────┐');
    console.log(`  │  ${usage.name.padEnd(12)} ${usage.bars}  ${usage.pct.toString().padStart(3)}%`);
    console.log(`  │  $${usage.used.toFixed(2)} / $${usage.limit}${resetStr}`);
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
