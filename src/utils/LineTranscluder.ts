import {
  parseAndResolveRefs,
  readResolvedRefs,
  composeLineOutput,
  extractErrors
} from './transclusionProcessor';
import type {
  TransclusionOptions,
  TransclusionError,
  FileCache
} from '../types';

/**
 * Handles the business logic of line transclusion
 * Separated from stream concerns for better testability and SRP
 */
export class LineTranscluder {
  private options: TransclusionOptions;
  private errors: TransclusionError[] = [];
  private cache?: FileCache;
  private processedFiles = new Set<string>();
  
  constructor(options: TransclusionOptions) {
    this.options = options;
    this.cache = options.cache;
  }
  
  /**
   * Process a single line, handling transclusions
   */
  async processLine(line: string): Promise<string> {
    // Parse and resolve references
    const resolvedRefs = parseAndResolveRefs(line, this.options);
    
    // If no transclusion references, return line unchanged
    if (resolvedRefs.length === 0) {
      return line;
    }
    
    // Track processed files
    resolvedRefs.forEach(({ resolved }) => {
      if (resolved.exists) {
        this.processedFiles.add(resolved.absolutePath);
      }
    });
    
    // Read content for resolved references
    const processedRefs = await readResolvedRefs(resolvedRefs, this.options);
    
    // Collect errors
    const errors = extractErrors(processedRefs);
    this.errors.push(...errors);
    
    // Compose output
    return composeLineOutput(line, processedRefs);
  }
  
  /**
   * Get all errors encountered during processing
   */
  getErrors(): TransclusionError[] {
    return [...this.errors];
  }
  
  /**
   * Get all processed files
   */
  getProcessedFiles(): string[] {
    return Array.from(this.processedFiles);
  }
  
  /**
   * Clear errors (useful for reusing the instance)
   */
  clearErrors(): void {
    this.errors = [];
  }
  
  /**
   * Clear processed files tracking
   */
  clearProcessedFiles(): void {
    this.processedFiles.clear();
  }
  
  /**
   * Reset all state
   */
  reset(): void {
    this.clearErrors();
    this.clearProcessedFiles();
  }
  
  /**
   * Get cache statistics if cache is enabled
   */
  getCacheStats(): { hits: number; misses: number; size: number } | null {
    if (this.cache && this.cache.stats) {
      return this.cache.stats();
    }
    return null;
  }
}