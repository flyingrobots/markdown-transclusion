#!/usr/bin/env node

import { runCli } from './cliCore';

if (require.main === module) {
  runCli({
    argv: process.argv,
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr,
    exit: process.exit
  }).catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}