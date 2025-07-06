/**
 * Log levels
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

/**
 * Log entry
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  data?: unknown;
}

/**
 * Logger interface - Dependency Inversion Principle
 */
export interface Logger {
  error(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  debug(message: string, data?: unknown): void;
  setLevel(level: LogLevel): void;
}

/**
 * Console logger implementation
 */
export class ConsoleLogger implements Logger {
  private level: LogLevel = LogLevel.INFO;
  
  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }
  
  error(message: string, data?: unknown): void {
    if (this.level >= LogLevel.ERROR) {
      console.error(this.format(LogLevel.ERROR, message), data || '');
    }
  }
  
  warn(message: string, data?: unknown): void {
    if (this.level >= LogLevel.WARN) {
      console.warn(this.format(LogLevel.WARN, message), data || '');
    }
  }
  
  info(message: string, data?: unknown): void {
    if (this.level >= LogLevel.INFO) {
      // eslint-disable-next-line no-console
      console.info(this.format(LogLevel.INFO, message), data || '');
    }
  }
  
  debug(message: string, data?: unknown): void {
    if (this.level >= LogLevel.DEBUG) {
      // eslint-disable-next-line no-console
      console.debug(this.format(LogLevel.DEBUG, message), data || '');
    }
  }
  
  setLevel(level: LogLevel): void {
    this.level = level;
  }
  
  private format(level: LogLevel, message: string): string {
    const levelStr = LogLevel[level];
    return `[${levelStr}] ${message}`;
  }
}

/**
 * Silent logger for testing
 */
export class SilentLogger implements Logger {
  private logs: LogEntry[] = [];
  
  error(message: string, data?: unknown): void {
    this.logs.push({ level: LogLevel.ERROR, message, timestamp: new Date(), data });
  }
  
  warn(message: string, data?: unknown): void {
    this.logs.push({ level: LogLevel.WARN, message, timestamp: new Date(), data });
  }
  
  info(message: string, data?: unknown): void {
    this.logs.push({ level: LogLevel.INFO, message, timestamp: new Date(), data });
  }
  
  debug(message: string, data?: unknown): void {
    this.logs.push({ level: LogLevel.DEBUG, message, timestamp: new Date(), data });
  }
  
  setLevel(_level: LogLevel): void {
    // No-op for silent logger
  }
  
  getLogs(): LogEntry[] {
    return [...this.logs];
  }
  
  clear(): void {
    this.logs = [];
  }
}

/**
 * Stream logger for proper POSIX output
 */
export class StreamLogger implements Logger {
  private level: LogLevel = LogLevel.INFO;
  private errorStream: NodeJS.WriteStream;
  private outStream: NodeJS.WriteStream;
  
  constructor(
    errorStream: NodeJS.WriteStream = process.stderr,
    outStream: NodeJS.WriteStream = process.stdout,
    level: LogLevel = LogLevel.INFO
  ) {
    this.errorStream = errorStream;
    this.outStream = outStream;
    this.level = level;
  }
  
  error(message: string, data?: unknown): void {
    if (this.level >= LogLevel.ERROR) {
      this.errorStream.write(this.format(LogLevel.ERROR, message) + '\n');
      if (data) {
        if (data instanceof Error) {
          this.errorStream.write(`Error: ${data.message}\n`);
          if (data.stack) {
            this.errorStream.write(`${data.stack}\n`);
          }
        } else {
          this.errorStream.write(JSON.stringify(data, null, 2) + '\n');
        }
      }
    }
  }
  
  warn(message: string, data?: unknown): void {
    if (this.level >= LogLevel.WARN) {
      this.errorStream.write(this.format(LogLevel.WARN, message) + '\n');
      if (data) {
        if (data instanceof Error) {
          this.errorStream.write(`Error: ${data.message}\n`);
          if (data.stack) {
            this.errorStream.write(`${data.stack}\n`);
          }
        } else {
          this.errorStream.write(JSON.stringify(data, null, 2) + '\n');
        }
      }
    }
  }
  
  info(message: string, data?: unknown): void {
    if (this.level >= LogLevel.INFO) {
      this.outStream.write(this.format(LogLevel.INFO, message) + '\n');
      if (data) {
        if (data instanceof Error) {
          this.outStream.write(`Error: ${data.message}\n`);
          if (data.stack) {
            this.outStream.write(`${data.stack}\n`);
          }
        } else {
          this.outStream.write(JSON.stringify(data, null, 2) + '\n');
        }
      }
    }
  }
  
  debug(message: string, data?: unknown): void {
    if (this.level >= LogLevel.DEBUG) {
      this.outStream.write(this.format(LogLevel.DEBUG, message) + '\n');
      if (data) {
        if (data instanceof Error) {
          this.outStream.write(`Error: ${data.message}\n`);
          if (data.stack) {
            this.outStream.write(`${data.stack}\n`);
          }
        } else {
          this.outStream.write(JSON.stringify(data, null, 2) + '\n');
        }
      }
    }
  }
  
  setLevel(level: LogLevel): void {
    this.level = level;
  }
  
  private format(level: LogLevel, message: string): string {
    const levelStr = LogLevel[level].padEnd(5);
    const timestamp = new Date().toISOString();
    return `${timestamp} ${levelStr} ${message}`;
  }
}

/**
 * Create a logger based on environment
 */
export function createLogger(options?: {
  silent?: boolean;
  level?: LogLevel;
  streams?: {
    error?: NodeJS.WriteStream;
    out?: NodeJS.WriteStream;
  };
}): Logger {
  const { silent = false, level = LogLevel.INFO, streams } = options || {};
  
  if (silent) {
    return new SilentLogger();
  }
  
  if (streams) {
    return new StreamLogger(streams.error, streams.out, level);
  }
  
  return new ConsoleLogger(level);
}