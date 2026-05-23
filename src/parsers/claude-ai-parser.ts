import { getBars } from '../usage-parser.js';
import type { UsageResult } from '../types.js';

export interface ParsedUsageRow {
  name: string;
  pct: number;
  reset: string;
}

export function parseClaudeAiUsage(pageText: string): ParsedUsageRow[] {
  const results: ParsedUsageRow[] = [];
  const lines = pageText.split('\n').map(l => l.trim()).filter(Boolean);

  const sections = [
    { label: 'Current session', name: 'Session' },
    { label: 'All models', name: 'Weekly' },
    { label: 'Claude Design', name: 'Claude Design' },
  ];

  for (const section of sections) {
    const idx = lines.findIndex(l => l === section.label || l.startsWith(section.label));
    if (idx === -1) continue;

    // Search for pct in next 6 lines
    let pct: number | null = null;
    let reset = '';

    for (let i = idx + 1; i < Math.min(idx + 7, lines.length); i++) {
      const line = lines[i];

      if (pct === null) {
        const pctMatch = line.match(/(\d+)%\s*used/i);
        if (pctMatch?.[1]) {
          const parsed = Number.parseInt(pctMatch[1], 10);
          if (!Number.isNaN(parsed)) pct = parsed;
        }
      }

      if (!reset) {
        const resetInMatch = line.match(/Resets in (.+)/i);
        if (resetInMatch?.[1]) {
          reset = resetInMatch[1].trim().replace(/[<>&"]/g, '');
          continue;
        }
        const resetDayMatch = line.match(/Resets\s+(\w{3}\s+[\d:]+\s*[AP]M)/i);
        if (resetDayMatch?.[1]) {
          reset = resetDayMatch[1].trim().replace(/[<>&"]/g, '');
          continue;
        }
        if (/haven't used/i.test(line)) {
          reset = '';
        }
      }
    }

    if (pct === null) continue; // skip row if no valid pct found
    results.push({ name: section.name, pct, reset });
  }

  return results;
}

export function toUsageResults(rows: ParsedUsageRow[]): UsageResult[] {
  return rows.map(row => ({
    name: row.name,
    used: row.pct,
    limit: 100,
    pct: row.pct,
    bars: getBars(row.pct),
    reset: row.reset,
  }));
}
