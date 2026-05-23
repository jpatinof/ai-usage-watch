import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceDir = dirname(fileURLToPath(import.meta.url));

export const PROJECT_DIR = resolve(sourceDir, '..');
export const AUTH_FILE = `${homedir()}/.local/share/opencode/auth.json`;
export const SESSION_DIR = `${homedir()}/.config/ai-usage-watch`;
export const SESSION_FILE = `${SESSION_DIR}/session.json`;
export const PROFILE_DIR = `${SESSION_DIR}/browser-profile`;
export const DEFAULT_CONFIG_FILE = `${SESSION_DIR}/config.json`;
export const DEFAULT_ENV_FILE = `${SESSION_DIR}/.env`;
export const LOCAL_ENV_FILE = `${PROJECT_DIR}/.env`;
export const DEBUG_FILE = `${SESSION_DIR}/debug.html`;

export const CHROMIUM_CANDIDATES = [
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/brave-browser',
];
