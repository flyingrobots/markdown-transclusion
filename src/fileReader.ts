import * as fs from 'fs';
import { promisify } from 'util';
import type { FileCache } from './types';
import { safeReadFile, safeReadFileSync } from './utils/safeFileReader';
import { unwrap } from './utils/result';
import { FileValidationError } from './utils/fileValidation';

const readFileAsync = promisify(fs.readFile);
const statAsync = promisify(fs.stat);

// Maximum file size for buffered reading (1MB)
// Larger files should use streaming (to be implemented in later commits)
const MAX_BUFFERED_FILE_SIZE = 1024 * 1024;

/**
 * Error codes for file reading
 */
export enum FileReaderErrorCode {
  FILE_NOT_FOUND = 2001,
  NOT_A_FILE = 2002,
  PERMISSION_DENIED = 2003,
  ENCODING_ERROR = 2004,
  BINARY_FILE = 2005,
  FILE_TOO_LARGE = 2006
}

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
export { safeReadFile, safeReadFileSync } from './utils/safeFileReader';
export type { FileReadResult } from './utils/safeFileReader';
export type { FileValidationError } from './utils/fileValidation';