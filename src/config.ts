import { existsSync, readFileSync } from 'node:fs';
import { CHROMIUM_CANDIDATES, DEFAULT_CONFIG_FILE, DEFAULT_ENV_FILE, LOCAL_ENV_FILE } from './paths.js';
import { resolveEnvSources } from './env.js';
import { DEFAULT_PROVIDER_ID, isProviderId, PROVIDER_IDS } from './providers.js';
import type { AppConfig, FileConfig, ParsedArgs, ProviderId } from './types.js';

export interface ResolveConfigOptions {
  defaultConfigFile?: string;
  defaultEnvFile?: string;
  localEnvFile?: string;
  chromiumCandidates?: string[];
}

function validateConfigObject(value: unknown, configPath: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Config file at ${configPath} must contain a JSON object.`);
  }

  return value as Record<string, unknown>;
}

function readOptionalString(config: Record<string, unknown>, key: keyof FileConfig, configPath: string): string | undefined {
  const value = config[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new Error(`Invalid ${String(key)} in ${configPath}: expected a string.`);

  const trimmed = value.trim();
  if (!trimmed) throw new Error(`Invalid ${String(key)} in ${configPath}: expected a non-empty string.`);
  return trimmed;
}

function readOptionalProvider(config: Record<string, unknown>, key: keyof FileConfig, configPath: string): ProviderId | undefined {
  const value = readOptionalString(config, key, configPath);
  if (value === undefined) return undefined;
  if (!isProviderId(value)) throw new Error(`Invalid ${String(key)} in ${configPath}: expected one of ${PROVIDER_IDS.join(', ')}.`);

  return value;
}

function readOptionalBoolean(config: Record<string, unknown>, key: keyof FileConfig, configPath: string): boolean | undefined {
  const value = config[key];
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;

  throw new Error(`Invalid ${String(key)} in ${configPath}: expected a boolean.`);
}

function validateFileConfig(value: unknown, configPath: string): FileConfig {
  const config = validateConfigObject(value, configPath);

  return {
    provider: readOptionalProvider(config, 'provider', configPath),
    workspaceId: readOptionalString(config, 'workspaceId', configPath),
    chromiumPath: readOptionalString(config, 'chromiumPath', configPath),
    notify: readOptionalBoolean(config, 'notify', configPath),
  };
}

export function readConfigFile(configPath: string): FileConfig {
  if (!existsSync(configPath)) return {};

  try {
    return validateFileConfig(JSON.parse(readFileSync(configPath, 'utf-8')), configPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not read config file at ${configPath}: ${message}`);
  }
}

export function firstExistingPath(paths: string[]): string | null {
  return paths.find(path => existsSync(path)) || null;
}

export function resolveConfig(
  parsedArgs: ParsedArgs,
  env: NodeJS.ProcessEnv = process.env,
  options: ResolveConfigOptions = {},
): AppConfig {
  const defaultConfigFile = options.defaultConfigFile ?? DEFAULT_CONFIG_FILE;
  const defaultEnvFile = options.defaultEnvFile ?? DEFAULT_ENV_FILE;
  const localEnvFile = options.localEnvFile ?? LOCAL_ENV_FILE;
  const chromiumCandidates = options.chromiumCandidates ?? CHROMIUM_CANDIDATES;
  const envSources = resolveEnvSources(env, { defaultEnvFile, localEnvFile });
  const mergedEnv = envSources.values;
  const configPath = mergedEnv.AI_USAGE_WATCH_CONFIG || defaultConfigFile;
  const fileConfig = readConfigFile(configPath);
  const envConfig = {
    providerId: mergedEnv.AI_USAGE_WATCH_PROVIDER,
    workspaceId: mergedEnv.OPENCODE_WORKSPACE_ID,
    chromiumPath: mergedEnv.CHROMIUM_PATH,
  };

  const rawProviderId = parsedArgs.cli.providerId ?? envConfig.providerId ?? fileConfig.provider ?? DEFAULT_PROVIDER_ID;
  if (!isProviderId(rawProviderId)) throw new Error(`Invalid provider "${rawProviderId}". Expected one of: ${PROVIDER_IDS.join(', ')}.`);

  const providerId = rawProviderId;
  const workspaceId = parsedArgs.cli.workspaceId ?? envConfig.workspaceId ?? fileConfig.workspaceId;
  const configuredChromiumPath = parsedArgs.cli.chromiumPath ?? envConfig.chromiumPath ?? fileConfig.chromiumPath;
  const chromiumPath = configuredChromiumPath || firstExistingPath(chromiumCandidates);
  const notify = parsedArgs.flags.json ? false : (parsedArgs.cli.notify ?? fileConfig.notify ?? true);

  if (providerId === 'opencode-go' && (!workspaceId || typeof workspaceId !== 'string')) {
    throw new Error('Missing workspace ID. Set --workspace, OPENCODE_WORKSPACE_ID in .env, OPENCODE_WORKSPACE_ID in your shell, or workspaceId in config.json.');
  }

  if (providerId === 'opencode-go' && configuredChromiumPath && !existsSync(configuredChromiumPath)) {
    throw new Error(`Browser not found at ${configuredChromiumPath}. Set --chromium, CHROMIUM_PATH, or chromiumPath in config.json.`);
  }

  if (providerId === 'opencode-go' && !chromiumPath) {
    throw new Error(`No Chromium-compatible browser found. Install Chromium or set --chromium/CHROMIUM_PATH. Checked: ${chromiumCandidates.join(', ')}`);
  }

  return {
    providerId,
    workspaceId: workspaceId ?? '',
    chromiumPath: chromiumPath ?? '',
    notify,
    json: parsedArgs.flags.json,
    debug: parsedArgs.flags.debug,
    configPath,
    configFileLoaded: existsSync(configPath),
    envFilesLoaded: envSources.loadedFiles,
    providerSource: parsedArgs.cli.providerId ? 'cli' : envConfig.providerId ? 'env' : fileConfig.provider ? 'config' : 'default',
    workspaceSource: parsedArgs.cli.workspaceId ? 'cli' : envConfig.workspaceId ? 'env' : fileConfig.workspaceId ? 'config' : 'missing',
    chromiumSource: parsedArgs.cli.chromiumPath ? 'cli' : envConfig.chromiumPath ? 'env' : fileConfig.chromiumPath ? 'config' : 'auto-detected',
  };
}
