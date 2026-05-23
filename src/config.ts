import { existsSync, readFileSync } from 'node:fs';
import { CHROMIUM_CANDIDATES, DEFAULT_CONFIG_FILE, DEFAULT_ENV_FILE, LOCAL_ENV_FILE } from './paths.js';
import { resolveEnvSources } from './env.js';
import type { AppConfig, FileConfig, ParsedArgs } from './types.js';

export interface ResolveConfigOptions {
  defaultConfigFile?: string;
  defaultEnvFile?: string;
  localEnvFile?: string;
  chromiumCandidates?: string[];
}

export function readConfigFile(configPath: string): FileConfig {
  if (!existsSync(configPath)) return {};

  try {
    return JSON.parse(readFileSync(configPath, 'utf-8')) as FileConfig;
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
  const configPath = mergedEnv.OPENCODE_GO_CONFIG || defaultConfigFile;
  const fileConfig = readConfigFile(configPath);
  const envConfig = {
    workspaceId: mergedEnv.OPENCODE_WORKSPACE_ID,
    chromiumPath: mergedEnv.CHROMIUM_PATH,
  };

  const workspaceId = parsedArgs.cli.workspaceId ?? envConfig.workspaceId ?? fileConfig.workspaceId;
  const configuredChromiumPath = parsedArgs.cli.chromiumPath ?? envConfig.chromiumPath ?? fileConfig.chromiumPath;
  const chromiumPath = configuredChromiumPath || firstExistingPath(chromiumCandidates);
  const notify = parsedArgs.flags.json ? false : (parsedArgs.cli.notify ?? fileConfig.notify ?? true);

  if (!workspaceId || typeof workspaceId !== 'string') {
    throw new Error('Missing workspace ID. Set --workspace, OPENCODE_WORKSPACE_ID in .env, OPENCODE_WORKSPACE_ID in your shell, or workspaceId in config.json.');
  }

  if (configuredChromiumPath && !existsSync(configuredChromiumPath)) {
    throw new Error(`Browser not found at ${configuredChromiumPath}. Set --chromium, CHROMIUM_PATH, or chromiumPath in config.json.`);
  }

  if (!chromiumPath) {
    throw new Error(`No Chromium-compatible browser found. Install Chromium or set --chromium/CHROMIUM_PATH. Checked: ${chromiumCandidates.join(', ')}`);
  }

  return {
    workspaceId,
    chromiumPath,
    notify,
    json: parsedArgs.flags.json,
    debug: parsedArgs.flags.debug,
    configPath,
    configFileLoaded: existsSync(configPath),
    envFilesLoaded: envSources.loadedFiles,
    workspaceSource: parsedArgs.cli.workspaceId ? 'cli' : envConfig.workspaceId ? 'env' : fileConfig.workspaceId ? 'config' : 'missing',
    chromiumSource: parsedArgs.cli.chromiumPath ? 'cli' : envConfig.chromiumPath ? 'env' : fileConfig.chromiumPath ? 'config' : 'auto-detected',
  };
}
