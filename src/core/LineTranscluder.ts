import {
  parseAndResolveRefs,
  composeLineOutput,
  extractErrors,
  readResolvedRefs
} from './transclusionProcessor';
import type { TransclusionOptions } from './types';
import type { TransclusionError } from './errors';
import type { FileCache } from './cache';
import { stripFrontmatter } from './contentProcessing';

/**
 * Core transclusion processor for handling line-by-line transclusion
 * This is the plugin-free version focused solely on transclusion logic
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
   * Process line with depth tracking and circular reference detection
   */
  private async processLineWithDepth(
    line: string,
    depth: number,
    visitedInChain: Set<string>,
    contextPath?: string
  ): Promise<string> {
    // Check max depth
    if (depth > this.maxDepth) {
      this.errors.push({
        message: `Maximum transclusion depth (${this.maxDepth}) exceeded`,
        path: contextPath || 'unknown',
        code: 'MAX_DEPTH_EXCEEDED'
      });
      return line;
    }
    
    // Parse and resolve references  
    const resolvedRefs = parseAndResolveRefs(line, this.options, contextPath);
    
    // Read file contents
    const refsWithContent = await readResolvedRefs(resolvedRefs, this.options);
    
    // Process each reference
    for (const ref of refsWithContent) {
      if (ref.resolved.exists) {
        // Check for circular reference
        if (visitedInChain.has(ref.resolved.absolutePath)) {
          this.errors.push({
            message: `Circular reference detected: ${ref.resolved.absolutePath}`,
            path: ref.resolved.absolutePath,
            code: 'CIRCULAR_REFERENCE'
          });
          // Mark as error and continue
          ref.content = undefined;
          ref.error = {
            message: `Circular reference detected: ${ref.resolved.absolutePath}`,
            path: ref.resolved.absolutePath,
            code: 'CIRCULAR_REFERENCE'
          };
          continue;
        }
        
        // Process the transcluded content
        if (ref.content) {
          this.visitedFiles.add(ref.resolved.absolutePath);
          
          // Strip frontmatter if requested
          let processedContent = this.options.stripFrontmatter
            ? stripFrontmatter(ref.content)
            : ref.content;
          
          // If it contains nested transclusions, process them recursively
          if (processedContent.includes('![[')) {
            const newVisitedInChain = new Set(visitedInChain);
            newVisitedInChain.add(ref.resolved.absolutePath);
            
            const lines = processedContent.split(/\r?\n/);
            const processedLines: string[] = [];
            
            for (const nestedLine of lines) {
              const processedNestedLine = await this.processLineWithDepth(
                nestedLine,
                depth + 1,
                newVisitedInChain,
                ref.resolved.absolutePath
              );
              processedLines.push(processedNestedLine);
            }
            
            processedContent = processedLines.join('\n');
          }
          
          // Update the reference with processed content
          ref.content = processedContent.trim();
          this.processedFiles.add(ref.resolved.absolutePath);
        }
      }
    }
    
    // Extract errors and compose output
    this.errors.push(...extractErrors(refsWithContent));
    return composeLineOutput(line, refsWithContent);
  }
  
  /**
   * Get all errors collected during processing
   */
  getErrors(): TransclusionError[] {
    return [...this.errors];
  }
  
  /**
   * Clear errors
   */
  clearErrors(): void {
    this.errors = [];
  }
  
  /**
   * Get processed files
   */
  getProcessedFiles(): Set<string> {
    return new Set(this.processedFiles);
  }
  
  /**
   * Get cache statistics if cache is available
   */
  getCacheStats() {
    return this.cache?.stats() || { size: 0, hits: 0, misses: 0 };
  }
}