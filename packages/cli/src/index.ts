import { Command } from 'commander';
import { loginCommand } from './commands/login.js';
import { initCommand } from './commands/init.js';
import { pullCommand } from './commands/pull.js';
import { pushCommand } from './commands/push.js';
import { version } from '../package.json'

const program = new Command()
  .name('transweave')
  .description('CLI for Transweave translation management')
  .version(version);

program.addCommand(loginCommand);
program.addCommand(initCommand);
program.addCommand(pullCommand);
program.addCommand(pushCommand);

program.parse();
