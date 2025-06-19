/**
 * Enhanced Error System for F025
 * 
 * Provides rich error context, suggestions, and human-friendly formatting
 * while maintaining compatibility with existing TransclusionError interface.
 */

import type { TransclusionError } from '../types';
import type { Suggestion } from './suggestionEngine';

/**
 * Enhanced error context providing detailed information about the error location
 */
export interface ErrorContext {
  readonly sourceFile: string;
  readonly line: number;
  readonly column?: number;
  readonly reference: string;
  readonly surroundingLines?: string[];
}

/**
 * Actionable fix suggestion for errors
 */
export interface FixAction {
  readonly description: string;
  readonly command?: string;
  readonly autofix?: boolean;
}

/**
 * Enhanced error with suggestions and context
 * Extends the base TransclusionError interface
 */
export interface EnhancedTransclusionError extends TransclusionError {
  readonly errorType: ErrorType;
  readonly context: ErrorContext;
  readonly suggestions: Suggestion[];
  readonly fixActions: FixAction[];
  readonly severity: 'error' | 'warning' | 'info';
}

/**
 * Enumeration of error types for categorization
 */
export enum ErrorType {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  HEADING_NOT_FOUND = 'HEADING_NOT_FOUND', 
  VARIABLE_UNDEFINED = 'VARIABLE_UNDEFINED',
  CIRCULAR_REFERENCE = 'CIRCULAR_REFERENCE',
  PATH_TRAVERSAL = 'PATH_TRAVERSAL',
  INVALID_SYNTAX = 'INVALID_SYNTAX',
  MAX_DEPTH_EXCEEDED = 'MAX_DEPTH_EXCEEDED'
}

/**
 * Factory for creating enhanced errors with appropriate suggestions and context
 */
export class EnhancedErrorFactory {
  /**
   * Create a file not found error with suggestions
   */
  static createFileNotFoundError(
    fileName: string,
    context: ErrorContext,
    suggestions: Suggestion[]
  ): EnhancedTransclusionError {
    const fixActions: FixAction[] = [
      {
        description: 'Check file path spelling',
        autofix: false
      },
      {
        description: 'Verify file exists in base directory',
        autofix: false
      }
    ];

    // Add specific fix actions for high-confidence suggestions
    if (suggestions.length > 0 && suggestions[0].confidence > 80) {
      fixActions.unshift({
        description: `Replace with '${suggestions[0].text}'`,
        command: `sed -i 's/${fileName}/${suggestions[0].text}/g' "${context.sourceFile}"`,
        autofix: true
      });
    }

    return {
      message: `File not found: '${fileName}'`,
      path: fileName,
      code: ErrorType.FILE_NOT_FOUND,
      line: context.line,
      errorType: ErrorType.FILE_NOT_FOUND,
      context,
      suggestions,
      fixActions,
      severity: 'error'
    };
  }

  /**
   * Create a heading not found error with heading suggestions
   */
  static createHeadingNotFoundError(
    headingName: string,
    fileName: string,
    context: ErrorContext,
    suggestions: Suggestion[]
  ): EnhancedTransclusionError {
    const fixActions: FixAction[] = [
      {
        description: 'Check heading name spelling',
        autofix: false
      },
      {
        description: 'Verify heading exists in target file',
        autofix: false
      }
    ];

    if (suggestions.length > 0 && suggestions[0].confidence > 75) {
      fixActions.unshift({
        description: `Replace with '${suggestions[0].text}'`,
        command: `sed -i 's/${headingName}/${suggestions[0].text}/g' "${context.sourceFile}"`,
        autofix: true
      });
    }

    return {
      message: `Heading '${headingName}' not found in '${fileName}'`,
      path: fileName,
      code: ErrorType.HEADING_NOT_FOUND,
      line: context.line,
      errorType: ErrorType.HEADING_NOT_FOUND,
      context,
      suggestions,
      fixActions,
      severity: 'error'
    };
  }

  /**
   * Create a variable undefined error with variable suggestions  
   */
  static createVariableUndefinedError(
    variableName: string,
    context: ErrorContext,
    suggestions: Suggestion[]
  ): EnhancedTransclusionError {
    const fixActions: FixAction[] = [
      {
        description: `Define variable: --variables ${variableName}=value`,
        autofix: false
      },
      {
        description: 'Check variable name spelling',
        autofix: false
      }
    ];

    if (suggestions.length > 0 && suggestions[0].confidence > 80) {
      fixActions.unshift({
        description: `Replace with '${suggestions[0].text}'`,
        command: `sed -i 's/{{${variableName}}}/{{${suggestions[0].text}}}/g' "${context.sourceFile}"`,
        autofix: true
      });
    }

    return {
      message: `Variable '${variableName}' is undefined`,
      path: context.sourceFile,
      code: ErrorType.VARIABLE_UNDEFINED,
      line: context.line,
      errorType: ErrorType.VARIABLE_UNDEFINED,
      context,
      suggestions,
      fixActions,
      severity: 'error'
    };
  }

