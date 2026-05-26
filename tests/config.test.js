import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from '../dist/cli.js';
import { resolveConfig } from '../dist/config.js';
import { parseDotEnvValue, readEnvFile, resolveEnvSources } from '../dist/env.js';
import { getUsage } from '../dist/app.js';
import { getChromiumCandidates, getPlatformPaths } from '../dist/paths.js';
import { notify, notifyStart } from '../dist/notifier.js';

function fixturePaths() {
  const dir = mkdtempSync(join(tmpdir(), 'opencode-go-usage-'));
  const browser = join(dir, 'chromium');
  writeFileSync(browser, '');

  return {
    dir,
    browser,
    missingEnv: join(dir, 'missing.env'),
    missingConfig: join(dir, 'missing.json'),
  };
}

test('parseDotEnvValue strips matching quotes', () => {
  assert.equal(parseDotEnvValue('"hello"'), 'hello');
  assert.equal(parseDotEnvValue("'hello'"), 'hello');
  assert.equal(parseDotEnvValue('hello'), 'hello');
});

test('readEnvFile supports comments and export syntax', () => {
  const { dir } = fixturePaths();
  const envFile = join(dir, '.env');
  writeFileSync(envFile, '# comment\nexport OPENCODE_WORKSPACE_ID=wrk_env\nCHROMIUM_PATH="/bin/chromium"\n');

  const env = readEnvFile(envFile);

  assert.equal(env.OPENCODE_WORKSPACE_ID, 'wrk_env');
  assert.equal(env.CHROMIUM_PATH, '/bin/chromium');
});

test('resolveEnvSources lets local .env override the default user .env', () => {
  const { dir } = fixturePaths();
  const defaultEnvFile = join(dir, 'default.env');
  const localEnvFile = join(dir, 'local.env');
  writeFileSync(defaultEnvFile, 'OPENCODE_WORKSPACE_ID=wrk_default\n');
  writeFileSync(localEnvFile, 'OPENCODE_WORKSPACE_ID=wrk_local\n');

  const sources = resolveEnvSources({}, { defaultEnvFile, localEnvFile });

  assert.equal(sources.values.OPENCODE_WORKSPACE_ID, 'wrk_local');
});

test('resolveEnvSources lets explicit AI_USAGE_WATCH_ENV override local .env', () => {
  const { dir } = fixturePaths();
  const explicitEnvFile = join(dir, 'explicit.env');
  const localEnvFile = join(dir, 'local.env');
  writeFileSync(explicitEnvFile, 'OPENCODE_WORKSPACE_ID=wrk_explicit\n');
  writeFileSync(localEnvFile, 'OPENCODE_WORKSPACE_ID=wrk_local\n');

  const sources = resolveEnvSources({ AI_USAGE_WATCH_ENV: explicitEnvFile }, {
    defaultEnvFile: join(dir, 'missing.env'),
    localEnvFile,
  });

  assert.equal(sources.values.OPENCODE_WORKSPACE_ID, 'wrk_explicit');
});

test('resolveConfig uses CLI over env over config', () => {
  const { browser, dir, missingEnv } = fixturePaths();
  const configFile = join(dir, 'config.json');
  writeFileSync(configFile, JSON.stringify({ workspaceId: 'wrk_config', chromiumPath: browser, notify: true }));

  const parsedArgs = parseArgs(['--workspace', 'wrk_cli', '--no-notify']);
  const config = resolveConfig(parsedArgs, {
    OPENCODE_WORKSPACE_ID: 'wrk_env',
    AI_USAGE_WATCH_CONFIG: configFile,
  }, {
    defaultEnvFile: missingEnv,
    localEnvFile: missingEnv,
    chromiumCandidates: [browser],
  });

  assert.equal(config.workspaceId, 'wrk_cli');
  assert.equal(config.providerId, 'opencode-go');
  assert.equal(config.providerSource, 'default');
  assert.equal(config.workspaceSource, 'cli');
  assert.equal(config.chromiumPath, browser);
  assert.equal(config.notify, false);
});

test('resolveConfig reads provider from CLI over env over config', () => {
  const { dir, missingEnv } = fixturePaths();
  const configFile = join(dir, 'config.json');
  writeFileSync(configFile, JSON.stringify({ provider: 'codex' }));

  const config = resolveConfig(parseArgs(['--provider', 'claude-code']), {
    AI_USAGE_WATCH_CONFIG: configFile,
    AI_USAGE_WATCH_PROVIDER: 'codex',
  }, {
    defaultEnvFile: missingEnv,
    localEnvFile: missingEnv,
    chromiumCandidates: [],
  });

  assert.equal(config.providerId, 'claude-code');
  assert.equal(config.providerSource, 'cli');
  assert.equal(config.workspaceId, '');
  assert.equal(config.chromiumPath, '');
});

