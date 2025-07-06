/**
 * Enhanced Output Formatter with F025 Error Recovery
 * 
 * Extends existing output formatter to provide enhanced error messages
 * with suggestions while maintaining backward compatibility.
 */

import type { TransclusionError } from '../types';
import { 
  OutputFormatter, 
  OutputMode, 
  type ProcessingStats,
  DefaultFormatter,
  VerboseFormatter 
} from './outputFormatter';
import { LogLevel } from './logger';
import {
  LevenshteinFuzzyMatcher,
  NodeFileSystemProvider,
  MarkdownHeadingProvider,
  SuggestionEngine,
  type Suggestion
} from './suggestionEngine';

/**
 * Enhanced output formatter that provides intelligent error suggestions
 */
export class EnhancedOutputFormatter implements OutputFormatter {
  private suggestionEngine: SuggestionEngine;
  private baseFormatter: OutputFormatter;
  private basePath?: string;
  private availableFiles: string[] = [];

  constructor(
    mode: OutputMode,
    private readonly stderr: NodeJS.WriteStream,
    private readonly stdout: NodeJS.WriteStream,
    basePath?: string,
    logLevel: LogLevel = LogLevel.INFO,
    strict: boolean = false
  ) {
    this.basePath = basePath;
    this.suggestionEngine = new SuggestionEngine(
      new LevenshteinFuzzyMatcher(),
      new NodeFileSystemProvider(),
      new MarkdownHeadingProvider()
    );
    
    // Use existing formatters as base
    this.baseFormatter = mode === OutputMode.VERBOSE
      ? new VerboseFormatter(stderr, stdout, logLevel, strict)
      : new DefaultFormatter(stderr, stdout, logLevel, strict);
  }

  async init(): Promise<void> {
    // Pre-load available files for faster suggestions
    if (this.basePath) {
      try {
        const fileSystem = new NodeFileSystemProvider();
        this.availableFiles = await fileSystem.getMarkdownFiles(this.basePath);
      } catch {
        // Ignore file system errors during initialization
      }
    }
  }

  onProcessingStart(inputPath: string | undefined): void {
    this.baseFormatter.onProcessingStart(inputPath);
  }

  onFileRead(filePath: string): void {
    this.baseFormatter.onFileRead(filePath);
  }

  onProcessingComplete(stats: ProcessingStats): void {
    this.baseFormatter.onProcessingComplete(stats);
  }

  onError(error: TransclusionError): void {
    // First, call the base formatter for backward compatibility
    this.baseFormatter.onError(error);
    
    // Then, add enhanced error information asynchronously
    this.displayEnhancedError(error).catch(() => {
      // Ignore enhancement errors to maintain stability
    });
  }

  onWarning(message: string): void {
    this.baseFormatter.onWarning(message);
  }

  onValidationComplete(errors: TransclusionError[]): void {
    this.baseFormatter.onValidationComplete(errors);
    
    // Add summary of suggestions available
    this.displayErrorSummary(errors);
  }

  updateProgress(current: number, total: number, message?: string): void {
    this.baseFormatter.updateProgress(current, total, message);
  }

  finishProgress(): void {
    this.baseFormatter.finishProgress();
  }

  private async displayEnhancedError(error: TransclusionError): Promise<void> {
    const suggestions = await this.generateSuggestions(error);
    
    if (suggestions.length === 0) {
      return; // No suggestions to display
    }

    this.stderr.write('\n');
    this.stderr.write('🔍 Suggestions:\n');
    
    suggestions.slice(0, 3).forEach(suggestion => {
      const confidence = suggestion.confidence >= 80 ? ' ← Did you mean this?' : '';
      this.stderr.write(`   • ${suggestion.text} (${suggestion.confidence}% match)${confidence}\n`);
    });

    this.stderr.write('💡 How to fix:\n');
    this.displayFixSuggestions(error, suggestions);
    this.stderr.write('\n');
  }

  private async generateSuggestions(error: TransclusionError): Promise<Suggestion[]> {
    const context = {
      target: error.path,
      basePath: this.basePath,
      availableFiles: this.availableFiles
    };

    try {
      if (this.isFileNotFoundError(error)) {
        const fileSuggestions = await this.suggestionEngine.suggestFiles(error.path, context);
        const pathSuggestions = await this.suggestionEngine.suggestPathResolution(error.path, context);
        return [...fileSuggestions, ...pathSuggestions];
      }
      
      if (this.isHeadingNotFoundError(error)) {
        const headingName = this.extractHeadingName(error.message);
        if (headingName) {
          return await this.suggestionEngine.suggestHeadings(headingName, error.path, context);
        }
      }
      
      if (this.isVariableUndefinedError(error)) {
        const variableName = this.extractVariableName(error.message);
        if (variableName) {
          return this.suggestionEngine.suggestVariables(variableName, context);
        }
      }
    } catch {
      // Ignore suggestion generation errors
    }

    return [];
  }

