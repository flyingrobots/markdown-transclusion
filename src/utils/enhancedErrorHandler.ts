/**
 * Enhanced Error Handler for F025
 * 
 * Integrates suggestion engine with existing error handling system.
 * Provides dependency injection and maintains backward compatibility.
 */

import type { TransclusionError, TransclusionOptions } from '../types';
import type { SuggestionEngine, SuggestionContext } from './suggestionEngine';
import { 
  EnhancedTransclusionError, 
  ErrorContextBuilder, 
  EnhancedErrorFactory,
  ErrorType,
  ContextExtractor
} from './enhancedError';

/**
 * Configuration for enhanced error handling
 */
export interface EnhancedErrorConfig {
  enabled: boolean;
  maxSuggestions: number;
  minConfidence: number;
  includeContext: boolean;
  contextLines: number;
}

/**
 * Default configuration following KISS principle
 */
export const DEFAULT_ENHANCED_ERROR_CONFIG: EnhancedErrorConfig = {
  enabled: true,
  maxSuggestions: 3,
  minConfidence: 50,
  includeContext: true,
  contextLines: 2
};

/**
 * Enhanced error handler that enriches basic TransclusionErrors with suggestions and context
 */
export class EnhancedErrorHandler {
  constructor(
    private readonly suggestionEngine: SuggestionEngine,
    private readonly config: EnhancedErrorConfig = DEFAULT_ENHANCED_ERROR_CONFIG
  ) {}

  /**
   * Enhance a basic TransclusionError with suggestions and context
   */
  async enhanceError(
    baseError: TransclusionError,
    options: {
      sourceFile: string;
      sourceContent?: string;
      reference: string;
      transclusionOptions: TransclusionOptions;
    }
  ): Promise<EnhancedTransclusionError> {
    if (!this.config.enabled) {
      return this.createBasicEnhancedError(baseError, options);
    }

    const context = this.buildErrorContext(baseError, options);
    const suggestionContext = this.buildSuggestionContext(baseError, options.transclusionOptions);
    
    const errorType = this.determineErrorType(baseError);
    
    switch (errorType) {
      case ErrorType.FILE_NOT_FOUND:
        return this.enhanceFileNotFoundError(baseError, context, suggestionContext);
        
      case ErrorType.HEADING_NOT_FOUND:
        return this.enhanceHeadingNotFoundError(baseError, context, suggestionContext);
        
      case ErrorType.VARIABLE_UNDEFINED:
        return this.enhanceVariableUndefinedError(baseError, context, suggestionContext);
        
      default:
        return this.createBasicEnhancedError(baseError, options);
    }
  }

  /**
   * Enhance multiple errors in batch for performance
   */
  async enhanceErrors(
    errors: Array<{
      error: TransclusionError;
      sourceFile: string;
      sourceContent?: string;
      reference: string;
      transclusionOptions: TransclusionOptions;
    }>
  ): Promise<EnhancedTransclusionError[]> {
    // Process errors in parallel for better performance
    return Promise.all(
      errors.map(({ error, sourceFile, sourceContent, reference, transclusionOptions }) =>
        this.enhanceError(error, { sourceFile, sourceContent, reference, transclusionOptions })
      )
    );
  }

  private async enhanceFileNotFoundError(
    baseError: TransclusionError,
    context: any,
    suggestionContext: SuggestionContext
  ): Promise<EnhancedTransclusionError> {
    const suggestions = await this.suggestionEngine.suggestFiles(baseError.path, suggestionContext);
    const pathSuggestions = await this.suggestionEngine.suggestPathResolution(baseError.path, suggestionContext);
    
    const allSuggestions = [...suggestions, ...pathSuggestions]
      .filter(s => s.confidence >= this.config.minConfidence)
      .slice(0, this.config.maxSuggestions);
    
    return EnhancedErrorFactory.createFileNotFoundError(
      baseError.path,
      context,
      allSuggestions
    );
  }

  private async enhanceHeadingNotFoundError(
    baseError: TransclusionError,
    context: any,
    suggestionContext: SuggestionContext
  ): Promise<EnhancedTransclusionError> {
    // Extract heading name from error message or context
    const headingName = this.extractHeadingName(baseError.message, context.reference);
    
    if (!headingName) {
      return this.createBasicEnhancedError(baseError, { sourceFile: context.sourceFile, reference: context.reference, transclusionOptions: {} });
    }
    
    const suggestions = await this.suggestionEngine.suggestHeadings(
      headingName, 
      baseError.path, 
      suggestionContext
    );
    
    const filteredSuggestions = suggestions
      .filter(s => s.confidence >= this.config.minConfidence)
      .slice(0, this.config.maxSuggestions);
    
    return EnhancedErrorFactory.createHeadingNotFoundError(
      headingName,
      baseError.path,
      context,
      filteredSuggestions
    );
  }

