/**
 * Output formatters for different CLI output modes
 */

import type { TransclusionError } from '../types';

/**
 * Output mode configuration
 */
export enum OutputMode {
  DEFAULT = 'default',
  VERBOSE = 'verbose',
  PORCELAIN = 'porcelain',
  PROGRESS = 'progress'
}

/**
 * Output formatter interface
 */
export interface OutputFormatter {
  /**
   * Format a processing start event
   */
  onProcessingStart(inputPath: string | undefined): void;
  
  /**
   * Format a file being read
   */
  onFileRead(filePath: string): void;
  
  /**
   * Format processing complete event
   */
  onProcessingComplete(stats: ProcessingStats): void;
  
  /**
   * Format an error
   */
  onError(error: TransclusionError): void;
  
  /**
   * Format a warning
   */
  onWarning(_message: string): void;
  
  /**
   * Format validation results
   */
  onValidationComplete(errors: TransclusionError[]): void;
  
  /**
   * Update progress (for progress mode)
   */
  updateProgress(current: number, total: number, message?: string): void;
  
  /**
   * Finish progress (for progress mode)
   */
  finishProgress(): void;
}

/**
 * Processing statistics
 */
export interface ProcessingStats {
  filesProcessed: number;
  transclusionsResolved: number;
  warnings: number;
  errors: number;
  duration: number;
}

/**
 * Base formatter with common functionality
 */
abstract class BaseFormatter implements OutputFormatter {
  protected errorStream: NodeJS.WriteStream;
  protected outStream: NodeJS.WriteStream;
  
  constructor(errorStream: NodeJS.WriteStream, outStream: NodeJS.WriteStream) {
    this.errorStream = errorStream;
    this.outStream = outStream;
  }
  
  abstract onProcessingStart(inputPath: string | undefined): void;
  abstract onFileRead(filePath: string): void;
  abstract onProcessingComplete(stats: ProcessingStats): void;
  abstract onError(error: TransclusionError): void;
  abstract onWarning(_message: string): void;
  abstract onValidationComplete(errors: TransclusionError[]): void;
  
  updateProgress(_current: number, _total: number, _message?: string): void {
    // No-op for non-progress formatters
  }
  
  finishProgress(): void {
    // No-op for non-progress formatters
  }
}

/**
 * Default formatter - silence is golden
 */
export class DefaultFormatter extends BaseFormatter {
  onProcessingStart(_inputPath: string | undefined): void {
    // Silent by default
  }
  
  onFileRead(_filePath: string): void {
    // Silent by default
  }
  
  onProcessingComplete(_stats: ProcessingStats): void {
    // Silent by default
  }
  
  onError(error: TransclusionError): void {
    this.errorStream.write(`Error: ${error.message}\n`);
    if (error.path) {
      this.errorStream.write(`  in ${error.path}${error.line ? `:${error.line}` : ''}\n`);
    }
  }
  
  onWarning(_message: string): void {
    this.errorStream.write(`Warning: ${message}\n`);
  }
  
  onValidationComplete(errors: TransclusionError[]): void {
    if (errors.length > 0) {
      this.errorStream.write(`Validation failed with ${errors.length} error(s)\n`);
    }
  }
}

/**
 * Verbose formatter - detailed human-readable output
 */
export class VerboseFormatter extends BaseFormatter {
  private startTime: number = 0;
  
  onProcessingStart(inputPath: string | undefined): void {
    this.startTime = Date.now();
    this.errorStream.write(`[INFO] Starting transclusion processing\n`);
    this.errorStream.write(`[INFO] Input: ${inputPath || 'stdin'}\n`);
  }
  
  onFileRead(filePath: string): void {
    this.errorStream.write(`[INFO] Reading file: ${filePath}\n`);
  }
  
  onProcessingComplete(stats: ProcessingStats): void {
    this.errorStream.write(`\n[INFO] Processing complete\n`);
    this.errorStream.write(`[INFO] Files processed: ${stats.filesProcessed}\n`);
    this.errorStream.write(`[INFO] Transclusions resolved: ${stats.transclusionsResolved}\n`);
    this.errorStream.write(`[INFO] Warnings: ${stats.warnings}\n`);
    this.errorStream.write(`[INFO] Errors: ${stats.errors}\n`);
    this.errorStream.write(`[INFO] Duration: ${stats.duration}ms\n`);
  }
  
  onError(error: TransclusionError): void {
    this.errorStream.write(`[ERROR] ${error.message}\n`);
    if (error.path) {
      this.errorStream.write(`[ERROR] Location: ${error.path}${error.line ? `:${error.line}` : ''}\n`);
    }
    if (error.code) {
      this.errorStream.write(`[ERROR] Code: ${error.code}\n`);
    }
  }
  
  onWarning(_message: string): void {
    this.errorStream.write(`[WARN] ${message}\n`);
  }
  
  onValidationComplete(errors: TransclusionError[]): void {
    if (errors.length > 0) {
      this.errorStream.write(`[ERROR] Validation failed with ${errors.length} error(s):\n`);
      errors.forEach((error, index) => {
        this.errorStream.write(`[ERROR] ${index + 1}. ${error.message}`);
        if (error.path) {
          this.errorStream.write(` (${error.path}${error.line ? `:${error.line}` : ''})`);
        }
        this.errorStream.write('\n');
      });
    } else {
      this.errorStream.write(`[INFO] Validation passed - all transclusions are valid\n`);
    }
  }
}

