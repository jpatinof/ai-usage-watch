import type { UsageResult } from './types.js';

export function getBars(pct: number): string {
  const clampedPct = Math.max(0, Math.min(100, pct));
  const filled = Math.round(clampedPct / 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

export function parseResetTime(text: string): string | null {
  const match = text.match(/(?:Resets in|Se reinicia en)\s*(\d+)\s*(hour|day|minute|hora|día|dia|minuto)s?(?:\s*(\d+)\s*(hour|minute|hora|minuto)s?)?/i);
  if (!match) return null;

  const num1 = Number.parseInt(match[1] ?? '', 10);
  const unit1 = match[2]?.toLowerCase();
  const num2 = match[3] ? Number.parseInt(match[3], 10) : null;

  if (unit1 === 'day' || unit1 === 'día' || unit1 === 'dia') return `${num1}d ${num2 ? `${num2}h` : '0h'}`;
  if (unit1 === 'hour' || unit1 === 'hora') return num2 ? `${num1}h ${num2}m` : `${num1}h`;
  return `${num1}m`;
}

export function extractUsages(text: string, html: string): UsageResult[] {
  const results: UsageResult[] = [];

  const usageBlocks = [
    { name: '5h', limit: 12, pctRegex: /(?:Rolling Usage|Uso Continuo)[\s\S]*?(\d+)%/i, resetRegex: /(?:Rolling Usage|Uso Continuo)[\s\S]*?(?:Resets in|Se reinicia en)[^.]+/i },
    { name: 'Weekly', limit: 30, pctRegex: /(?:Weekly Usage|Uso Semanal)[\s\S]*?(\d+)%/i, resetRegex: /(?:Weekly Usage|Uso Semanal)[\s\S]*?(?:Resets in|Se reinicia en)[^.]+/i },
    { name: 'Monthly', limit: 60, pctRegex: /(?:Monthly Usage|Uso Mensual)[\s\S]*?(\d+)%/i, resetRegex: /(?:Monthly Usage|Uso Mensual)[\s\S]*?(?:Resets in|Se reinicia en)[^.]+/i },
  ];

  for (const block of usageBlocks) {
    const pctMatch = text.match(block.pctRegex);
    const resetMatch = text.match(block.resetRegex);

    if (pctMatch?.[1]) {
      const pct = Number.parseInt(pctMatch[1], 10);
      const used = (pct / 100) * block.limit;
      const reset = resetMatch ? parseResetTime(resetMatch[0]) ?? '' : '';
      results.push({ name: block.name, used, limit: block.limit, pct, bars: getBars(pct), reset });
    }
  }

  const dollarPatterns = [
    { name: '5h', limit: 12, regex: /\$([0-9.]+)\s*\/\s*\$?12(?!\d)/i },
    { name: 'Weekly', limit: 30, regex: /\$([0-9.]+)\s*\/\s*\$?30(?!\d)/i },
    { name: 'Monthly', limit: 60, regex: /\$([0-9.]+)\s*\/\s*\$?60(?!\d)/i },
  ];

  for (const pattern of dollarPatterns) {
    if (results.some(result => result.name === pattern.name)) continue;

    const match = text.match(pattern.regex) || html.match(pattern.regex);
    if (!match?.[1]) continue;

    const used = Number.parseFloat(match[1]);
    const pct = Math.round((used / pattern.limit) * 100);
    results.push({ name: pattern.name, used, limit: pattern.limit, pct, bars: getBars(pct), reset: '' });
  }

  return results;
}
