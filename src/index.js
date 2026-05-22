#!/usr/bin/env node

import { chromium } from 'playwright';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { execFileSync } from 'child_process';

const AUTH_FILE = `${homedir()}/.local/share/opencode/auth.json`;
const SESSION_DIR = `${homedir()}/.config/opencode-go`;
const SESSION_FILE = `${SESSION_DIR}/session.json`;
const DEFAULT_CONFIG_FILE = `${SESSION_DIR}/config.json`;
const DEBUG_FILE = `${SESSION_DIR}/debug.html`;
const DEFAULT_WORKSPACE_ID = 'wrk_01KPR4QVHBSQ9HVPQY1YMF4X4C';
const CHROMIUM_CANDIDATES = [
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/brave-browser',
];

function printHelp() {
  console.log(`OpenCode Go Usage Checker

Usage:
  opencode-go-usage [options]

Options:
  --workspace <id>   OpenCode workspace ID. Recommended for every user.
  --chromium <path>  Chromium-compatible browser executable path.
  --no-notify        Disable desktop notifications.
  --json             Print usage as JSON. Also disables notifications.
  --debug            Print config resolution and save debug HTML on page errors.
  --help             Show this help message.

Configuration precedence:
  CLI flags > environment variables > config file > defaults

Environment variables:
  OPENCODE_WORKSPACE_ID  OpenCode workspace ID.
  CHROMIUM_PATH          Chromium-compatible browser executable path.
  OPENCODE_GO_CONFIG     Optional config file path. Defaults to ~/.config/opencode-go/config.json.

Config file example (${DEFAULT_CONFIG_FILE}):
  {
    "workspaceId": "wrk_your_workspace_id",
    "chromiumPath": "/usr/bin/chromium",
    "notify": true
  }

Fallbacks:
  If no workspace is configured, the previous hardcoded workspace is used for backward compatibility.
  Configure your own workspace ID to avoid checking the wrong account.`);
}

function parseArgs(argv) {
  const args = {
    cli: {},
    flags: { json: false, debug: false, help: false },
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--workspace') {
      args.cli.workspaceId = readFlagValue(argv, ++i, arg);
    } else if (arg === '--chromium') {
      args.cli.chromiumPath = readFlagValue(argv, ++i, arg);
    } else if (arg === '--no-notify') {
      args.cli.notify = false;
    } else if (arg === '--json') {
      args.flags.json = true;
    } else if (arg === '--debug') {
      args.flags.debug = true;
    } else if (arg === '--help') {
      args.flags.help = true;
    } else {
      throw new Error(`Unknown option: ${arg}. Run --help for usage.`);
    }
  }

  return args;
}

function readFlagValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}. Run --help for usage.`);
  return value;
}

function readConfigFile(configPath) {
  if (!existsSync(configPath)) return {};

  try {
    return JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch (error) {
    throw new Error(`Could not read config file at ${configPath}: ${error.message}`);
  }
}

function firstExistingPath(paths) {
  return paths.find(path => existsSync(path)) || null;
}

function resolveConfig(parsedArgs, env = process.env) {
  const configPath = env.OPENCODE_GO_CONFIG || DEFAULT_CONFIG_FILE;
  const fileConfig = readConfigFile(configPath);
  const envConfig = {
    workspaceId: env.OPENCODE_WORKSPACE_ID,
    chromiumPath: env.CHROMIUM_PATH,
  };

  const workspaceId = parsedArgs.cli.workspaceId ?? envConfig.workspaceId ?? fileConfig.workspaceId ?? DEFAULT_WORKSPACE_ID;
  const configuredChromiumPath = parsedArgs.cli.chromiumPath ?? envConfig.chromiumPath ?? fileConfig.chromiumPath;
  const chromiumPath = configuredChromiumPath || firstExistingPath(CHROMIUM_CANDIDATES);
  const notify = parsedArgs.flags.json ? false : (parsedArgs.cli.notify ?? fileConfig.notify ?? true);

  if (!workspaceId || typeof workspaceId !== 'string') {
    throw new Error('Missing workspace ID. Set --workspace, OPENCODE_WORKSPACE_ID, or workspaceId in config.json.');
  }

  if (configuredChromiumPath && !existsSync(configuredChromiumPath)) {
    throw new Error(`Browser not found at ${configuredChromiumPath}. Set --chromium, CHROMIUM_PATH, or chromiumPath in config.json.`);
  }

  if (!chromiumPath) {
    throw new Error(`No Chromium-compatible browser found. Install Chromium or set --chromium/CHROMIUM_PATH. Checked: ${CHROMIUM_CANDIDATES.join(', ')}`);
  }

  return {
    workspaceId,
    chromiumPath,
    notify,
    json: parsedArgs.flags.json,
    debug: parsedArgs.flags.debug,
    configPath,
    configFileLoaded: existsSync(configPath),
    workspaceSource: parsedArgs.cli.workspaceId ? 'cli' : envConfig.workspaceId ? 'env' : fileConfig.workspaceId ? 'config' : 'default',
    chromiumSource: parsedArgs.cli.chromiumPath ? 'cli' : envConfig.chromiumPath ? 'env' : fileConfig.chromiumPath ? 'config' : 'auto-detected',
  };
}

function getApiKey() {
  try {
    const auth = JSON.parse(readFileSync(AUTH_FILE, 'utf-8'));
    return auth['opencode-go']?.key;
  } catch {
    return null;
  }
}

function notify(title, body) {
  try {
    execFileSync('notify-send', ['-u', 'low', '-t', '12000', title, body], { stdio: 'ignore' });
  } catch {}
}

function notifyStart(enabled) {
  if (!enabled) return;
  try {
    execFileSync('notify-send', ['-u', 'low', '-t', '5000', 'OpenCode Go', 'Checking your usage...'], { stdio: 'ignore' });
  } catch {}
}

function getBars(pct) {
  const filled = Math.round(pct / 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function parseResetTime(text) {
  const match = text.match(/Resets in (\d+)\s*(hour|day|minute)s?(?:\s*(\d+)\s*(hour|minute)s?)?/i);
  if (!match) return null;

  const num1 = parseInt(match[1]);
  const unit1 = match[2].toLowerCase();
  const num2 = match[3] ? parseInt(match[3]) : null;
  const unit2 = match[4] ? match[4].toLowerCase() : null;

  let resetStr = '';
  if (unit1 === 'day') {
    resetStr = `${num1}d ${num2 ? num2 + 'h' : '0h'}`;
  } else if (unit1 === 'hour') {
    resetStr = num2 ? `${num1}h ${num2}m` : `${num1}h`;
  } else {
    resetStr = `${num1}m`;
  }

  return resetStr;
}

async function extractUsages(text, html) {
  const results = [];

  const usageBlocks = [
    { name: '5h', limit: 12, pctRegex: /Rolling Usage[\s\S]*?(\d+)%/i, resetRegex: /Rolling Usage[\s\S]*?Resets in [^.]+/i },
    { name: 'Weekly', limit: 30, pctRegex: /Weekly Usage[\s\S]*?(\d+)%/i, resetRegex: /Weekly Usage[\s\S]*?Resets in [^.]+/i },
    { name: 'Monthly', limit: 60, pctRegex: /Monthly Usage[\s\S]*?(\d+)%/i, resetRegex: /Monthly Usage[\s\S]*?Resets in [^.]+/i }
  ];

  for (const block of usageBlocks) {
    const pctMatch = text.match(block.pctRegex);
    const resetMatch = text.match(block.resetRegex);

    if (pctMatch) {
      const pct = parseInt(pctMatch[1]);
      const used = (pct / 100) * block.limit;
      const reset = resetMatch ? parseResetTime(resetMatch[0]) : '';
      results.push({ name: block.name, used, limit: block.limit, pct, bars: getBars(pct), reset });
    }
  }

  if (results.length === 0) {
    const dollarPatterns = [
      { name: '5h', limit: 12, regex: /\$([0-9.]+)\s*\/\s*\$?12(?!\d)/i },
      { name: 'Weekly', limit: 30, regex: /\$([0-9.]+)\s*\/\s*\$?30(?!\d)/i },
      { name: 'Monthly', limit: 60, regex: /\$([0-9.]+)\s*\/\s*\$?60(?!\d)/i },
    ];

    for (const p of dollarPatterns) {
      const match = text.match(p.regex) || html.match(p.regex);
      if (match) {
        const used = parseFloat(match[1]);
        const pct = Math.min(100, Math.round((used / p.limit) * 100));
        results.push({ name: p.name, used, limit: p.limit, pct, bars: getBars(pct), reset: '' });
      }
    }
  }

  return results;
}

function maybeNotify(enabled, title, body) {
  if (enabled) notify(title, body);
}

async function saveDebugHtml(config, page, reason) {
  if (!config.debug || !page) return;

  try {
    if (!existsSync(SESSION_DIR)) mkdirSync(SESSION_DIR, { recursive: true });
    const html = await page.evaluate(() => document.documentElement.outerHTML);
    writeFileSync(DEBUG_FILE, `<!-- ${reason} -->\n${html}`);
    console.error(`Debug HTML saved to ${DEBUG_FILE}`);
  } catch (error) {
    console.error(`Could not save debug HTML: ${error.message}`);
  }
}

function printHumanUsage(usages) {
  console.log('  ✓  Fetched! Here\'s your usage:\n');

  for (const u of usages) {
    const resetStr = u.reset ? ` ↻ resets ${u.reset}` : '';
    console.log(`  ┌─────────────────────────────────────┐`);
    console.log(`  │  ${u.name.padEnd(12)} ${u.bars}  ${u.pct.toString().padStart(3)}%`);
    console.log(`  │  $${u.used.toFixed(2)} / $${u.limit}${resetStr}`);
    console.log(`  └─────────────────────────────────────┘`);
  }

  console.log('');
}

async function getUsage(config) {
  const apiKey = getApiKey();
  if (!apiKey) {
    maybeNotify(config.notify, 'OpenCode Go', 'No OpenCode credentials found. Run /connect in OpenCode first.');
    throw new Error(`No OpenCode credentials found at ${AUTH_FILE}. Run /connect in OpenCode first.`);
  }

  if (!config.json) console.log('\n  Checking your OpenCode Go stats...\n');
  notifyStart(config.notify);

  let browser;
  let page;

  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: config.chromiumPath,
      args: ['--disable-dev-shm-usage']
    });

    const context = await browser.newContext();
    page = await context.newPage();

    if (existsSync(SESSION_FILE)) {
      try {
        const cookies = JSON.parse(readFileSync(SESSION_FILE, 'utf-8'));
        await context.addCookies(cookies);
      } catch {}
    }

    await page.goto('https://opencode.ai', { waitUntil: 'domcontentloaded', timeout: 15000 });

    if (page.url().includes('auth.opencode.ai')) {
      if (config.json) throw new Error('OpenCode session is not authenticated. Run without --json to complete browser login.');

      console.log('  Not authenticated. Opening browser...');
      await browser.close();

      const loginBrowser = await chromium.launch({
        headless: false,
        executablePath: config.chromiumPath,
        args: ['--disable-dev-shm-usage']
      });

      const loginPage = await loginBrowser.newPage();
      await loginPage.goto('https://opencode.ai/auth', { waitUntil: 'networkidle' });

      console.log('  Please login in the browser...');
      await loginPage.waitForURL(url => !url.hostname.includes('auth'), { timeout: 120000 });

      const cookies = await loginPage.context().cookies();
      if (!existsSync(SESSION_DIR)) mkdirSync(SESSION_DIR, { recursive: true });
      writeFileSync(SESSION_FILE, JSON.stringify(cookies, null, 2));

      await loginBrowser.close();
      return getUsage(config);
    }

    await page.goto(`https://opencode.ai/workspace/${config.workspaceId}/go`, { waitUntil: 'networkidle', timeout: 20000 });

    const pageText = await page.evaluate(() => document.body.innerText);
    const pageHtml = await page.evaluate(() => document.body.innerHTML);

    const usages = await extractUsages(pageText, pageHtml);

    if (usages.length > 0) {
      const lines = usages.map(u => {
        const resetLine = u.reset ? ` ↻ ${u.reset}` : '';
        return `${u.name}: ${u.bars} ${u.pct}%${resetLine}`;
      });

      maybeNotify(config.notify, 'OpenCode Go Usage', lines.join('\n'));
      return usages;
    }

    await saveDebugHtml(config, page, 'Usage not found');
    maybeNotify(config.notify, 'OpenCode Go', 'Usage not found');
    throw new Error(`Could not fetch usage data for workspace ${config.workspaceId}. Use --debug to save page HTML for inspection.`);
  } catch (error) {
    await saveDebugHtml(config, page, error.message.split('\n')[0]);
    maybeNotify(config.notify, 'OpenCode Go', 'Error while checking usage');
    throw error;
  } finally {
    if (browser?.isConnected()) await browser.close();
  }
}

async function main() {
  const parsedArgs = parseArgs(process.argv.slice(2));

  if (parsedArgs.flags.help) {
    printHelp();
    return;
  }

  const config = resolveConfig(parsedArgs);

  if (config.debug) {
    console.error('Config resolution:', JSON.stringify({
      configPath: config.configPath,
      configFileLoaded: config.configFileLoaded,
      workspaceId: config.workspaceId,
      workspaceSource: config.workspaceSource,
      chromiumPath: config.chromiumPath,
      chromiumSource: config.chromiumSource,
      notify: config.notify,
      json: config.json,
    }, null, 2));
  }

  const usages = await getUsage(config);

  if (config.json) {
    console.log(JSON.stringify({ workspaceId: config.workspaceId, usages }, null, 2));
  } else {
    printHumanUsage(usages);
  }
}

main().catch(err => {
  const message = err.message.split('\n')[0];

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ error: message }, null, 2));
  } else {
    console.error(`Error: ${message}`);
  }

  process.exit(1);
});
