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
  options: TransclusionOptions
): ResolvedReference[] {
  const refs = parseTransclusionReferences(line);
  
  return refs.map(ref => ({
    ref,
    resolved: resolvePath(ref.path, options)
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
        const content = await readFile(resolved.absolutePath, options.cache);
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
          message: resolved.error ?? 'Unknown path resolution error',
          path: ref.path,
          code: 'RESOLVE_ERROR'
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
    } else if (error?.code === 'READ_ERROR') {
      output += `<!-- Error: ${ref.original} -->`;
    } else {
      output += `<!-- Missing: ${ref.path} -->`;
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