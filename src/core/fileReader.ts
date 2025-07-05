import type { FileCache } from './cache';
import { safeReadFile, safeReadFileSync, FileReaderErrorCode, type FileReadResult, type FileValidationError } from './coreUtils';

// Maximum file size for buffered reading (1MB)
// Larger files should use streaming (to be implemented in later commits)
const MAX_BUFFERED_FILE_SIZE = 1024 * 1024;

// Re-export error codes from core utils
export { FileReaderErrorCode } from './coreUtils';

/**
 * File reader error
 */
export class FileReaderError extends Error {
  code: FileReaderErrorCode;
  
  constructor(code: FileReaderErrorCode, message: string) {
    super(message);
    this.name = 'FileReaderError';
    this.code = code;
  }
}

/**
 * Read entire file into memory with optional caching (for files < 1MB)
 * NOTE: This buffers the entire file. For larger files, streaming will be implemented in later commits.
 * @param path The file path to read
 * @param cache Optional cache to use
 * @param encoding File encoding (default: utf8)
 * @returns File content as string
 * @throws FileReaderError if file is too large or other errors occur
 */
export async function readFile(
  path: string,
  cache?: FileCache,
  encoding: BufferEncoding = 'utf8'
): Promise<string> {
  // Check cache first
  if (cache) {
    const cached = cache.get(path);
    if (cached) {
      return cached.content;
    }
  }

  // Use safe file reader
  const result = await safeReadFile(path, encoding, MAX_BUFFERED_FILE_SIZE);
  
  if (!result.ok) {
    // Convert validation error to FileReaderError for backward compatibility
    throw new FileReaderError(
      result.error.code,
      result.error.message
    );
  }

  const { content } = result.value;

  // Cache the content
  if (cache) {
    cache.set(path, content);
  }

  return content;
}

/**
 * Read entire file into memory synchronously with optional caching (for files < 1MB)
 * NOTE: This buffers the entire file. For larger files, streaming will be implemented in later commits.
 * @param path The file path to read
 * @param cache Optional cache to use
 * @param encoding File encoding (default: utf8)
 * @returns File content as string
 * @throws FileReaderError if file is too large or other errors occur
 */
export function readFileSync(
  path: string,
  cache?: FileCache,
  encoding: BufferEncoding = 'utf8'
): string {
  // Check cache first
  if (cache) {
    const cached = cache.get(path);
    if (cached) {
      return cached.content;
    }
  }

  // Use safe file reader
  const result = safeReadFileSync(path, encoding, MAX_BUFFERED_FILE_SIZE);
  
  if (!result.ok) {
    // Convert validation error to FileReaderError for backward compatibility
    throw new FileReaderError(
      result.error.code,
      result.error.message
    );
  }

  const { content } = result.value;

  // Cache the content
  if (cache) {
    cache.set(path, content);
  }

  return content;
}

// SRP: Helper functions have been extracted to utils/fileValidation.ts and utils/contentProcessing.ts
// This keeps fileReader.ts focused on the public API and caching concerns

// Re-export safe versions for users who want Result-based error handling
export { safeReadFile, safeReadFileSync } from './coreUtils';
export type { FileReadResult, FileValidationError } from './coreUtils';