test('parseArgs rejects invalid provider', () => {
  assert.throws(() => parseArgs(['--provider', 'unknown']), /Invalid provider/);
});

test('resolveConfig rejects invalid provider from environment before workspace validation', () => {
  const { missingConfig, missingEnv } = fixturePaths();

  assert.throws(() => resolveConfig(parseArgs([]), {
    AI_USAGE_WATCH_CONFIG: missingConfig,
    AI_USAGE_WATCH_PROVIDER: 'unknown',
  }, {
    defaultEnvFile: missingEnv,
    localEnvFile: missingEnv,
    chromiumCandidates: [],
  }), /Invalid provider/);
});

test('resolveConfig requires explicit workspace ID', () => {
  const { browser, missingConfig, missingEnv } = fixturePaths();
  const parsedArgs = parseArgs([]);

  assert.throws(() => resolveConfig(parsedArgs, { AI_USAGE_WATCH_CONFIG: missingConfig }, {
    defaultEnvFile: missingEnv,
    localEnvFile: missingEnv,
    chromiumCandidates: [browser],
  }), /Missing workspace ID/);
});

test('resolveConfig requires a browser for supported Playwright providers', () => {
  const { missingConfig, missingEnv } = fixturePaths();

  assert.throws(() => resolveConfig(parseArgs(['--provider', 'claude-ai']), {
    AI_USAGE_WATCH_CONFIG: missingConfig,
  }, {
    defaultEnvFile: missingEnv,
    localEnvFile: missingEnv,
    chromiumCandidates: [],
  }), /No Chromium-compatible browser found/);
});

test('resolveConfig does not require browser config for unsupported providers', () => {
  const { missingConfig, missingEnv } = fixturePaths();

  const config = resolveConfig(parseArgs(['--provider', 'codex']), {
    AI_USAGE_WATCH_CONFIG: missingConfig,
  }, {
    defaultEnvFile: missingEnv,
    localEnvFile: missingEnv,
    chromiumCandidates: [],
  });

  assert.equal(config.providerId, 'codex');
  assert.equal(config.chromiumPath, '');
});

test('unsupported providers ignore invalid browser paths until provider execution', async () => {
  const { dir, missingConfig, missingEnv } = fixturePaths();
  const missingBrowser = join(dir, 'missing-browser');

  const config = resolveConfig(parseArgs(['--provider', 'codex', '--chromium', missingBrowser, '--json']), {
    AI_USAGE_WATCH_CONFIG: missingConfig,
  }, {
    defaultEnvFile: missingEnv,
    localEnvFile: missingEnv,
    chromiumCandidates: [],
  });

  assert.equal(config.providerId, 'codex');
  assert.equal(config.chromiumPath, missingBrowser);
  await assert.rejects(() => getUsage(config), /Codex personal subscription usage is not supported yet/);
});

test('resolveConfig rejects malformed JSON config values', () => {
  const { browser, dir, missingEnv } = fixturePaths();
  const configFile = join(dir, 'config.json');
  writeFileSync(configFile, JSON.stringify({ workspaceId: 123, chromiumPath: browser, notify: true }));

  assert.throws(() => resolveConfig(parseArgs([]), { AI_USAGE_WATCH_CONFIG: configFile }, {
    defaultEnvFile: missingEnv,
    localEnvFile: missingEnv,
    chromiumCandidates: [browser],
  }), /Invalid workspaceId/);
});

test('resolveConfig coerces boolean-like notify from JSON config', () => {
  const { browser, dir, missingEnv } = fixturePaths();
  const configFile = join(dir, 'config.json');
  writeFileSync(configFile, JSON.stringify({ workspaceId: 'wrk_config', chromiumPath: browser, notify: 'false' }));

  const config = resolveConfig(parseArgs([]), { AI_USAGE_WATCH_CONFIG: configFile }, {
    defaultEnvFile: missingEnv,
    localEnvFile: missingEnv,
    chromiumCandidates: [browser],
  });

  assert.equal(config.notify, false);
});

