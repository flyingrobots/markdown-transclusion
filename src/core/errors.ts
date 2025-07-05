/**
 * Core error types for the transclusion engine
 */

/**
 * Error information for transclusion failures
 */
export interface TransclusionError {
  /**
   * Human-readable error message
   */
  message: string;

  /**
   * Path to the file that caused the error
   */
  path: string;

  /**
   * Line number where the error occurred (if applicable)
   */
  line?: number;

  /**
   * Error code for programmatic handling
   */
  code?: string;
}

/**
 * Error codes for transclusion operations
 */
export enum TransclusionErrorCode {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  CIRCULAR_REFERENCE = 'CIRCULAR_REFERENCE',
  MAX_DEPTH_EXCEEDED = 'MAX_DEPTH_EXCEEDED',
  INVALID_PATH = 'INVALID_PATH',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  READ_ERROR = 'READ_ERROR',
  PARSE_ERROR = 'PARSE_ERROR'
}

/**
 * Custom error class for transclusion operations
 */
export class TransclusionOperationError extends Error {
  public code: TransclusionErrorCode;
  public path: string;
  public line?: number;

  constructor(message: string, code: TransclusionErrorCode, path: string, line?: number) {
    super(message);
    this.name = 'TransclusionOperationError';
    this.code = code;
    this.path = path;
    this.line = line;
  }

  toTransclusionError(): TransclusionError {
    return {
      message: this.message,
      path: this.path,
      line: this.line,
      code: this.code
    };
  }
}