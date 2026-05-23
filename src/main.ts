import { parseArgs, printHelp } from './cli.js';
import { resolveConfig } from './config.js';
import { getUsage } from './app.js';
import { printHumanUsage, printJson, printJsonError } from './output.js';

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const parsedArgs = parseArgs(argv);

  if (parsedArgs.flags.help) {
    printHelp();
    return;
  }

  const config = resolveConfig(parsedArgs);

  if (config.debug) {
    console.error('Config resolution:', JSON.stringify({
      configPath: config.configPath,
      configFileLoaded: config.configFileLoaded,
      envFilesLoaded: config.envFilesLoaded,
      providerId: config.providerId,
      providerSource: config.providerSource,
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
    printJson(config.workspaceId, usages);
  } else {
    printHumanUsage(usages);
  }
}

export function handleCliError(error: unknown, argv = process.argv.slice(2)): never {
  const message = error instanceof Error ? error.message.split('\n')[0] : String(error);

  if (argv.includes('--json')) {
    printJsonError(message);
  } else {
    console.error(`Error: ${message}`);
  }

  process.exit(1);
}
