import { parseTransclusionReferences } from './parser';
import { resolvePath } from './resolver';
import { readFile } from './fileReader';
import type {
  TransclusionOptions,
  TransclusionError,
  ParsedReference
} from './types';

export interface TransclusionLineResult {
  output: string;
  errors: TransclusionError[];
}

/**
 * Process a single line of Markdown, replacing transclusion references with file contents.
 * @param line - The input line.
 * @param options - Transclusion options.
 * @returns Processed result and collected errors.
 */
export async function processLine(
  line: string,
  options: TransclusionOptions
): Promise<TransclusionLineResult> {
  const refs = parseTransclusionReferences(line);

  // If no transclusion references, just return the line untouched
  if (refs.length === 0) {
    return { output: line, errors: [] };
  }

  let cursor = 0;
  let output = '';
  const errors: TransclusionError[] = [];

  for (const ref of refs) {
    output += line.slice(cursor, ref.startIndex);
    cursor = ref.endIndex;

    const resolved = resolvePath(ref.path, options);

    if (resolved.exists) {
      try {
        const content = await readFile(resolved.absolutePath, options.cache);
        output += content.trim();
      } catch (err) {
        errors.push({
          message: (err as Error).message,
          path: resolved.absolutePath,
          code: 'READ_ERROR'
        });
        output += `<!-- Error: ${ref.original} -->`;
      }
    } else {
      errors.push({
        message: resolved.error ?? 'Unknown path resolution error',
        path: ref.path,
        code: 'RESOLVE_ERROR'
      });
      output += `<!-- Missing: ${ref.path} -->`;
    }
  }

  output += line.slice(cursor);
  return { output, errors };
}