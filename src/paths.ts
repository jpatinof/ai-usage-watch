import { homedir } from 'node:os';
import { dirname, posix, resolve, win32 } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceDir = dirname(fileURLToPath(import.meta.url));

type SupportedPlatform = NodeJS.Platform;

export interface PlatformPathOptions {
  platform?: SupportedPlatform;
  env?: NodeJS.ProcessEnv;
  homeDir?: string;
}

export interface PlatformPaths {
  authFile: string;
  sessionDir: string;
  sessionFile: string;
  profileDir: string;
  claudeAiProfileDir: string;
  codexProfileDir: string;
  defaultConfigFile: string;
  defaultEnvFile: string;
  debugFile: string;
}

function homeFrom(options: PlatformPathOptions): string {
  return options.homeDir ?? homedir();
}

export function getPlatformPaths(options: PlatformPathOptions = {}): PlatformPaths {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const home = homeFrom(options);
  const path = platform === 'win32' ? win32 : posix;

  const configRoot = platform === 'win32'
    ? env.APPDATA || path.join(home, 'AppData', 'Roaming')
    : platform === 'darwin'
      ? path.join(home, 'Library', 'Application Support')
      : env.XDG_CONFIG_HOME || path.join(home, '.config');
  const dataRoot = platform === 'win32'
    ? env.LOCALAPPDATA || path.join(home, 'AppData', 'Local')
    : platform === 'darwin'
      ? path.join(home, 'Library', 'Application Support')
      : env.XDG_DATA_HOME || path.join(home, '.local', 'share');

  const sessionDir = path.join(configRoot, 'ai-usage-watch');

  return {
    authFile: path.join(dataRoot, 'opencode', 'auth.json'),
    sessionDir,
    sessionFile: path.join(sessionDir, 'session.json'),
    profileDir: path.join(sessionDir, 'browser-profile'),
    claudeAiProfileDir: path.join(sessionDir, 'browser-profile-claude-ai'),
    codexProfileDir: path.join(sessionDir, 'browser-profile-codex'),
    defaultConfigFile: path.join(sessionDir, 'config.json'),
    defaultEnvFile: path.join(sessionDir, '.env'),
    debugFile: path.join(sessionDir, 'debug.html'),
  };
}

export const PROJECT_DIR = resolve(sourceDir, '..');
const DEFAULT_PATHS = getPlatformPaths();
export const AUTH_FILE = DEFAULT_PATHS.authFile;
export const SESSION_DIR = DEFAULT_PATHS.sessionDir;
export const SESSION_FILE = DEFAULT_PATHS.sessionFile;
export const PROFILE_DIR = DEFAULT_PATHS.profileDir;
export const PROFILE_DIR_CLAUDE_AI = DEFAULT_PATHS.claudeAiProfileDir;
export const PROFILE_DIR_CODEX = DEFAULT_PATHS.codexProfileDir;
export const DEFAULT_CONFIG_FILE = DEFAULT_PATHS.defaultConfigFile;
export const DEFAULT_ENV_FILE = DEFAULT_PATHS.defaultEnvFile;
export const LOCAL_ENV_FILE = `${PROJECT_DIR}/.env`;
export const DEBUG_FILE = DEFAULT_PATHS.debugFile;

export const getChromiumCandidates = (options: PlatformPathOptions = {}): string[] => {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const home = homeFrom(options);
  const path = platform === 'win32' ? win32 : posix;

  if (platform === 'win32') {
    const programFiles = env['ProgramFiles'] || 'C:\\Program Files';
    const programFilesX86 = env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const localAppData = env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');

    return [
      // Google Chrome
      `${programFiles}\\Google\\Chrome\\Application\\chrome.exe`,
      `${programFilesX86}\\Google\\Chrome\\Application\\chrome.exe`,
      `${localAppData}\\Google\\Chrome\\Application\\chrome.exe`,
      // Brave Browser
      `${programFiles}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
      `${programFilesX86}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
      `${localAppData}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
      // Microsoft Edge
      `${programFiles}\\Microsoft\\Edge\\Application\\msedge.exe`,
      `${programFilesX86}\\Microsoft\\Edge\\Application\\msedge.exe`,
      `${localAppData}\\Microsoft\\Edge\\Application\\msedge.exe`,
    ];
  }

  if (platform === 'darwin') {
    return [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      path.join(home, 'Applications', 'Google Chrome.app', 'Contents', 'MacOS', 'Google Chrome'),
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      path.join(home, 'Applications', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      path.join(home, 'Applications', 'Brave Browser.app', 'Contents', 'MacOS', 'Brave Browser'),
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      path.join(home, 'Applications', 'Microsoft Edge.app', 'Contents', 'MacOS', 'Microsoft Edge'),
    ];
  }

  return [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/brave-browser',
  ];
};

export const CHROMIUM_CANDIDATES = getChromiumCandidates();