  private displayFixSuggestions(error: TransclusionError, suggestions: Suggestion[]): void {
    if (this.isFileNotFoundError(error)) {
      this.stderr.write('   • Check file path spelling\n');
      this.stderr.write('   • Verify file exists in base directory\n');
      
      if (error.path.includes('../')) {
        this.stderr.write('   • Use --base-path to allow broader file access\n');
      }
      
      if (suggestions.length > 0 && suggestions[0].confidence >= 80) {
        this.stderr.write(`   • Replace with: ${suggestions[0].text}\n`);
      }
    } else if (this.isHeadingNotFoundError(error)) {
      this.stderr.write('   • Check heading name spelling\n');
      this.stderr.write('   • Verify heading exists in target file\n');
      
      if (suggestions.length > 0 && suggestions[0].confidence >= 75) {
        this.stderr.write(`   • Replace with: ${suggestions[0].text}\n`);
      }
    } else if (this.isVariableUndefinedError(error)) {
      const variableName = this.extractVariableName(error.message);
      if (variableName) {
        this.stderr.write(`   • Define variable: --variables ${variableName}=value\n`);
      }
      
      if (suggestions.length > 0 && suggestions[0].confidence >= 80) {
        this.stderr.write(`   • Replace with: {{${suggestions[0].text}}}\n`);
      }
    }
  }

  private displayErrorSummary(errors: TransclusionError[]): void {
    const errorTypes = errors.reduce((counts, error) => {
      const type = this.getErrorType(error);
      counts[type] = (counts[type] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    if (Object.keys(errorTypes).length > 1) {
      this.stderr.write('\n📊 Error Summary:\n');
      Object.entries(errorTypes).forEach(([type, count]) => {
        this.stderr.write(`   • ${type}: ${count}\n`);
      });
    }
  }

  private isFileNotFoundError(error: TransclusionError): boolean {
    return error.message.toLowerCase().includes('file not found') ||
           error.message.toLowerCase().includes('no such file') ||
           error.code === 'FILE_NOT_FOUND';
  }

  private isHeadingNotFoundError(error: TransclusionError): boolean {
    return error.message.toLowerCase().includes('heading') &&
           error.message.toLowerCase().includes('not found');
  }

  private isVariableUndefinedError(error: TransclusionError): boolean {
    return error.message.toLowerCase().includes('variable') &&
           (error.message.toLowerCase().includes('undefined') ||
            error.message.toLowerCase().includes('not defined'));
  }

  private extractHeadingName(message: string): string | null {
    const match = message.match(/heading ["']([^"']+)["']/i) ||
                  message.match(/Heading "([^"]+)" not found/i);
    return match ? match[1] : null;
  }

  private extractVariableName(message: string): string | null {
    const match = message.match(/variable ["']([^"']+)["']/i);
    return match ? match[1] : null;
  }

  private getErrorType(error: TransclusionError): string {
    if (this.isFileNotFoundError(error)) return 'File not found';
    if (this.isHeadingNotFoundError(error)) return 'Heading not found';
    if (this.isVariableUndefinedError(error)) return 'Variable undefined';
    if (error.message.toLowerCase().includes('circular')) return 'Circular reference';
    if (error.message.toLowerCase().includes('path traversal')) return 'Path traversal';
    return 'Other error';
  }
}

/**
 * Factory to create enhanced output formatters
 */
export function createEnhancedFormatter(
  mode: OutputMode,
  stderr: NodeJS.WriteStream,
  stdout: NodeJS.WriteStream,
  basePath?: string,
  logLevel?: LogLevel,
  strict?: boolean
): EnhancedOutputFormatter {
  return new EnhancedOutputFormatter(mode, stderr, stdout, basePath, logLevel, strict);
}

/**
 * Wrapper function that mimics the original createFormatter API
 */
export function createFormatter(
  mode: OutputMode,
  stderr: NodeJS.WriteStream,
  enableEnhancement: boolean = true,
  basePath?: string,
  stdout?: NodeJS.WriteStream,
  logLevel?: LogLevel,
  strict?: boolean
): OutputFormatter {
  if (enableEnhancement) {
    return createEnhancedFormatter(mode, stderr, stdout || stderr, basePath, logLevel, strict);
  }
  
  // Fallback to original formatter
  const { createFormatter: originalCreateFormatter } = require('./outputFormatter');
  return originalCreateFormatter(mode, stderr, stdout || stderr, logLevel, strict);
}