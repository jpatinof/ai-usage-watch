import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from '../dist/cli.js';
import { resolveConfig } from '../dist/config.js';
import { parseDotEnvValue, readEnvFile } from '../dist/env.js';

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

test('resolveConfig uses CLI over env over config', () => {
  const { browser, dir, missingEnv } = fixturePaths();
  const configFile = join(dir, 'config.json');
  writeFileSync(configFile, JSON.stringify({ workspaceId: 'wrk_config', chromiumPath: browser, notify: true }));

  const parsedArgs = parseArgs(['--workspace', 'wrk_cli', '--no-notify']);
  const config = resolveConfig(parsedArgs, {
    OPENCODE_WORKSPACE_ID: 'wrk_env',
    OPENCODE_GO_CONFIG: configFile,
  }, {
    defaultEnvFile: missingEnv,
    localEnvFile: missingEnv,
    chromiumCandidates: [browser],
  });

  assert.equal(config.workspaceId, 'wrk_cli');
  assert.equal(config.workspaceSource, 'cli');
  assert.equal(config.chromiumPath, browser);
  assert.equal(config.notify, false);
});

test('resolveConfig requires explicit workspace ID', () => {
  const { browser, missingConfig, missingEnv } = fixturePaths();
  const parsedArgs = parseArgs([]);

  assert.throws(() => resolveConfig(parsedArgs, { OPENCODE_GO_CONFIG: missingConfig }, {
    defaultEnvFile: missingEnv,
    localEnvFile: missingEnv,
    chromiumCandidates: [browser],
  }), /Missing workspace ID/);
});
