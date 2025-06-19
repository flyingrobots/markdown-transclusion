import {
  parseAndResolveRefs,
  composeLineOutput,
  extractErrors,
  ProcessedReference,
  readResolvedRefs
} from './transclusionProcessor';
import type {
  TransclusionOptions,
  TransclusionError,
  FileCache
} from '../types';
import { stripFrontmatter } from './contentProcessing';

/**
 * Handles the business logic of line transclusion
 * Separated from stream concerns for better testability and SRP
 */
export class LineTranscluder {
  private options: TransclusionOptions;
  private errors: TransclusionError[] = [];
  private cache?: FileCache;
  private processedFiles = new Set<string>();
  private visitedFiles = new Set<string>();
  private currentDepth = 0;
  private maxDepth: number;
  
  constructor(options: TransclusionOptions) {
    this.options = options;
    this.cache = options.cache;
    this.maxDepth = options.maxDepth || 10;
  }
  
  /**
   * Process a single line, handling transclusions
   */
  async processLine(line: string): Promise<string> {
    return this.processLineWithDepth(line, 0, new Set<string>(), this.options.initialFilePath);
  }
  
  /**
   * Process a line with depth tracking for recursive transclusion
   */
  private async processLineWithDepth(
    line: string, 
    depth: number,
    visitedStack: Set<string>,
    parentPath?: string
  ): Promise<string> {
    // Parse and resolve references
    const resolvedRefs = parseAndResolveRefs(line, this.options, parentPath);
    
    // If no transclusion references, return line unchanged
    if (resolvedRefs.length === 0) {
      return line;
    }
    
    // Check depth limit
    if (depth >= this.maxDepth) {
      const error: TransclusionError = {
        message: `Maximum transclusion depth (${this.maxDepth}) exceeded`,
        path: resolvedRefs[0]?.ref.path || 'unknown',
        code: 'MAX_DEPTH_EXCEEDED'
      };
      this.errors.push(error);
      return composeLineOutput(line, resolvedRefs.map(({ ref, resolved }) => ({
        ref,
        resolved,
        error
      })));
    }
    
    // Use readResolvedRefs for consistency and to avoid duplication
    let processedRefs = await readResolvedRefs(resolvedRefs, this.options);
    
    // Now handle circular references and recursive processing
    const finalProcessedRefs: ProcessedReference[] = [];
    
    for (const processed of processedRefs) {
      const { ref, resolved, content, error } = processed;
      
      if (resolved.exists && content !== undefined) {
        // Track processed files
        this.processedFiles.add(resolved.absolutePath);
        
        // Check for circular reference
        if (visitedStack.has(resolved.absolutePath)) {
          const circularPath = Array.from(visitedStack).join(' → ') + ' → ' + resolved.absolutePath;
          const circularError: TransclusionError = {
            message: `Circular reference detected: ${circularPath}`,
            path: resolved.absolutePath,
            code: 'CIRCULAR_REFERENCE'
          };
          this.errors.push(circularError);
          finalProcessedRefs.push({ ref, resolved, error: circularError });
          continue;
        }
        
        // Strip frontmatter if requested (if not already done)
        let processedContent = content;
        if (this.options.stripFrontmatter && !content.startsWith('---') && !content.startsWith('+++')) {
          processedContent = stripFrontmatter(content);
        }
        
        // Create new visited stack for this branch
        const newVisitedStack = new Set(visitedStack);
        newVisitedStack.add(resolved.absolutePath);
        
        // Recursively process the content
        const recursiveContent = await this.processContentRecursively(
          processedContent,
          depth + 1,
          newVisitedStack,
          resolved.absolutePath
        );
        
        finalProcessedRefs.push({
          ref,
          resolved,
          content: recursiveContent
        });
      } else {
        // Pass through errors
        finalProcessedRefs.push(processed);
      }
    }
    
    // Collect errors
    const errors = extractErrors(finalProcessedRefs);
    this.errors.push(...errors);
    
    // Compose output
    return composeLineOutput(line, finalProcessedRefs);
  }
  
  /**
   * Process content recursively, handling line-by-line transclusions
   */
  private async processContentRecursively(
    content: string,
    depth: number,
    visitedStack: Set<string>,
    parentPath: string
  ): Promise<string> {
    const lines = content.split('\n');
    const processedLines: string[] = [];
    
    for (const line of lines) {
      const processedLine = await this.processLineWithDepth(line, depth, visitedStack, parentPath);
      processedLines.push(processedLine);
    }
    
    return processedLines.join('\n');
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