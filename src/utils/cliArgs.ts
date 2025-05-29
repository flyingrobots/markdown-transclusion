import { Result, Ok, Err } from './result';
import { LogLevel } from './logger';

/**
 * CLI argument configuration
 */
export interface CliArgs {
  input?: string;
  output?: string;
  basePath?: string;
  extensions?: string[];
  maxDepth?: number;
  variables?: Record<string, string>;
  strict?: boolean;
  validateOnly?: boolean;
  logLevel?: LogLevel;
  help?: boolean;
  version?: boolean;
}

/**
 * CLI argument parsing errors
 */
export enum CliArgsErrorCode {
  INVALID_FLAG = 'INVALID_FLAG',
  MISSING_VALUE = 'MISSING_VALUE',
  INVALID_VALUE = 'INVALID_VALUE',
  CONFLICTING_FLAGS = 'CONFLICTING_FLAGS'
}

export interface CliArgsError {
  code: CliArgsErrorCode;
  message: string;
  flag?: string;
}

/**
 * Parse command line arguments
 */
export function parseCliArgs(argv: string[]): Result<CliArgs, CliArgsError> {
  const args: CliArgs = {};
  const inputArgs = argv.slice(2); // Skip node and script path
  
  // Check for input file as first positional argument
  if (inputArgs.length > 0 && !inputArgs[0].startsWith('-')) {
    args.input = inputArgs.shift();
  }
  
  let i = 0;
  while (i < inputArgs.length) {
    const arg = inputArgs[i];
    
    if (!arg.startsWith('-')) {
      return Err({
        code: CliArgsErrorCode.INVALID_FLAG,
        message: `Unexpected argument: ${arg}`,
        flag: arg
      });
    }
    
    // Handle long flags
    if (arg.startsWith('--')) {
      const result = parseLongFlag(arg, inputArgs, i, args);
      if (!result.ok) return result;
      i = result.value;
    }
    // Handle short flags
    else if (arg.startsWith('-')) {
      const result = parseShortFlag(arg, inputArgs, i, args);
      if (!result.ok) return result;
      i = result.value;
    }
  }
  
  // Validate conflicting flags
  if (args.validateOnly && args.output) {
    return Err({
      code: CliArgsErrorCode.CONFLICTING_FLAGS,
      message: 'Cannot use --output with --validate-only',
      flag: '--output'
    });
  }
  
  if (args.help && args.version) {
    return Err({
      code: CliArgsErrorCode.CONFLICTING_FLAGS,
      message: 'Cannot use --help with --version',
      flag: '--help'
    });
  }
  
  return Ok(args);
}

/**
 * Parse long flag (--flag)
 */
