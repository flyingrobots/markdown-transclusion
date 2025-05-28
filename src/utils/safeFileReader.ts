import * as fs from 'fs';
import { promisify } from 'util';
import { Result, Ok, Err, andThen } from './result';
import { 
  validateIsFile, 
  validateFileSize, 
  validateNotBinary,
  validateAll,
  FileValidationError 
} from './fileValidation';
import { processFileContent } from './contentProcessing';
import { FileReaderError, FileReaderErrorCode } from '../fileReader';

const readFileAsync = promisify(fs.readFile);
const statAsync = promisify(fs.stat);

// Maximum file size for buffered reading (1MB)
const MAX_BUFFERED_FILE_SIZE = 1024 * 1024;

/**
 * File read result with content
 */
export interface FileReadResult {
  content: string;
  size: number;
}

/**
 * Safe file reading that returns Result instead of throwing
 */
export async function safeReadFile(
  path: string,
  encoding: BufferEncoding = 'utf8',
  maxSize: number = MAX_BUFFERED_FILE_SIZE
): Promise<Result<FileReadResult, FileValidationError>> {
  try {
    // Get file stats
    const stats = await statAsync(path);
    
    // Validate file
    const validationResult = validateAll(
      validateIsFile(stats, path),
      validateFileSize(stats, path, maxSize)
    );
    
    if (!validationResult.ok) {
      return validationResult;
    }
    
    // Read file content
    const buffer = await readFileAsync(path);
    
    // Validate content is not binary
    const binaryCheck = validateNotBinary(buffer, path);
    if (!binaryCheck.ok) {
      return binaryCheck;
    }
    
    // Process content
    const content = processFileContent(buffer, encoding);
    
    return Ok({
      content,
      size: stats.size
    });
    
  } catch (error) {
    // Handle system errors
    if (error && typeof error === 'object' && 'code' in error) {
      const nodeError = error as NodeJS.ErrnoException;
      
      if (nodeError.code === 'ENOENT') {
        return Err({
          code: FileReaderErrorCode.FILE_NOT_FOUND,
          message: `File not found: ${path}`,
          path
        });
      }
      
      if (nodeError.code === 'EACCES' || nodeError.code === 'EPERM') {
        return Err({
          code: FileReaderErrorCode.PERMISSION_DENIED,
          message: `Permission denied: ${path}`,
          path
        });
      }
    }
    
    // Unknown error
    return Err({
      code: FileReaderErrorCode.ENCODING_ERROR,
      message: `Error reading file: ${error}`,
      path
    });
  }
}

/**
 * Safe synchronous file reading
 */
export function safeReadFileSync(
  path: string,
  encoding: BufferEncoding = 'utf8',
  maxSize: number = MAX_BUFFERED_FILE_SIZE
): Result<FileReadResult, FileValidationError> {
  try {
    // Get file stats
    const stats = fs.statSync(path);
    
    // Validate file
    const validationResult = validateAll(
      validateIsFile(stats, path),
      validateFileSize(stats, path, maxSize)
    );
    
    if (!validationResult.ok) {
      return validationResult;
    }
    
    // Read file content
    const buffer = fs.readFileSync(path);
    
    // Validate content is not binary
    const binaryCheck = validateNotBinary(buffer, path);
    if (!binaryCheck.ok) {
      return binaryCheck;
    }
    
    // Process content
    const content = processFileContent(buffer, encoding);
    
    return Ok({
      content,
      size: stats.size
    });
    
  } catch (error) {
    // Handle system errors
    if (error && typeof error === 'object' && 'code' in error) {
      const nodeError = error as NodeJS.ErrnoException;
      
      if (nodeError.code === 'ENOENT') {
        return Err({
          code: FileReaderErrorCode.FILE_NOT_FOUND,
          message: `File not found: ${path}`,
          path
        });
      }
      
      if (nodeError.code === 'EACCES' || nodeError.code === 'EPERM') {
        return Err({
          code: FileReaderErrorCode.PERMISSION_DENIED,
          message: `Permission denied: ${path}`,
          path
        });
      }
    }
    
    // Unknown error
    return Err({
      code: FileReaderErrorCode.ENCODING_ERROR,
      message: `Error reading file: ${error}`,
      path
    });
  }
}