import { LineTranscluder } from './utils/LineTranscluder';
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
 * Now uses LineTranscluder for recursive processing with circular reference detection.
 * @param line - The input line.
 * @param options - Transclusion options.
 * @returns Processed result and collected errors.
 */
export async function processLine(
  line: string,
  options: TransclusionOptions
): Promise<TransclusionLineResult> {
  const transcluder = new LineTranscluder(options);
  const output = await transcluder.processLine(line);
  return {
    output,
    errors: transcluder.getErrors()
  };
}