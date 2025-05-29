#!/usr/bin/env node

import { createReadStream, createWriteStream } from 'fs';
import { resolve } from 'path';
import { pipeline } from 'stream/promises';
import { TransclusionTransform } from './stream';
import { parseCliArgs, getHelpText, getVersionText } from './utils/cliArgs';
import { StreamLogger, LogLevel } from './utils/logger';
import type { TransclusionOptions } from './types';

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  // Parse arguments
  const argsResult = parseCliArgs(process.argv);
  
  if (!argsResult.ok) {
    const logger = new StreamLogger(process.stderr, process.stdout);
    logger.error(`${argsResult.error.message}`);
    process.exit(1);
  }
  
  const args = argsResult.value;
  
  // Handle help and version flags
  if (args.help) {
    console.log(getHelpText());
    process.exit(0);
  }
  
  if (args.version) {
    console.log(getVersionText());
    process.exit(0);
  }
  
  // Create logger with proper streams for POSIX compliance
  const logger = new StreamLogger(
    process.stderr,
    process.stdout,
    args.logLevel !== undefined ? args.logLevel : LogLevel.INFO
  );
  
  try {
    // Build transclusion options
    const options: TransclusionOptions = {
      basePath: args.basePath || process.cwd(),
      extensions: args.extensions || ['md', 'markdown'],
      variables: args.variables,
      strict: args.strict,
      maxDepth: args.maxDepth || 10,
      validateOnly: args.validateOnly
    };
    
    // Create transform stream
    const transform = new TransclusionTransform(options);
    
    // Set up input stream
    const input = args.input
      ? createReadStream(resolve(args.input))
      : process.stdin;
    
    // Set up output stream
    const output = args.output
      ? createWriteStream(resolve(args.output))
      : process.stdout;
    
    // Handle transform errors
    transform.on('error', (error) => {
      logger.error('Transclusion error', error);
      if (options.strict) {
        process.exit(1);
      }
    });
    
    // Process the stream
    await pipeline(input, transform, output);
    
    // Check for errors after processing
    const errors = transform.errors;
    if (errors.length > 0) {
      for (const error of errors) {
        logger.warn(`[${error.path}${error.line ? `:${error.line}` : ''}] ${error.message}`);
      }
      
      if (options.strict) {
        logger.error(`Processing failed with ${errors.length} error(s)`);
        process.exit(1);
      }
    }
    
    // Validation mode feedback
    if (args.validateOnly) {
      if (errors.length > 0) {
        logger.info(`Validation completed with ${errors.length} issue(s)`);
      } else {
        logger.info('Validation completed successfully');
      }
    }
    
  } catch (error) {
    logger.error('Fatal error', error);
    process.exit(1);
  }
}

// Run the CLI
if (require.main === module) {
  main().catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}