  private async enhanceVariableUndefinedError(
    baseError: TransclusionError,
    context: any,
    suggestionContext: SuggestionContext
  ): Promise<EnhancedTransclusionError> {
    // Extract variable name from error message
    const variableName = this.extractVariableName(baseError.message);
    
    if (!variableName) {
      return this.createBasicEnhancedError(baseError, { sourceFile: context.sourceFile, reference: context.reference, transclusionOptions: {} });
    }
    
    const suggestions = this.suggestionEngine.suggestVariables(variableName, suggestionContext);
    
    const filteredSuggestions = suggestions
      .filter(s => s.confidence >= this.config.minConfidence)
      .slice(0, this.config.maxSuggestions);
    
    return EnhancedErrorFactory.createVariableUndefinedError(
      variableName,
      context,
      filteredSuggestions
    );
  }

  private buildErrorContext(
    baseError: TransclusionError,
    options: {
      sourceFile: string;
      sourceContent?: string;
      reference: string;
    }
  ) {
    const builder = new ErrorContextBuilder()
      .setSourceFile(options.sourceFile)
      .setLine(baseError.line || 0)
      .setReference(options.reference);
    
    if (options.sourceContent && this.config.includeContext) {
      const surroundingLines = ContextExtractor.extractSurroundingLines(
        options.sourceContent,
        baseError.line || 0,
        this.config.contextLines
      );
      builder.setSurroundingLines(surroundingLines);
      
      const column = ContextExtractor.findReferenceColumn(
        surroundingLines[this.config.contextLines] || '',
        options.reference
      );
      if (column >= 0) {
        builder.setColumn(column);
      }
    }
    
    return builder.build();
  }

  private buildSuggestionContext(
    baseError: TransclusionError,
    transclusionOptions: TransclusionOptions
  ): SuggestionContext {
    return {
      target: baseError.path,
      basePath: transclusionOptions.basePath,
      availableVariables: transclusionOptions.variables
    };
  }

  private determineErrorType(error: TransclusionError): ErrorType {
    // Use error code if available, otherwise infer from message
    if (error.code) {
      return error.code as ErrorType;
    }
    
    const message = error.message.toLowerCase();
    
    if (message.includes('file not found') || message.includes('no such file')) {
      return ErrorType.FILE_NOT_FOUND;
    }
    
    if (message.includes('heading') && message.includes('not found')) {
      return ErrorType.HEADING_NOT_FOUND;
    }
    
    if (message.includes('variable') && (message.includes('undefined') || message.includes('not defined'))) {
      return ErrorType.VARIABLE_UNDEFINED;
    }
    
    if (message.includes('circular')) {
      return ErrorType.CIRCULAR_REFERENCE;
    }
    
    if (message.includes('path traversal') || message.includes('outside')) {
      return ErrorType.PATH_TRAVERSAL;
    }
    
    return ErrorType.FILE_NOT_FOUND; // Default fallback
  }

  private extractHeadingName(message: string, reference: string): string | null {
    // Try to extract from reference first: ![[file#heading]]
    const refMatch = reference.match(/!?\[\[[^#]*#([^\]]*)\]\]/);
    if (refMatch) {
      return refMatch[1].split(':')[0]; // Handle ranges like heading:end
    }
    
    // Try to extract from error message
    const msgMatch = message.match(/heading ["']([^"']+)["']/i);
    if (msgMatch) {
      return msgMatch[1];
    }
    
    return null;
  }

  private extractVariableName(message: string): string | null {
    // Extract variable name from error message
    const match = message.match(/variable ["']([^"']+)["']/i);
    return match ? match[1] : null;
  }

  private createBasicEnhancedError(
    baseError: TransclusionError,
    options: {
      sourceFile: string;
      reference: string;
      transclusionOptions: any;
    }
  ): EnhancedTransclusionError {
    const context = new ErrorContextBuilder()
      .setSourceFile(options.sourceFile)
      .setLine(baseError.line || 0)
      .setReference(options.reference)
      .build();
    
    return {
      ...baseError,
      errorType: this.determineErrorType(baseError),
      context,
      suggestions: [],
      fixActions: [],
      severity: 'error' as const
    };
  }
}

/**
 * Factory for creating pre-configured enhanced error handlers
 */
export class EnhancedErrorHandlerFactory {
  /**
   * Create a default enhanced error handler with all dependencies
   */
  static async createDefault(config?: Partial<EnhancedErrorConfig>): Promise<EnhancedErrorHandler> {
    const { 
      SuggestionEngine, 
      LevenshteinFuzzyMatcher, 
      NodeFileSystemProvider, 
      MarkdownHeadingProvider 
    } = await import('./suggestionEngine');
    
    const suggestionEngine = new SuggestionEngine(
      new LevenshteinFuzzyMatcher(),
      new NodeFileSystemProvider(),
      new MarkdownHeadingProvider()
    );
    
    const finalConfig = { ...DEFAULT_ENHANCED_ERROR_CONFIG, ...config };
    
    return new EnhancedErrorHandler(suggestionEngine, finalConfig);
  }

  /**
   * Create an enhanced error handler with custom dependencies (for testing)
   */
  static createCustom(
    suggestionEngine: SuggestionEngine,
    config?: Partial<EnhancedErrorConfig>
  ): EnhancedErrorHandler {
    const finalConfig = { ...DEFAULT_ENHANCED_ERROR_CONFIG, ...config };
    return new EnhancedErrorHandler(suggestionEngine, finalConfig);
  }
}