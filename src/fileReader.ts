import * as fs from 'fs';
import { promisify } from 'util';
import type { FileCache } from './types';

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

  try {
    // Check if file exists and is a file
    const stats = await statAsync(path);
    if (!stats.isFile()) {
      throw new FileReaderError(
        FileReaderErrorCode.NOT_A_FILE,
        `Path is not a file: ${path}`
      );
    }

    // Check file size limit
    if (stats.size > MAX_BUFFERED_FILE_SIZE) {
      throw new FileReaderError(
        FileReaderErrorCode.FILE_TOO_LARGE,
        `File too large for buffered reading (${stats.size} bytes > ${MAX_BUFFERED_FILE_SIZE} bytes). Streaming support coming in later commits.`
      );
    }

    // Read the file
    const buffer = await readFileAsync(path);
    
    // Check for binary content
    if (isBinaryContent(buffer)) {
      throw new FileReaderError(
        FileReaderErrorCode.BINARY_FILE,
        `Binary files are not supported: ${path}`
      );
    }

    // Convert to string with specified encoding
    let content = buffer.toString(encoding);
    
    // Handle BOM (Byte Order Mark)
    content = stripBOM(content);

    // Cache the content
    if (cache) {
      cache.set(path, content);
    }

    return content;

  } catch (error) {
    // Handle specific errors
    if (error instanceof FileReaderError) {
      throw error;
    }
    
    if (error && typeof error === 'object' && 'code' in error) {
      const nodeError = error as NodeJS.ErrnoException;
      
      if (nodeError.code === 'ENOENT') {
        throw new FileReaderError(
          FileReaderErrorCode.FILE_NOT_FOUND,
          `File not found: ${path}`
        );
      }
      
      if (nodeError.code === 'EACCES' || nodeError.code === 'EPERM') {
        throw new FileReaderError(
          FileReaderErrorCode.PERMISSION_DENIED,
          `Permission denied: ${path}`
        );
      }
    }
    
    // Re-throw unknown errors
    throw error;
  }
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

  try {
    // Check if file exists and is a file
    const stats = fs.statSync(path);
    if (!stats.isFile()) {
      throw new FileReaderError(
        FileReaderErrorCode.NOT_A_FILE,
        `Path is not a file: ${path}`
      );
    }

    // Check file size limit
    if (stats.size > MAX_BUFFERED_FILE_SIZE) {
      throw new FileReaderError(
        FileReaderErrorCode.FILE_TOO_LARGE,
        `File too large for buffered reading (${stats.size} bytes > ${MAX_BUFFERED_FILE_SIZE} bytes). Streaming support coming in later commits.`
      );
    }

    // Read the file
    const buffer = fs.readFileSync(path);
    
    // Check for binary content
    if (isBinaryContent(buffer)) {
      throw new FileReaderError(
        FileReaderErrorCode.BINARY_FILE,
        `Binary files are not supported: ${path}`
      );
    }

    // Convert to string with specified encoding
    let content = buffer.toString(encoding);
    
    // Handle BOM
    content = stripBOM(content);

    // Cache the content
    if (cache) {
      cache.set(path, content);
    }

    return content;

  } catch (error) {
    // Handle specific errors
    if (error instanceof FileReaderError) {
      throw error;
    }
    
    if (error && typeof error === 'object' && 'code' in error) {
      const nodeError = error as NodeJS.ErrnoException;
      
      if (nodeError.code === 'ENOENT') {
        throw new FileReaderError(
          FileReaderErrorCode.FILE_NOT_FOUND,
          `File not found: ${path}`
        );
      }
      
      if (nodeError.code === 'EACCES' || nodeError.code === 'EPERM') {
        throw new FileReaderError(
          FileReaderErrorCode.PERMISSION_DENIED,
          `Permission denied: ${path}`
        );
      }
    }
    
    // Re-throw unknown errors
    throw error;
  }
}

/**
 * Check if buffer contains binary content (for complete file buffers only)
 * @param buffer The complete file buffer
 * @returns True if binary content detected
 */
function isBinaryContent(buffer: Buffer): boolean {
  // Quick check for null bytes - definitive binary indicator
  if (buffer.includes(0)) {
    return true;
  }
  
  // Validate UTF-8 encoding using TextDecoder
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    decoder.decode(buffer);
    return false; // Valid UTF-8 text
  } catch {
    return true; // Invalid UTF-8, treat as binary
  }
}

/**
 * Strip BOM (Byte Order Mark) from string
 * @param content The content to strip BOM from
 * @returns Content without BOM
 */
function stripBOM(content: string): string {
  // UTF-8 BOM
  if (content.charCodeAt(0) === 0xFEFF) {
    return content.slice(1);
  }
  
  // UTF-16 BE BOM
  if (content.charCodeAt(0) === 0xFEFE) {
    return content.slice(1);
  }
  
  // UTF-16 LE BOM  
  if (content.charCodeAt(0) === 0xFFFE) {
    return content.slice(1);
  }
  
  return content;
}