import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceDir = dirname(fileURLToPath(import.meta.url));

export const PROJECT_DIR = resolve(sourceDir, '..');
export const AUTH_FILE = `${homedir()}/.local/share/opencode/auth.json`;
export const SESSION_DIR = `${homedir()}/.config/ai-usage-watch`;
export const SESSION_FILE = `${SESSION_DIR}/session.json`;
export const PROFILE_DIR = `${SESSION_DIR}/browser-profile`;
export const PROFILE_DIR_CLAUDE_AI = `${SESSION_DIR}/browser-profile-claude-ai`;
export const DEFAULT_CONFIG_FILE = `${SESSION_DIR}/config.json`;
export const DEFAULT_ENV_FILE = `${SESSION_DIR}/.env`;
export const LOCAL_ENV_FILE = `${PROJECT_DIR}/.env`;
export const DEBUG_FILE = `${SESSION_DIR}/debug.html`;

const getChromiumCandidates = (): string[] => {
  if (process.platform === 'win32') {
    const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const localAppData = process.env['LOCALAPPDATA'] || `${homedir()}\\AppData\\Local`;

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

  return [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/brave-browser',
  ];
};

export const CHROMIUM_CANDIDATES = getChromiumCandidates();
