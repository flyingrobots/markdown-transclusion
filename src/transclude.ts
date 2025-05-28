import {
  parseAndResolveRefs,
  readResolvedRefs,
  composeLineOutput,
  extractErrors
} from './utils/transclusionProcessor';
import type {
  TransclusionOptions,
  TransclusionError
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
  // Step 1: Parse and resolve references
  const resolvedRefs = parseAndResolveRefs(line, options);
  
  // If no transclusion references, just return the line untouched
  if (resolvedRefs.length === 0) {
    return { output: line, errors: [] };
  }
  
  // Step 2: Read content for resolved references
  const processedRefs = await readResolvedRefs(resolvedRefs, options);
  
  // Step 3: Compose the output line
  const output = composeLineOutput(line, processedRefs);
  
  // Step 4: Extract errors
  const errors = extractErrors(processedRefs);
  
  return { output, errors };
}