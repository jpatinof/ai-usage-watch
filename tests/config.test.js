import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from '../dist/cli.js';
import { resolveConfig } from '../dist/config.js';
import { parseDotEnvValue, readEnvFile, resolveEnvSources } from '../dist/env.js';

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

test('resolveEnvSources lets explicit OPENCODE_GO_ENV override local .env', () => {
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
