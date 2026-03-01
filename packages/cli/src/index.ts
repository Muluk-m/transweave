import { Command } from 'commander';
import { loginCommand } from './commands/login.js';
import { initCommand } from './commands/init.js';
import { pullCommand } from './commands/pull.js';
import { pushCommand } from './commands/push.js';

const program = new Command()
  .name('qlj-i18n')
  .description('CLI for qlj-i18n translation management')
  .version('1.0.0');

program.addCommand(loginCommand);
program.addCommand(initCommand);
program.addCommand(pullCommand);
program.addCommand(pushCommand);

program.parse();
