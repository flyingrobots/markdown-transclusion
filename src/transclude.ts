import { LineTranscluder } from './utils/LineTranscluder';
import { readFile } from './fileReader';
import type {
  TransclusionOptions,
  TransclusionError,
  TransclusionResult
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

/**
 * Process a complete Markdown string, replacing all transclusion references with file contents.
 * This is a convenience function for simple use cases.
 * @param input - The input Markdown string.
 * @param options - Transclusion options.
 * @returns Promise resolving to the processed content with all transclusions resolved.
 */
export async function transclude(
  input: string,
  options: TransclusionOptions = {}
): Promise<TransclusionResult> {
  const transcluder = new LineTranscluder(options);
  
  // Split input into lines and process each
  const lines = input.split(/\r?\n/);
  const outputLines: string[] = [];
  
  for (const line of lines) {
    const processedLine = await transcluder.processLine(line);
    outputLines.push(processedLine);
  }
  
  // Get processed files from the transcluder (accessing private property)
  const processedFilesSet = (transcluder as any).processedFiles as Set<string> || new Set<string>();
  const processedFiles = Array.from(processedFilesSet);
  
  return {
    content: outputLines.join('\n'),
    errors: transcluder.getErrors(),
    processedFiles
  };
}

/**
 * Process a Markdown file, replacing all transclusion references with file contents.
 * This is a convenience function for file-based workflows.
 * @param filePath - Path to the Markdown file to process.
 * @param options - Transclusion options.
 * @returns Promise resolving to the processed content with all transclusions resolved.
 */
export async function transcludeFile(
  filePath: string,
  options: TransclusionOptions = {}
): Promise<TransclusionResult> {
  // Read the file content
  const content = await readFile(filePath, options.cache);
  
  // Use the file's directory as the base path if not specified
  const path = await import('path');
  const resolvedOptions: TransclusionOptions = {
    ...options,
    basePath: options.basePath || path.dirname(path.resolve(filePath))
  };
  
  // Process the content
  const result = await transclude(content, resolvedOptions);
  
  // Add the source file to processedFiles
  result.processedFiles.unshift(path.resolve(filePath));
  
  return result;
}