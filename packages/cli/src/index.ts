import { Command } from 'commander';
import { loginCommand } from './commands/login.js';
import { initCommand } from './commands/init.js';
import { pullCommand } from './commands/pull.js';
import { pushCommand } from './commands/push.js';
import { whoamiCommand } from './commands/whoami.js';
import { statusCommand } from './commands/status.js';
import { diffCommand } from './commands/diff.js';
import { searchCommand } from './commands/search.js';
import { setOutputMode } from './formatter.js';
import * as fmt from './formatter.js';
import { TransweaveError, getExitCode } from './errors.js';
import { version } from '../package.json';

const program = new Command()
  .name('transweave')
  .description('CLI for Transweave translation management')
  .version(version)
  .option('--json', 'Output results as JSON')
  .option('--quiet', 'Suppress informational output')
  .hook('preAction', (_thisCommand, actionCommand) => {
    const opts = program.opts();
    if (opts.json) {
      setOutputMode('json');
    } else if (opts.quiet) {
      setOutputMode('quiet');
    }
  });

program.addCommand(loginCommand);
program.addCommand(initCommand);
program.addCommand(pullCommand);
program.addCommand(pushCommand);
program.addCommand(whoamiCommand);
program.addCommand(statusCommand);
program.addCommand(diffCommand);
program.addCommand(searchCommand);

// Top-level error handler
program.parseAsync().catch((err: unknown) => {
  if (err instanceof TransweaveError) {
    fmt.error(err.message, err.code);
    if (err.hint && fmt.getOutputMode() !== 'json') {
      console.error(`Hint: ${err.hint}`);
    }
    process.exit(getExitCode(err));
  } else {
    const message = err instanceof Error ? err.message : String(err);
    fmt.error(message);
    process.exit(1);
  }
});
