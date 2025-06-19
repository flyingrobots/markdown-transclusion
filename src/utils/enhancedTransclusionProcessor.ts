/**
 * Enhanced Transclusion Processor with F025 Error Recovery
 * 
 * Extends the existing transclusion processor with enhanced error handling
 * while maintaining backward compatibility and following DI principles.
 */

import type {
  TransclusionToken,
  FileResolution,
  TransclusionOptions,
  TransclusionError
} from '../types';
import type { EnhancedTransclusionError } from './enhancedError';
import type { EnhancedErrorHandler } from './enhancedErrorHandler';
import {
  parseAndResolveRefs,
  readResolvedRefs,
  type ResolvedReference,
  type ProcessedReference
} from './transclusionProcessor';

/**
 * Extended processed reference with enhanced error information
 */
export interface EnhancedProcessedReference extends Omit<ProcessedReference, 'error'> {
  error?: EnhancedTransclusionError;
  originalError?: TransclusionError;
}

/**
 * Enhanced transclusion processor that provides intelligent error recovery
 */
export class EnhancedTransclusionProcessor {
  constructor(
    private readonly enhancedErrorHandler?: EnhancedErrorHandler
  ) {}

  /**
   * Parse and resolve references with enhanced error handling
   */
  async parseAndResolveRefsWithEnhancement(
    line: string,
    options: TransclusionOptions,
    sourceFile: string,
    lineNumber: number,
    sourceContent?: string,
    parentPath?: string
  ): Promise<ResolvedReference[]> {
    // Use existing parsing logic - no changes needed here
    return parseAndResolveRefs(line, options, parentPath);
  }

  /**
   * Read resolved references with enhanced error reporting
   */
  async readResolvedRefsWithEnhancement(
    resolvedRefs: ResolvedReference[],
    options: TransclusionOptions,
    sourceFile: string,
    lineNumber: number,
    sourceContent?: string
  ): Promise<EnhancedProcessedReference[]> {
    // First, get the basic processed references
    const basicResults = await readResolvedRefs(resolvedRefs, options);
    
    // If no enhanced error handler, return basic results
    if (!this.enhancedErrorHandler) {
      return basicResults.map(result => ({
        ...result,
        error: undefined, // Clear the error field since it's not enhanced
        originalError: result.error
      }));
    }

    // Enhance errors with suggestions and context
    const enhancedResults: EnhancedProcessedReference[] = [];
    
    for (const result of basicResults) {
      if (result.error) {
        try {
          const enhancedError = await this.enhancedErrorHandler.enhanceError(
            result.error,
            {
              sourceFile,
              sourceContent,
              reference: result.ref.original,
              transclusionOptions: options
            }
          );
          
          enhancedResults.push({
            ...result,
            error: enhancedError,
            originalError: result.error
          });
        } catch (enhancementError) {
          // If enhancement fails, fallback to original error
          enhancedResults.push({
            ...result,
            error: undefined, // Clear the error field since enhancement failed
            originalError: result.error
          });
        }
      } else {
        enhancedResults.push({
          ...result,
          error: undefined, // No error to enhance
          originalError: undefined
        });
      }
    }
    
    return enhancedResults;
  }

  /**
   * Process a complete line with enhanced error handling
   */
  async processLineWithEnhancement(
    line: string,
    options: TransclusionOptions,
    sourceFile: string,
    lineNumber: number,
    sourceContent?: string,
    parentPath?: string
  ): Promise<{
    processedLine: string;
    errors: EnhancedTransclusionError[];
    originalErrors: TransclusionError[];
  }> {
    const resolvedRefs = await this.parseAndResolveRefsWithEnhancement(
      line,
      options,
      sourceFile,
      lineNumber,
      sourceContent,
      parentPath
    );
    
    if (resolvedRefs.length === 0) {
      return {
        processedLine: line,
        errors: [],
        originalErrors: []
      };
    }
    
    const processedRefs = await this.readResolvedRefsWithEnhancement(
      resolvedRefs,
      options,
      sourceFile,
      lineNumber,
      sourceContent
    );
    
    // Build the processed line by replacing references with content or error comments
    let processedLine = line;
    const errors: EnhancedTransclusionError[] = [];
    const originalErrors: TransclusionError[] = [];
    
    // Process references in reverse order to maintain correct indices
    for (let i = processedRefs.length - 1; i >= 0; i--) {
      const processedRef = processedRefs[i];
      const { ref } = processedRef;
      
      if (processedRef.error) {
        // Use enhanced error message for comment if available
        const errorMessage = processedRef.error.message || processedRef.originalError?.message || 'Unknown error';
        const errorComment = `<!-- Error: ${errorMessage} -->`;
        
        processedLine = processedLine.substring(0, ref.startIndex) + 
                      errorComment + 
                      processedLine.substring(ref.endIndex);
        
        if (processedRef.error) {
          errors.push(processedRef.error);
        }
        if (processedRef.originalError) {
          originalErrors.push(processedRef.originalError);
        }
      } else if (processedRef.content !== undefined) {
        processedLine = processedLine.substring(0, ref.startIndex) + 
                      processedRef.content + 
                      processedLine.substring(ref.endIndex);
      }
    }
    
    return {
      processedLine,
      errors,
      originalErrors
    };
  }