function parseLongFlag(
  flag: string,
  args: string[],
  index: number,
  result: CliArgs
): Result<number, CliArgsError> {
  const flagName = flag.substring(2);
  let nextIndex = index + 1;
  
  switch (flagName) {
    case 'help':
      result.help = true;
      break;
      
    case 'version':
      result.version = true;
      break;
      
    case 'strict':
      result.strict = true;
      break;
      
    case 'validate':
    case 'validate-only':
      result.validateOnly = true;
      break;
      
    case 'output':
    case 'out':
      if (nextIndex >= args.length || args[nextIndex].startsWith('-')) {
        return Err({
          code: CliArgsErrorCode.MISSING_VALUE,
          message: `Flag --${flagName} requires a value`,
          flag: `--${flagName}`
        });
      }
      result.output = args[nextIndex];
      nextIndex++;
      break;
      
    case 'base-path':
    case 'base':
      if (nextIndex >= args.length || args[nextIndex].startsWith('-')) {
        return Err({
          code: CliArgsErrorCode.MISSING_VALUE,
          message: `Flag --${flagName} requires a value`,
          flag: `--${flagName}`
        });
      }
      result.basePath = args[nextIndex];
      nextIndex++;
      break;
      
    case 'extensions':
    case 'ext':
      if (nextIndex >= args.length || args[nextIndex].startsWith('-')) {
        return Err({
          code: CliArgsErrorCode.MISSING_VALUE,
          message: `Flag --${flagName} requires a value`,
          flag: `--${flagName}`
        });
      }
      result.extensions = args[nextIndex].split(',');
      nextIndex++;
      break;
      
    case 'max-depth':
    case 'depth':
      if (nextIndex >= args.length) {
        return Err({
          code: CliArgsErrorCode.MISSING_VALUE,
          message: `Flag --${flagName} requires a value`,
          flag: `--${flagName}`
        });
      }
      const depth = parseInt(args[nextIndex], 10);
      if (isNaN(depth) || depth < 1) {
        return Err({
          code: CliArgsErrorCode.INVALID_VALUE,
          message: `Invalid max-depth value: ${args[nextIndex]}`,
          flag: `--${flagName}`
        });
      }
      result.maxDepth = depth;
      nextIndex++;
      break;
      
    case 'variables':
    case 'vars':
      if (nextIndex >= args.length || args[nextIndex].startsWith('-')) {
        return Err({
          code: CliArgsErrorCode.MISSING_VALUE,
          message: `Flag --${flagName} requires a value`,
          flag: `--${flagName}`
        });
      }
      const varsResult = parseVariables(args[nextIndex]);
      if (!varsResult.ok) {
        return Err({
          code: CliArgsErrorCode.INVALID_VALUE,
          message: `Invalid variables format: ${varsResult.error}`,
          flag: `--${flagName}`
        });
      }
      result.variables = varsResult.value;
      nextIndex++;
      break;
      
    case 'log-level':
    case 'log':
      if (nextIndex >= args.length || args[nextIndex].startsWith('-')) {
        return Err({
          code: CliArgsErrorCode.MISSING_VALUE,
          message: `Flag --${flagName} requires a value`,
          flag: `--${flagName}`
        });
      }
      const levelResult = parseLogLevel(args[nextIndex]);
      if (!levelResult.ok) {
        return Err({
          code: CliArgsErrorCode.INVALID_VALUE,
          message: levelResult.error,
          flag: `--${flagName}`
        });
      }
      result.logLevel = levelResult.value;
      nextIndex++;
      break;
      
    default:
      return Err({
        code: CliArgsErrorCode.INVALID_FLAG,
        message: `Unknown flag: --${flagName}`,
        flag: `--${flagName}`
      });
  }
  
  return Ok(nextIndex);
}

/**
 * Parse short flag (-f)
 */
function parseShortFlag(
  flag: string,
  args: string[],
  index: number,
  result: CliArgs
): Result<number, CliArgsError> {
  const flags = flag.substring(1);
  let nextIndex = index + 1;
  
  // Handle single character flags that need values
  if (flags.length === 1 && (flags === 'o' || flags === 'b')) {
    switch (flags) {
      case 'o':
        if (nextIndex >= args.length || args[nextIndex].startsWith('-')) {
          return Err({
            code: CliArgsErrorCode.MISSING_VALUE,
            message: 'Flag -o requires a value',
            flag: '-o'
          });
        }
        result.output = args[nextIndex];
        nextIndex++;
        break;
        
      case 'b':
        if (nextIndex >= args.length || args[nextIndex].startsWith('-')) {
          return Err({
            code: CliArgsErrorCode.MISSING_VALUE,
            message: 'Flag -b requires a value',
            flag: '-b'
          });
        }
        result.basePath = args[nextIndex];
        nextIndex++;
        break;
    }
    return Ok(nextIndex);
  }
  
  // Handle combined flags (e.g., -hsv)
  for (const f of flags.split('')) {
    switch (f) {
      case 'h':
        result.help = true;
        break;
        
      case 'v':
        result.version = true;
        break;
        
      case 's':
        result.strict = true;
        break;
        
      case 'o':
      case 'b':
        return Err({
          code: CliArgsErrorCode.INVALID_FLAG,
          message: `Flag -${f} cannot be combined with other flags`,
          flag: `-${f}`
        });
        
      default:
        return Err({
          code: CliArgsErrorCode.INVALID_FLAG,
          message: `Unknown flag: -${f}`,
          flag: `-${f}`
        });
    }
  }
  
  return Ok(nextIndex);
}