/**
 * Porcelain formatter - machine-readable output
 */
export class PorcelainFormatter extends BaseFormatter {
  onProcessingStart(_inputPath: string | undefined): void {
    // No output for porcelain mode start
  }
  
  onFileRead(filePath: string): void {
    this.errorStream.write(`READ\t${filePath}\n`);
  }
  
  onProcessingComplete(stats: ProcessingStats): void {
    this.errorStream.write(`COMPLETE\t${stats.filesProcessed}\t${stats.transclusionsResolved}\t${stats.warnings}\t${stats.errors}\t${stats.duration}\n`);
  }
  
  onError(error: TransclusionError): void {
    const parts = ['ERROR', error.code || 'UNKNOWN', error.message];
    if (error.path) {
      parts.push(error.path);
      if (error.line) {
        parts.push(error.line.toString());
      }
    }
    this.errorStream.write(parts.join('\t') + '\n');
  }
  
  onWarning(_message: string): void {
    this.errorStream.write(`WARN\t${message}\n`);
  }
  
  onValidationComplete(errors: TransclusionError[]): void {
    if (errors.length > 0) {
      this.errorStream.write(`VALIDATION_FAILED\t${errors.length}\n`);
      errors.forEach(error => {
        const parts = ['VALIDATION_ERROR', error.code || 'UNKNOWN', error.message];
        if (error.path) {
          parts.push(error.path);
          if (error.line) {
            parts.push(error.line.toString());
          }
        }
        this.errorStream.write(parts.join('\t') + '\n');
      });
    } else {
      this.errorStream.write('VALIDATION_PASSED\t0\n');
    }
  }
}

/**
 * Progress formatter - real-time progress bars
 */
export class ProgressFormatter extends BaseFormatter {
  private progressBarWidth = 40;
  private currentProgress = 0;
  private totalProgress = 0;
  private lastMessage = '';
  private isProgressActive = false;
  
  onProcessingStart(inputPath: string | undefined): void {
    this.errorStream.write(`Processing ${inputPath || 'stdin'}...\n`);
  }
  
  onFileRead(filePath: string): void {
    if (this.isProgressActive) {
      this.updateProgress(this.currentProgress, this.totalProgress, `Reading: ${filePath}`);
    }
  }
  
  onProcessingComplete(stats: ProcessingStats): void {
    this.finishProgress();
    this.errorStream.write(`\n✓ Processing complete: ${stats.filesProcessed} files, ${stats.transclusionsResolved} transclusions (${stats.duration}ms)\n`);
    if (stats.errors > 0) {
      this.errorStream.write(`⚠ ${stats.errors} error(s) occurred\n`);
    }
  }
  
  onError(error: TransclusionError): void {
    this.finishProgress();
    this.errorStream.write(`\n✗ Error: ${error.message}`);
    if (error.path) {
      this.errorStream.write(` in ${error.path}${error.line ? `:${error.line}` : ''}`);
    }
    this.errorStream.write('\n');
    this.isProgressActive = true; // Resume progress after error
  }
  
  onWarning(_message: string): void {
    // Store warning to display after progress completes
    // Don't interrupt progress bar
  }
  
  onValidationComplete(errors: TransclusionError[]): void {
    this.finishProgress();
    if (errors.length > 0) {
      this.errorStream.write(`\n✗ Validation failed with ${errors.length} error(s)\n`);
    } else {
      this.errorStream.write('\n✓ Validation passed\n');
    }
  }
  
  updateProgress(current: number, total: number, message?: string): void {
    this.currentProgress = current;
    this.totalProgress = total;
    this.isProgressActive = true;
    
    if (message) {
      this.lastMessage = message;
    }
    
    const percentage = total > 0 ? Math.floor((current / total) * 100) : 0;
    const filledWidth = Math.floor((percentage / 100) * this.progressBarWidth);
    const emptyWidth = this.progressBarWidth - filledWidth;
    
    // Clear line and draw progress bar
    this.errorStream.write('\r\x1b[K'); // Clear line
    this.errorStream.write('[');
    this.errorStream.write('█'.repeat(filledWidth));
    this.errorStream.write('░'.repeat(emptyWidth));
    this.errorStream.write(`] ${percentage}% `);
    
    if (this.lastMessage) {
      // Truncate message if too long
      const maxMessageLength = 50;
      const truncatedMessage = this.lastMessage.length > maxMessageLength
        ? this.lastMessage.substring(0, maxMessageLength - 3) + '...'
        : this.lastMessage;
      this.errorStream.write(truncatedMessage);
    }
  }
  
  finishProgress(): void {
    if (this.isProgressActive) {
      this.errorStream.write('\r\x1b[K'); // Clear progress line
      this.isProgressActive = false;
    }
  }
}

/**
 * Create formatter based on output mode
 */
export function createFormatter(
  mode: OutputMode,
  errorStream: NodeJS.WriteStream,
  outStream: NodeJS.WriteStream
): OutputFormatter {
  switch (mode) {
    case OutputMode.VERBOSE:
      return new VerboseFormatter(errorStream, outStream);
    case OutputMode.PORCELAIN:
      return new PorcelainFormatter(errorStream, outStream);
    case OutputMode.PROGRESS:
      return new ProgressFormatter(errorStream, outStream);
    case OutputMode.DEFAULT:
    default:
      return new DefaultFormatter(errorStream, outStream);
  }
}