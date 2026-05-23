import { readFileSync } from 'node:fs';
import { AUTH_FILE } from './paths.js';

export function getApiKey(authFile = AUTH_FILE): string | null {
  try {
    const auth = JSON.parse(readFileSync(authFile, 'utf-8')) as Record<string, { key?: string } | undefined>;
    return auth['opencode-go']?.key ?? null;
  } catch {
    return null;
  }
}
