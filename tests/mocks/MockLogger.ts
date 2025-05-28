import type { Logger, LogLevel, LogEntry } from '../../src/utils/logger';

/**
 * Mock logger for testing with assertion helpers
 */
export class MockLogger implements Logger {
  private logs: LogEntry[] = [];
  private level: LogLevel;
  
  constructor(level: LogLevel = 2) { // INFO by default
    this.level = level;
  }
  
  error(message: string, data?: unknown): void {
    this.log(0, message, data); // ERROR = 0
  }
  
  warn(message: string, data?: unknown): void {
    this.log(1, message, data); // WARN = 1
  }
  
  info(message: string, data?: unknown): void {
    this.log(2, message, data); // INFO = 2
  }
  
  debug(message: string, data?: unknown): void {
    this.log(3, message, data); // DEBUG = 3
  }
  
  setLevel(level: LogLevel): void {
    this.level = level;
  }
  
  private log(level: LogLevel, message: string, data?: unknown): void {
    if (this.level >= 0 && level <= this.level) {
      this.logs.push({
        level,
        message,
        timestamp: new Date(),
        data
      });
    }
  }
  
  // Assertion helpers
  
  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }
  
  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }
  
  /**
   * Check if a message was logged
   */
  hasMessage(message: string): boolean {
    return this.logs.some(log => log.message.includes(message));
  }
  
  /**
   * Check if an error was logged
   */
  hasError(message?: string): boolean {
    const errors = this.getLogsByLevel(0); // ERROR = 0
    if (message) {
      return errors.some(log => log.message.includes(message));
    }
    return errors.length > 0;
  }
  
  /**
   * Check if a warning was logged
   */
  hasWarning(message?: string): boolean {
    const warnings = this.getLogsByLevel(1); // WARN = 1
    if (message) {
      return warnings.some(log => log.message.includes(message));
    }
    return warnings.length > 0;
  }
  
  /**
   * Get error count
   */
  getErrorCount(): number {
    return this.getLogsByLevel(0).length; // ERROR = 0
  }
  
  /**
   * Get warning count
   */
  getWarningCount(): number {
    return this.getLogsByLevel(1).length; // WARN = 1
  }
  
  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
  }
  
  /**
   * Assert no errors were logged
   */
  assertNoErrors(): void {
    const errors = this.getLogsByLevel(0); // ERROR = 0
    if (errors.length > 0) {
      const messages = errors.map(e => e.message).join('\n');
      throw new Error(`Expected no errors but found ${errors.length}:\n${messages}`);
    }
  }
  
  /**
   * Assert specific error was logged
   */
  assertError(expectedMessage: string): void {
    if (!this.hasError(expectedMessage)) {
      const errors = this.getLogsByLevel(0); // ERROR = 0
      const messages = errors.map(e => e.message).join('\n');
      throw new Error(`Expected error containing "${expectedMessage}" but got:\n${messages}`);
    }
  }
  
  /**
   * Create a spy logger that records but doesn't output
   */
  static createSpy(): MockLogger {
    return new MockLogger();
  }
  
  /**
   * Create a silent logger that ignores everything
   */
  static createSilent(): MockLogger {
    const logger = new MockLogger();
    // Set to -1 to disable all logging
    (logger as any).level = -1;
    return logger;
  }
}