  /**
   * Batch process multiple errors for better performance
   */
  async batchEnhanceErrors(
    errorBatch: Array<{
      error: TransclusionError;
      sourceFile: string;
      sourceContent?: string;
      reference: string;
      transclusionOptions: TransclusionOptions;
    }>
  ): Promise<EnhancedTransclusionError[]> {
    if (!this.enhancedErrorHandler) {
      return [];
    }
    
    try {
      return await this.enhancedErrorHandler.enhanceErrors(errorBatch);
    } catch {
      // Fallback to empty array if batch enhancement fails
      return [];
    }
  }
}

/**
 * Factory for creating enhanced transclusion processors
 */
export class EnhancedTransclusionProcessorFactory {
  /**
   * Create processor with default enhanced error handler
   */
  static async createWithDefaultHandler(): Promise<EnhancedTransclusionProcessor> {
    const { EnhancedErrorHandlerFactory } = await import('./enhancedErrorHandler');
    const handler = await EnhancedErrorHandlerFactory.createDefault();
    return new EnhancedTransclusionProcessor(handler);
  }

  /**
   * Create processor with custom error handler (for testing)
   */
  static createWithCustomHandler(handler?: EnhancedErrorHandler): EnhancedTransclusionProcessor {
    return new EnhancedTransclusionProcessor(handler);
  }

  /**
   * Create processor without enhancement (backward compatibility)
   */
  static createBasic(): EnhancedTransclusionProcessor {
    return new EnhancedTransclusionProcessor();
  }
}

/**
 * Utility functions for integration with existing code
 */
export class EnhancedErrorIntegration {
  /**
   * Convert enhanced errors back to basic TransclusionError format for compatibility
   */
  static toBasicErrors(enhancedErrors: EnhancedTransclusionError[]): TransclusionError[] {
    return enhancedErrors.map(enhanced => ({
      message: enhanced.message,
      path: enhanced.path,
      line: enhanced.line,
      code: enhanced.code
    }));
  }

  /**
   * Extract suggestion information for CLI display
   */
  static extractSuggestionSummary(error: EnhancedTransclusionError): string {
    if (error.suggestions.length === 0) {
      return '';
    }

    const topSuggestion = error.suggestions[0];
    return `Did you mean: ${topSuggestion.text} (${topSuggestion.confidence}% match)?`;
  }

  /**
   * Extract actionable fixes for CLI display
   */
  static extractFixSummary(error: EnhancedTransclusionError): string[] {
    return error.fixActions
      .filter(action => !action.autofix) // Only show manual fixes in summary
      .map(action => action.description);
  }

  /**
   * Check if an error has high-confidence suggestions for auto-fixing
   */
  static hasHighConfidenceFix(error: EnhancedTransclusionError): boolean {
    return error.suggestions.some(suggestion => suggestion.confidence >= 80) &&
           error.fixActions.some(action => action.autofix);
  }
}

/**
 * Backward compatibility wrapper for existing code
 */
export function createEnhancedProcessorWrapper(
  enableEnhancement: boolean = true
): {
  parseAndResolveRefs: typeof parseAndResolveRefs;
  readResolvedRefs: typeof readResolvedRefs;
  processor?: EnhancedTransclusionProcessor;
} {
  if (!enableEnhancement) {
    return {
      parseAndResolveRefs,
      readResolvedRefs
    };
  }

  const processor = EnhancedTransclusionProcessorFactory.createBasic();

  return {
    parseAndResolveRefs,
    readResolvedRefs,
    processor
  };
}