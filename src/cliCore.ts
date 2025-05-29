import { createReadStream, createWriteStream } from 'fs';
import { resolve } from 'path';
import { pipeline } from 'stream/promises';
import { TransclusionTransform } from './stream';
import { parseCliArgs, getHelpText, getVersionText } from './utils/cliArgs';
import { StreamLogger, LogLevel } from './utils/logger';
import type { TransclusionOptions } from './types';

export interface CliOptions {
  argv: string[];
  stdin: NodeJS.ReadableStream;
  stdout: NodeJS.WriteStream;
  stderr: NodeJS.WriteStream;
  exit: (code: number) => void;
}

/**
 * Core CLI logic extracted for testability
 */
export async function runCli(options: CliOptions): Promise<void> {
  const { argv, stdin, stdout, stderr, exit } = options;
  
  // Parse arguments
  const argsResult = parseCliArgs(argv);
  
  if (!argsResult.ok) {
    const logger = new StreamLogger(stderr, stdout);
    logger.error(`${argsResult.error.message}`);
    exit(1);
    return;
  }
  
  const args = argsResult.value;
  
  // Handle help and version flags
  if (args.help) {
    stdout.write(getHelpText() + '\n');
    exit(0);
    return;
  }
  
  if (args.version) {
    stdout.write(getVersionText() + '\n');
    exit(0);
    return;
  }
  
  // Create logger with proper streams for POSIX compliance
  const logger = new StreamLogger(
    stderr,
    stdout,
    args.logLevel !== undefined ? args.logLevel : LogLevel.INFO
  );
  
  try {
    // Build transclusion options
    const transclusionOptions: TransclusionOptions = {
      basePath: args.basePath || process.cwd(),
      extensions: args.extensions || ['md', 'markdown'],
      variables: args.variables,
      strict: args.strict,
      maxDepth: args.maxDepth || 10,
      validateOnly: args.validateOnly
    };
    
    // Create transform stream
    const transform = new TransclusionTransform(transclusionOptions);
    
    // Set up input stream
    const input = args.input
      ? createReadStream(resolve(args.input))
      : stdin;
    
    // Set up output stream
    const output = args.output
      ? createWriteStream(resolve(args.output))
      : stdout;
    
    // Handle transform errors
    transform.on('error', (error) => {
      logger.error('Transclusion error', error);
      if (transclusionOptions.strict) {
        exit(1);
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
      
      if (transclusionOptions.strict) {
        logger.error(`Processing failed with ${errors.length} error(s)`);
        exit(1);
        return;
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
    exit(1);
  }
}