  /**
   * Create a circular reference error
   */
  static createCircularReferenceError(
    referenceChain: string[],
    context: ErrorContext
  ): EnhancedTransclusionError {
    const chainDisplay = referenceChain.join(' → ');
    
    return {
      message: `Circular reference detected: ${chainDisplay}`,
      path: context.sourceFile,
      code: ErrorType.CIRCULAR_REFERENCE,
      line: context.line,
      errorType: ErrorType.CIRCULAR_REFERENCE,
      context,
      suggestions: [],
      fixActions: [
        {
          description: 'Break the circular dependency',
          autofix: false
        },
        {
          description: 'Use conditional transclusion with variables',
          autofix: false
        },
        {
          description: 'Restructure content hierarchy',
          autofix: false
        }
      ],
      severity: 'error'
    };
  }

  /**
   * Create a path traversal error
   */
  static createPathTraversalError(
    attemptedPath: string,
    context: ErrorContext
  ): EnhancedTransclusionError {
    return {
      message: `Path traversal blocked: '${attemptedPath}'`,
      path: attemptedPath,
      code: ErrorType.PATH_TRAVERSAL,
      line: context.line,
      errorType: ErrorType.PATH_TRAVERSAL,
      context,
      suggestions: [],
      fixActions: [
        {
          description: 'Use --base-path to allow broader file access',
          autofix: false
        },
        {
          description: 'Move target file within project directory',
          autofix: false
        },
        {
          description: 'Use relative paths within allowed directories',
          autofix: false
        }
      ],
      severity: 'error'
    };
  }
}

/**
 * Error context builder for creating rich error context
 */
export class ErrorContextBuilder {
  private sourceFile: string = '';
  private line: number = 0;
  private column?: number;
  private reference: string = '';
  private surroundingLines?: string[];

  setSourceFile(file: string): this {
    this.sourceFile = file;
    return this;
  }

  setLine(line: number): this {
    this.line = line;
    return this;
  }

  setColumn(column: number): this {
    this.column = column;
    return this;
  }

  setReference(reference: string): this {
    this.reference = reference;
    return this;
  }

  setSurroundingLines(lines: string[]): this {
    this.surroundingLines = lines;
    return this;
  }

  build(): ErrorContext {
    return {
      sourceFile: this.sourceFile,
      line: this.line,
      column: this.column,
      reference: this.reference,
      surroundingLines: this.surroundingLines
    };
  }
}

/**
 * Utility for extracting context from source content
 */
export class ContextExtractor {
  /**
   * Extract surrounding lines from content for error context
   */
  static extractSurroundingLines(
    content: string,
    lineNumber: number,
    contextLines: number = 2
  ): string[] {
    const lines = content.split('\n');
    const startLine = Math.max(0, lineNumber - contextLines - 1);
    const endLine = Math.min(lines.length, lineNumber + contextLines);
    
    return lines.slice(startLine, endLine);
  }

  /**
   * Find the column position of a reference in a line
   */
  static findReferenceColumn(line: string, reference: string): number {
    return line.indexOf(reference);
  }
}

/**
 * Human-friendly error formatter
 */
export class ErrorFormatter {
  /**
   * Format an enhanced error for display in terminal
   */
  static formatForTerminal(error: EnhancedTransclusionError): string {
    const lines: string[] = [];
    
    // Error header with emoji and severity
    const emoji = this.getErrorEmoji(error.severity);
    lines.push(`${emoji} Error: ${error.message}`);
    
    // Context information
    lines.push(`📍 Referenced in: ${error.context.sourceFile}:${error.context.line}`);
    if (error.context.reference) {
      lines.push(`🔗 Reference: ${error.context.reference}`);
    }
    
    // Suggestions
    if (error.suggestions.length > 0) {
      lines.push('🔍 Suggestions:');
      error.suggestions.forEach(suggestion => {
        const confidence = suggestion.confidence >= 80 ? '← Did you mean this?' : '';
        lines.push(`   • ${suggestion.text} (${suggestion.confidence}% match) ${confidence}`);
      });
    }
    
    // Fix actions
    if (error.fixActions.length > 0) {
      lines.push('💡 How to fix:');
      error.fixActions.forEach(action => {
        lines.push(`   • ${action.description}`);
        if (action.command) {
          lines.push(`     Command: ${action.command}`);
        }
      });
    }
    
    return lines.join('\n');
  }

  /**
   * Format an enhanced error for JSON output
   */
  static formatForJSON(error: EnhancedTransclusionError): object {
    return {
      type: error.errorType,
      message: error.message,
      severity: error.severity,
      context: error.context,
      suggestions: error.suggestions,
      fixActions: error.fixActions
    };
  }

  private static getErrorEmoji(severity: string): string {
    switch (severity) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '❌';
    }
  }
}