/**
 * Parse variable string (key=value,key2=value2)
 */
function parseVariables(str: string): Result<Record<string, string>, string> {
  const vars: Record<string, string> = {};
  const pairs = str.split(',');
  
  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split('=');
    if (!key || valueParts.length === 0) {
      return Err(`Invalid variable format: ${pair}. Expected key=value`);
    }
    vars[key.trim()] = valueParts.join('=').trim();
  }
  
  return Ok(vars);
}

/**
 * Parse log level string
 */
function parseLogLevel(str: string): Result<LogLevel, string> {
  const level = str.toUpperCase();
  
  switch (level) {
    case 'ERROR':
      return Ok(LogLevel.ERROR);
    case 'WARN':
      return Ok(LogLevel.WARN);
    case 'INFO':
      return Ok(LogLevel.INFO);
    case 'DEBUG':
      return Ok(LogLevel.DEBUG);
    default:
      return Err(`Invalid log level: ${str}. Expected: ERROR, WARN, INFO, or DEBUG`);
  }
}

/**
 * Get CLI usage help text
 */
export function getHelpText(): string {
  return `markdown-transclusion - Resolve transclusion references in Markdown

USAGE:
  markdown-transclusion [OPTIONS] [FILE]
  cat FILE | markdown-transclusion [OPTIONS]
  command | markdown-transclusion [OPTIONS]

DESCRIPTION:
  Processes Obsidian-style ![[filename]] transclusion syntax in Markdown files.
  Supports recursive inclusion, heading extraction, and variable substitution.

OPTIONS:
  -h, --help              Show this help message
  -v, --version           Show version information
  -o, --output FILE       Write output to FILE instead of stdout
  -b, --base-path PATH    Base directory for resolving relative references
                          (default: current working directory)
  --extensions EXTS       Comma-separated list of file extensions to try
                          when extension is omitted (default: md,markdown)
  --max-depth N           Maximum recursion depth for nested transclusions
                          (default: 10, prevents infinite loops)
  --variables VARS        Variables for {{var}} substitution in filenames
                          Format: key1=value1,key2=value2
  -s, --strict            Exit with error code 1 on any transclusion failure
                          (default: insert error comment and continue)
  --validate-only         Check all references without outputting content
                          Useful for CI/CD validation workflows
  --log-level LEVEL       Set logging verbosity: ERROR, WARN, INFO, DEBUG
                          (default: INFO, logs go to stderr)

TRANSCLUSION SYNTAX:
  ![[filename]]           Include entire file
  ![[filename#heading]]   Include specific heading section
  ![[dir/file]]          Include file from subdirectory
  ![[file-{{var}}]]      Include file with variable substitution

EXAMPLES:
  # Process a single file
  markdown-transclusion document.md

  # Write to output file
  markdown-transclusion input.md --output processed.md

  # Process with variables for multilingual docs
  markdown-transclusion template.md --variables lang=es,version=2.0

  # Validate all references in documentation
  markdown-transclusion docs/index.md --validate-only --strict

  # Process files in different directory
  markdown-transclusion README.md --base-path ./docs

  # Pipe to other tools
  markdown-transclusion doc.md | pandoc -o output.pdf

  # Process from stdin
  cat template.md | markdown-transclusion --variables env=prod

  # Silent mode (only errors)
  markdown-transclusion doc.md --log-level ERROR

EXIT CODES:
  0  Success
  1  Error (file not found, transclusion errors with --strict, etc.)

For more information, see: https://github.com/anthropics/markdown-transclusion`;
}

/**
 * Get version text
 */
export function getVersionText(): string {
  return 'markdown-transclusion version 1.0.0';
}