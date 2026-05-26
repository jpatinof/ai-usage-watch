import { getBars } from '../usage-parser.js';
import type { UsageResult } from '../types.js';

export interface ParsedCodexUsageRow {
  name: string;
  remainingPct: number;
  reset: string;
}

function sanitizeReset(value: string): string {
  return value.trim().replace(/[<>&"]/g, '');
}

function parseRemainingPct(line: string, nextLine = ''): number | null {
  const sameLineMatch = line.match(/(\d+(?:\.\d+)?)\s*%\s*remaining/i);
  const splitLineMatch = line.match(/^(\d+(?:\.\d+)?)\s*%$/) && /^remaining$/i.test(nextLine)
    ? line.match(/^(\d+(?:\.\d+)?)\s*%$/)
    : null;
  const match = sameLineMatch ?? splitLineMatch;
  if (!match?.[1]) return null;

  const pct = Number.parseFloat(match[1]);
  return Number.isNaN(pct) ? null : Math.max(0, Math.min(100, pct));
}

export function parseCodexUsage(pageText: string): ParsedCodexUsageRow[] {
  const results: ParsedCodexUsageRow[] = [];
  const lines = pageText.split('\n').map(line => line.trim()).filter(Boolean);
  const sections = [
    { name: '5h', label: /5\s*hour\s+usage\s+limit/i },
    { name: 'Weekly', label: /weekly\s+usage\s+limit/i },
  ];

  for (const section of sections) {
    const idx = lines.findIndex(line => section.label.test(line));
    if (idx === -1) continue;

    let remainingPct: number | null = null;
    let reset = '';

    for (let i = idx + 1; i < Math.min(idx + 10, lines.length); i++) {
      const line = lines[i] ?? '';
      const nextLine = lines[i + 1] ?? '';
      if (sections.some(candidate => candidate.name !== section.name && candidate.label.test(line))) break;

      if (remainingPct === null) remainingPct = parseRemainingPct(line, nextLine);

      if (!reset) {
        const resetMatch = line.match(/Resets\s+(.+)/i);
        if (resetMatch?.[1]) reset = sanitizeReset(resetMatch[1]);
      }
    }

    if (remainingPct === null) continue;
    results.push({ name: section.name, remainingPct, reset });
  }

  return results;
}

export function toCodexUsageResults(rows: ParsedCodexUsageRow[]): UsageResult[] {
  return rows.map(row => {
    const usedPct = Math.max(0, Math.min(100, 100 - row.remainingPct));
    return {
      name: row.name,
      used: usedPct,
      limit: 100,
      unit: 'percent',
      pct: usedPct,
      bars: getBars(usedPct),
      reset: row.reset,
    };
  });
}
