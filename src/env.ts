import { existsSync, readFileSync } from 'node:fs';
import { DEFAULT_ENV_FILE, LOCAL_ENV_FILE } from './paths.js';

export interface EnvSources {
  values: NodeJS.ProcessEnv;
  loadedFiles: string[];
}

export interface ResolveEnvSourcesOptions {
  defaultEnvFile?: string;
  localEnvFile?: string;
}

export function parseDotEnvValue(value: string): string {
  const trimmed = value.trim();
  const quote = trimmed[0];
  const last = trimmed[trimmed.length - 1];

  if ((quote === '"' || quote === "'") && last === quote) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export function readEnvFile(envPath: string | undefined): NodeJS.ProcessEnv {
  if (!envPath || !existsSync(envPath)) return {};

  try {
    const env: NodeJS.ProcessEnv = {};
    const lines = readFileSync(envPath, 'utf-8').split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const normalized = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
      const separator = normalized.indexOf('=');
      if (separator === -1) continue;

      const key = normalized.slice(0, separator).trim();
      const value = normalized.slice(separator + 1);
      if (key) env[key] = parseDotEnvValue(value);
    }

    return env;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not read .env file at ${envPath}: ${message}`);
  }
}

export function resolveEnvSources(
  env: NodeJS.ProcessEnv = process.env,
  options: ResolveEnvSourcesOptions = {},
): EnvSources {
  const defaultEnvFile = options.defaultEnvFile ?? DEFAULT_ENV_FILE;
  const localEnvFile = options.localEnvFile ?? LOCAL_ENV_FILE;
const configuredEnvPath = env.AI_USAGE_WATCH_ENV || defaultEnvFile;
const hasExplicitEnvPath = Boolean(env.AI_USAGE_WATCH_ENV);
  const localEnv = readEnvFile(localEnvFile);
  const userEnv = configuredEnvPath === localEnvFile ? {} : readEnvFile(configuredEnvPath);

  return {
    values: hasExplicitEnvPath
      ? { ...localEnv, ...userEnv, ...env }
      : { ...userEnv, ...localEnv, ...env },
    loadedFiles: [configuredEnvPath, localEnvFile].filter(path => existsSync(path)),
  };
}
