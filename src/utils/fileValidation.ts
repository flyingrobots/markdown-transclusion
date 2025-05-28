import { Stats } from 'fs';
import { Result, Ok, Err } from './result';
import { FileReaderError, FileReaderErrorCode } from '../fileReader';

/**
 * Validation result for file checks
 */
export interface FileValidationError {
  code: FileReaderErrorCode;
  message: string;
  path: string;
}

/**
 * Validate that a path points to a regular file
 */
export function validateIsFile(
  stats: Stats, 
  path: string
): Result<void, FileValidationError> {
  if (!stats.isFile()) {
    return Err({
      code: FileReaderErrorCode.NOT_A_FILE,
      message: `Path is not a file: ${path}`,
      path
    });
  }
  return Ok(undefined);
}

/**
 * Validate file size is within acceptable limits
 */
export function validateFileSize(
  stats: Stats,
  path: string,
  maxSize: number
): Result<void, FileValidationError> {
  if (stats.size > maxSize) {
    return Err({
      code: FileReaderErrorCode.FILE_TOO_LARGE,
      message: `File too large for buffered reading (${stats.size} bytes > ${maxSize} bytes)`,
      path
    });
  }
  return Ok(undefined);
}

/**
 * Check if buffer contains binary content
 */
export function isBinaryContent(buffer: Buffer): boolean {
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
 * Validate that content is not binary
 */
export function validateNotBinary(
  buffer: Buffer,
  path: string
): Result<void, FileValidationError> {
  if (isBinaryContent(buffer)) {
    return Err({
      code: FileReaderErrorCode.BINARY_FILE,
      message: `Binary files are not supported: ${path}`,
      path
    });
  }
  return Ok(undefined);
}

/**
 * Combine multiple validation results
 */
export function validateAll(
  ...validations: Result<void, FileValidationError>[]
): Result<void, FileValidationError> {
  for (const validation of validations) {
    if (!validation.ok) {
      return validation;
    }
  }
  return Ok(undefined);
}