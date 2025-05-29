#!/usr/bin/env node

import { runCli } from './cliCore';

if (require.main === module) {
  runCli({
    argv: process.argv,
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr,
    exit: process.exit
  }).catch(async (error) => {
    console.error('Unexpected error:', error);
    process.exitCode = 1;
    // Give time for error to flush
    await new Promise(resolve => setTimeout(resolve, 10));
    process.exit(1);
  });
}