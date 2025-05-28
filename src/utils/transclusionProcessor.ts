import type {
  TransclusionToken,
  FileResolution,
  TransclusionOptions,
  TransclusionError
} from '../types';
import { parseTransclusionReferences } from '../parser';
import { resolvePath } from '../resolver';
import { readFile } from '../fileReader';
import { trimForTransclusion } from './contentProcessing';
import { extractHeadingContent } from './headingExtractor';

/**
 * Reference with its resolved path information
 */
export interface ResolvedReference {
  ref: TransclusionToken;
  resolved: FileResolution;
}

/**
 * Reference with its content or error
 */
export interface ProcessedReference {
  ref: TransclusionToken;
  resolved: FileResolution;
  content?: string;
  error?: TransclusionError;
}

/**
 * Parse and resolve all transclusion references in a line
 */
export function parseAndResolveRefs(
  line: string,
  options: TransclusionOptions,
  parentPath?: string
): ResolvedReference[] {
  const refs = parseTransclusionReferences(line);
  
  return refs.map(ref => ({
    ref,
    resolved: resolvePath(ref.path, { ...options, parentPath })
  }));
}

/**
 * Read content for resolved references
 */
export async function readResolvedRefs(
  resolvedRefs: ResolvedReference[],
  options: TransclusionOptions
): Promise<ProcessedReference[]> {
  const results: ProcessedReference[] = [];
  
  for (const { ref, resolved } of resolvedRefs) {
    if (resolved.exists) {
      try {
        let content = await readFile(resolved.absolutePath, options.cache);
        
        // Extract specific heading if requested
        if (ref.heading) {
          const headingContent = extractHeadingContent(content, ref.heading);
          if (headingContent === null) {
            results.push({
              ref,
              resolved,
              error: {
                message: `Heading "${ref.heading}" not found in ${resolved.absolutePath}`,
                path: resolved.absolutePath,
                code: 'HEADING_NOT_FOUND'
              }
            });
            continue;
          }
          content = headingContent;
        }
        
        results.push({
          ref,
          resolved,
          content: trimForTransclusion(content)
        });
      } catch (err) {
        results.push({
          ref,
          resolved,
          error: {
            message: (err as Error).message,
            path: resolved.absolutePath,
            code: 'READ_ERROR'
          }
        });
      }
    } else {
      results.push({
        ref,
        resolved,
        error: {
          message: resolved.error ?? 'File not found',
          path: ref.path,
          code: 'FILE_NOT_FOUND'
        }
      });
    }
  }
  
  return results;
}

/**
 * Compose the final output line from original line and processed references
 */
export function composeLineOutput(
  line: string,
  processedRefs: ProcessedReference[]
): string {
  if (processedRefs.length === 0) {
    return line;
  }
  
  let cursor = 0;
  let output = '';
  
  for (const processed of processedRefs) {
    const { ref, content, error } = processed;
    
    // Add text before this reference
    output += line.slice(cursor, ref.startIndex);
    cursor = ref.endIndex;
    
    // Add replacement content or error placeholder
    if (content !== undefined) {
      output += content;
    } else if (error) {
      output += `<!-- Error: ${error.message} -->`;
    } else {
      output += `<!-- Error: Could not transclude ${ref.path} -->`;
    }
  }
  
  // Add remaining text after last reference
  output += line.slice(cursor);
  
  return output;
}

/**
 * Extract all errors from processed references
 */
export function extractErrors(processedRefs: ProcessedReference[]): TransclusionError[] {
  return processedRefs
    .filter(p => p.error !== undefined)
    .map(p => p.error!);
}