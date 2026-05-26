export type ProviderId = 'opencode-go' | 'claude-code' | 'codex' | 'claude-ai';

export interface CliConfigOverrides {
  providerId?: ProviderId;
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
  provider?: ProviderId;
  workspaceId?: string;
  chromiumPath?: string;
  notify?: boolean;
}

export interface AppConfig {
  providerId: ProviderId;
  workspaceId: string;
  chromiumPath: string;
  notify: boolean;
  json: boolean;
  debug: boolean;
  configPath: string;
  configFileLoaded: boolean;
  envFilesLoaded: string[];
  providerSource: 'cli' | 'env' | 'config' | 'default';
  workspaceSource: 'cli' | 'env' | 'config' | 'missing';
  chromiumSource: 'cli' | 'env' | 'config' | 'auto-detected';
}

export interface UsageResult {
  name: string;
  used: number;
  limit: number;
  unit?: 'usd' | 'percent';
  pct: number;
  bars: string;
  reset: string;
}

export interface ProviderMetadata {
  id: ProviderId;
  displayName: string;
  supported: boolean;
  requiresBrowser: boolean;
  startTitle: string;
  startMessage: string;
  checkingMessage: string;
  successTitle: string;
  errorTitle: string;
  errorMessage: string;
}

export interface UsageProvider {
  metadata: ProviderMetadata;
  getUsage(config: AppConfig): Promise<UsageResult[]>;
}
