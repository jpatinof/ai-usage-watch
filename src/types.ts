export interface CliConfigOverrides {
  workspaceId?: string;
  chromiumPath?: string;
  notify?: boolean;
}

export interface CliFlags {
  json: boolean;
  debug: boolean;
  help: boolean;
}

export interface ParsedArgs {
  cli: CliConfigOverrides;
  flags: CliFlags;
}

export interface FileConfig {
  workspaceId?: string;
  chromiumPath?: string;
  notify?: boolean;
}

export interface AppConfig {
  workspaceId: string;
  chromiumPath: string;
  notify: boolean;
  json: boolean;
  debug: boolean;
  configPath: string;
  configFileLoaded: boolean;
  envFilesLoaded: string[];
  workspaceSource: 'cli' | 'env' | 'config' | 'missing';
  chromiumSource: 'cli' | 'env' | 'config' | 'auto-detected';
}

export interface UsageResult {
  name: string;
  used: number;
  limit: number;
  pct: number;
  bars: string;
  reset: string;
}
