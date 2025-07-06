import { createReadStream, createWriteStream } from 'fs';
import { resolve } from 'path';
import { pipeline } from 'stream/promises';
import { Writable } from 'stream';
import { TransclusionTransform } from './stream';
import { parseCliArgs, getHelpText, getVersionText } from './utils/cliArgs';
import { StreamLogger, LogLevel } from './utils/logger';
import { OutputMode, type ProcessingStats } from './utils/outputFormatter';
import { createFormatter } from './utils/enhancedOutputFormatter';
import { createPluginExecutor } from './plugins';
import type { TransclusionOptions, TransclusionError } from './types';

export interface CliOptions {
  argv: string[];
  stdin: NodeJS.ReadableStream;
  stdout: NodeJS.WriteStream;
  stderr: NodeJS.WriteStream;
  exit: (code: number) => void;
}

/**
 * Gracefully exit after flushing streams
 */
async function gracefulExit(code: number, exit: (code: number) => void): Promise<void> {
  // Set exit code for process
  process.exitCode = code;
  // Give streams time to flush
  await new Promise(resolve => setTimeout(resolve, 10));
  // Then call the exit function
  exit(code);
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
    await gracefulExit(1, exit);
    return;
  }
  
  const args = argsResult.value;
  
  // Handle help and version flags
  if (args.help) {
    stdout.write(getHelpText() + '\n');
    await gracefulExit(0, exit);
    return;
  }
  
  if (args.version) {
    stdout.write(getVersionText() + '\n');
    await gracefulExit(0, exit);
    return;
  }
  
  // Determine output mode
  let outputMode = OutputMode.DEFAULT;
  if (args.verbose) {
    outputMode = OutputMode.VERBOSE;
  } else if (args.porcelain) {
    outputMode = OutputMode.PORCELAIN;
  } else if (args.progress) {
    outputMode = OutputMode.PROGRESS;
  }
  
  // Create logger with proper streams for POSIX compliance
  // In default mode, use WARN level to show warnings but not info
  const logLevel = args.logLevel !== undefined 
    ? args.logLevel 
    : (outputMode === OutputMode.DEFAULT ? LogLevel.WARN : LogLevel.INFO);
    
  const logger = new StreamLogger(
    stderr,
    stdout,
    logLevel
  );
  
  // Initialize plugin system variable outside try block for cleanup access
  let pluginExecutor: any = null;
  
  try {
    const startTime = Date.now();
    // Build transclusion options
    // When processing a file and no base path is specified, use the file's directory
    const resolvedInputPath = args.input ? resolve(args.input) : undefined;
    const defaultBasePath = resolvedInputPath 
      ? resolve(resolvedInputPath, '..')  // Parent directory of input file
      : process.cwd();
    
    const transclusionOptions: TransclusionOptions = {
      basePath: args.basePath || defaultBasePath,
      extensions: args.extensions || ['md', 'markdown'],
      variables: args.variables,
      strict: args.strict,
      maxDepth: args.maxDepth || 10,
      validateOnly: args.validateOnly,
      stripFrontmatter: args.stripFrontmatter,
      initialFilePath: resolvedInputPath,
      templateVariables: args.templateVariables
    };
    
    // Create output formatter with enhanced error support
    const formatter = createFormatter(outputMode, stderr, true, transclusionOptions.basePath, stdout, logLevel, transclusionOptions.strict);
    
    // Initialize the enhanced formatter if it supports it
    if ('init' in formatter && typeof formatter.init === 'function') {
      await (formatter as any).init();
    }
    
    // Initialize plugin system if plugins are specified
    if (args.plugins && args.plugins.length > 0) {
      try {
        pluginExecutor = createPluginExecutor(logger, args.plugins, args.pluginConfig);
        await pluginExecutor.initialize(transclusionOptions);
        logger.info(`Initialized ${pluginExecutor.getAvailablePlugins().length} plugins`);
      } catch (error) {
        logger.error('Failed to initialize plugin system:', error);
        if (transclusionOptions.strict) {
          await gracefulExit(1, exit);
          return;
        }
      }
    }
    
    // Create transform stream with plugin executor
    const transform = new TransclusionTransform(transclusionOptions, pluginExecutor);
    
    // Notify processing start
    formatter.onProcessingStart(resolvedInputPath);
    
    // Track stats
    let warningCount = 0;
    let fileCount = 0;
    const processedFilesSet = new Set<string>();
    
    // Set up input stream
    const input = args.input
      ? createReadStream(resolve(args.input))
      : stdin;
    
    // Set up output stream (dry run always goes to stdout)
    let output: NodeJS.WritableStream;
    let dryRunBuffer: Buffer[] = [];
    
    if (args.dryRun || (pluginExecutor && !args.validateOnly)) {
      // In dry run mode or when we have post-processors, collect output in buffer
      output = new Writable({
        write(chunk: Buffer, encoding, callback) {
          dryRunBuffer.push(chunk);
          callback();
        }
      });
    } else {
      output = args.output
        ? createWriteStream(resolve(args.output))
        : stdout;
    }
    
    // Listen for file processing events
    transform.on('file', (filePath: string) => {
      formatter.onFileRead(filePath);
      processedFilesSet.add(filePath);
      fileCount++;
      
      // Update progress if in progress mode
      if (outputMode === OutputMode.PROGRESS) {
        formatter.updateProgress(fileCount, fileCount + 1, `Processing: ${filePath}`);
      }
    });
    
    // Handle transclusion errors (missing files, circular refs, etc)
    transform.on('transclusion-error', (error: TransclusionError) => {
      // Always call onError to allow enhanced formatting
      formatter.onError(error);
      
      if (transclusionOptions.strict) {
        gracefulExit(1, exit).catch(console.error);
      } else {
        // In non-strict mode, count as warning but don't exit
        warningCount++;
      }
    });
    
    // Handle actual stream errors
    transform.on('error', (error: Error) => {
      logger.error('Stream processing error:', error);
      gracefulExit(1, exit).catch(console.error);
    });
    
    // Handle warnings
    transform.on('warning', (message: string) => {
      formatter.onWarning(message);
      warningCount++;
    });
    
    // Process the stream
    await pipeline(input, transform, output);
    
    // Calculate final stats
    const duration = Date.now() - startTime;
    const stats: ProcessingStats = {
      filesProcessed: processedFilesSet.size + (args.input ? 1 : 0),
      transclusionsResolved: processedFilesSet.size,
      warnings: warningCount,
      errors: transform.errors.length,
      duration
    };
    
    // Check for errors after processing
    const errors = transform.errors;
    // In strict mode, we should exit with error if there were any errors
    if (errors.length > 0 && transclusionOptions.strict) {
      await gracefulExit(1, exit);
      return;
    }
    
    // Apply post-processors if we have content and plugin executor
    let processedContent: string | undefined;
    if ((args.dryRun || pluginExecutor) && dryRunBuffer.length > 0) {
      processedContent = Buffer.concat(dryRunBuffer).toString();
      
      if (pluginExecutor && !args.validateOnly) {
        try {
          const { content: postProcessedContent } = await pluginExecutor.postProcessContent(
            processedContent,
            transclusionOptions,
            args.output,
            stats,
            args.dryRun || false
          );
          processedContent = postProcessedContent;
        } catch (error) {
          logger.error('Post-processing error:', error);
          if (transclusionOptions.strict) {
            await gracefulExit(1, exit);
            return;
          }
        }
      }
    }
    
    // Dry run mode output
    if (args.dryRun && processedContent !== undefined) {
      const processedFiles = transform.processedFiles || [];
      const transclusionCount = processedFiles.length;
      
      // For dry run, always use stdout regardless of output mode
      if (outputMode === OutputMode.PORCELAIN) {
        // Porcelain dry run output
        stdout.write(`DRY_RUN\tSTART\n`);
        stdout.write(`DRY_RUN\tINPUT\t${args.input || 'stdin'}\n`);
        for (const file of processedFiles) {
          stdout.write(`DRY_RUN\tREAD\t${file}\n`);
        }
        stdout.write(`DRY_RUN\tSTATS\t${processedFiles.length + 1}\t${transclusionCount}\t0\t${errors.length}\n`);
        stdout.write(`DRY_RUN\tCONTENT_START\n`);
        stdout.write(processedContent);
        stdout.write(`\nDRY_RUN\tCONTENT_END\n`);
        stdout.write(`DRY_RUN\tCOMPLETE\t${errors.length === 0 ? 'SUCCESS' : 'ERRORS'}\n`);
      } else {
        // Human-readable dry run output
        stdout.write('🔍 DRY RUN MODE - No files will be modified\n\n');
        
        if (args.input) {
          stdout.write(`Processing: ${args.input}\n`);
        } else {
          stdout.write('Processing: stdin\n');
        }
        
        // Show processed files
        for (const file of processedFiles) {
          stdout.write(`├── Reading: ${file}\n`);
        }
        
        if (processedFiles.length === 0) {
          stdout.write('└── No transclusions found\n');
        }
        
        stdout.write('\n=== PROCESSED CONTENT ===\n');
        stdout.write(processedContent);
        stdout.write('\n=== SUMMARY ===\n');
        stdout.write(`📄 Files processed: ${processedFiles.length + 1}\n`);
        stdout.write(`🔗 Transclusions resolved: ${transclusionCount}\n`);
        stdout.write(`⚠️  Warnings: ${warningCount}\n`);
        stdout.write(`❌ Errors: ${errors.length}\n`);
        
        if (errors.length > 0) {
          stdout.write('\n⚠️  Dry run completed with errors\n');
          stdout.write('   Fix issues before actual processing\n');
        } else {
          stdout.write('\n✓ Dry run completed successfully\n');
          if (args.input && args.output) {
            stdout.write(`  Ready for actual processing with: markdown-transclusion ${args.input} --output ${args.output}\n`);
          } else if (args.input) {
            stdout.write(`  Ready for actual processing with: markdown-transclusion ${args.input}\n`);
          } else {
            stdout.write('  Ready for actual processing\n');
          }
        }
      }
    }
    // Validation mode feedback
    else if (args.validateOnly) {
      formatter.onValidationComplete(errors);
    }
    // Normal processing complete
    else if (!args.dryRun) {
      // If we buffered content for post-processing, write it out now
      if (pluginExecutor && processedContent !== undefined) {
        const finalOutput = args.output
          ? createWriteStream(resolve(args.output))
          : stdout;
        
        await new Promise<void>((resolve, reject) => {
          finalOutput.write(processedContent, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        if (finalOutput !== stdout) {
          finalOutput.end();
        }
      }
      
      formatter.onProcessingComplete(stats);
    }
    
    // Cleanup plugin system
    if (pluginExecutor) {
      try {
        await pluginExecutor.cleanup();
      } catch (error) {
        logger.warn('Error during plugin cleanup:', error);
      }
    }
    
  } catch (error) {
    logger.error('Fatal error', error);
    
    // Cleanup plugin system on error
    if (pluginExecutor) {
      try {
        await pluginExecutor.cleanup();
      } catch (cleanupError) {
        logger.warn('Error during plugin cleanup:', cleanupError);
      }
    }
    
    await gracefulExit(1, exit);
  }
}