test('getPlatformPaths preserves Linux XDG defaults and overrides', () => {
  const paths = getPlatformPaths({
    platform: 'linux',
    homeDir: '/home/tester',
    env: { XDG_CONFIG_HOME: '/cfg', XDG_DATA_HOME: '/data' },
  });

  assert.equal(paths.sessionDir, '/cfg/ai-usage-watch');
  assert.equal(paths.defaultEnvFile, '/cfg/ai-usage-watch/.env');
  assert.equal(paths.authFile, '/data/opencode/auth.json');
});

test('getPlatformPaths uses Windows roaming config and local data roots', () => {
  const paths = getPlatformPaths({
    platform: 'win32',
    homeDir: 'C:\\Users\\tester',
    env: { APPDATA: 'C:\\Users\\tester\\AppData\\Roaming', LOCALAPPDATA: 'C:\\Users\\tester\\AppData\\Local' },
  });

  assert.match(paths.sessionDir, /AppData[\\/]Roaming[\\/]ai-usage-watch$/);
  assert.match(paths.authFile, /AppData[\\/]Local[\\/]opencode[\\/]auth\.json$/);
});

test('getPlatformPaths uses macOS Application Support', () => {
  const paths = getPlatformPaths({ platform: 'darwin', homeDir: '/Users/tester', env: {} });

  assert.equal(paths.sessionDir, '/Users/tester/Library/Application Support/ai-usage-watch');
  assert.equal(paths.authFile, '/Users/tester/Library/Application Support/opencode/auth.json');
});

test('getChromiumCandidates includes macOS app bundle executables', () => {
  const candidates = getChromiumCandidates({ platform: 'darwin', homeDir: '/Users/tester', env: {} });

  assert.ok(candidates.includes('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'));
  assert.ok(candidates.includes('/Applications/Chromium.app/Contents/MacOS/Chromium'));
  assert.ok(candidates.includes('/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'));
  assert.ok(candidates.includes('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'));
});

test('getChromiumCandidates includes Windows browser install roots', () => {
  const candidates = getChromiumCandidates({
    platform: 'win32',
    homeDir: 'C:\\Users\\tester',
    env: {
      ProgramFiles: 'C:\\Program Files',
      'ProgramFiles(x86)': 'C:\\Program Files (x86)',
      LOCALAPPDATA: 'C:\\Users\\tester\\AppData\\Local',
    },
  });

  assert.ok(candidates.includes('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'));
  assert.ok(candidates.includes('C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe'));
  assert.ok(candidates.includes('C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'));
  assert.ok(candidates.includes('C:\\Users\\tester\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'));
});

test('notify uses built-in macOS osascript path without throwing', () => {
  const calls = [];
  const execFile = (command, args) => {
    calls.push([command, args]);
    return Buffer.from('');
  };

  notify('Title', 'Body', { platform: 'darwin', execFile });

  assert.equal(calls[0][0], 'osascript');
  assert.deepEqual(calls[0][1][0], '-e');
});

test('notify escapes macOS notification newlines for AppleScript', () => {
  const calls = [];
  const execFile = (command, args) => {
    calls.push([command, args]);
    return Buffer.from('');
  };

  notify('Title', 'Line 1\nLine 2\r\nLine 3', { platform: 'darwin', execFile });

  assert.equal(calls[0][0], 'osascript');
  assert.ok(calls[0][1][1].includes('Line 1\\\\nLine 2\\\\nLine 3'));
});

test('notify remains best-effort when Linux notification command throws', () => {
  const execFile = () => {
    throw new Error('notify-send failed');
  };

  assert.doesNotThrow(() => notify('Title', 'Body', { platform: 'linux', execFile }));
});

test('notify remains best-effort when macOS notification command rejects', async () => {
  const execFile = () => Promise.reject(new Error('osascript failed'));

  assert.doesNotThrow(() => notify('Title', 'Body', { platform: 'darwin', execFile }));
  await Promise.resolve();
});

test('notify remains best-effort when Windows notification command throws', () => {
  const execFile = () => {
    throw new Error('powershell failed');
  };

  assert.doesNotThrow(() => notify('Title', 'Body', { platform: 'win32', execFile }));
});

test('notifyStart keeps Windows startup notifications disabled', () => {
  const calls = [];
  const execFile = (command, args) => {
    calls.push([command, args]);
    return Buffer.from('');
  };

  notifyStart(true, 'Title', 'Body', { platform: 'win32', execFile });

  assert.equal(calls.length, 0);
});
