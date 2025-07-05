/**
 * Core utility functions that are self-contained within the core directory
 * These functions are created to avoid external dependencies for Docker builds
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const readFileAsync = promisify(fs.readFile);
const statAsync = promisify(fs.stat);

// =============================================================================
// FILE READING UTILITIES
// =============================================================================

/**
 * File read result with content
 */
export interface FileReadResult {
  content: string;
  size: number;
}

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
 * Result type for safe operations
 */
export type Result<T, E> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Create success result
 */
export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * Create error result
 */
export function Err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * File validation error
 */
export interface FileValidationError {
  message: string;
  code: FileReaderErrorCode;
  path: string;
}

/**
 * Safe file reading that returns Result instead of throwing
 */
export async function safeReadFile(
  filepath: string,
  encoding: BufferEncoding = 'utf8',
  maxSize: number = 1024 * 1024
): Promise<Result<FileReadResult, FileValidationError>> {
  try {
    // Get file stats
    const stats = await statAsync(filepath);
    
    // Check if it's a file
    if (!stats.isFile()) {
      return Err({
        message: `Path is not a file: ${filepath}`,
        code: FileReaderErrorCode.NOT_A_FILE,
        path: filepath
      });
    }
    
    // Check file size
    if (stats.size > maxSize) {
      return Err({
        message: `File too large: ${stats.size} bytes (max: ${maxSize})`,
        code: FileReaderErrorCode.FILE_TOO_LARGE,
        path: filepath
      });
    }
    
    // Read file content
    const buffer = await readFileAsync(filepath);
    
    // Process content
    let content = buffer.toString(encoding);
    
    // Strip BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    
    return Ok({
      content,
      size: buffer.length
    });
    
  } catch (error: any) {
    let code = FileReaderErrorCode.FILE_NOT_FOUND;
    let message = `Failed to read file: ${filepath}`;
    
    if (error.code === 'ENOENT') {
      code = FileReaderErrorCode.FILE_NOT_FOUND;
      message = `File not found: ${filepath}`;
    } else if (error.code === 'EACCES') {
      code = FileReaderErrorCode.PERMISSION_DENIED;
      message = `Permission denied: ${filepath}`;
    } else if (error.code === 'EISDIR') {
      code = FileReaderErrorCode.NOT_A_FILE;
      message = `Path is a directory: ${filepath}`;
    }
    
    return Err({
      message,
      code,
      path: filepath
    });
  }
}

/**
 * Synchronous version of safeReadFile
 */
export function safeReadFileSync(
  filepath: string,
  encoding: BufferEncoding = 'utf8',
  maxSize: number = 1024 * 1024
): Result<FileReadResult, FileValidationError> {
  try {
    const stats = fs.statSync(filepath);
    
    if (!stats.isFile()) {
      return Err({
        message: `Path is not a file: ${filepath}`,
        code: FileReaderErrorCode.NOT_A_FILE,
        path: filepath
      });
    }
    
    if (stats.size > maxSize) {
      return Err({
        message: `File too large: ${stats.size} bytes (max: ${maxSize})`,
        code: FileReaderErrorCode.FILE_TOO_LARGE,
        path: filepath
      });
    }
    
    const buffer = fs.readFileSync(filepath);
    let content = buffer.toString(encoding);
    
    // Strip BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    
    return Ok({
      content,
      size: buffer.length
    });
    
  } catch (error: any) {
    let code = FileReaderErrorCode.FILE_NOT_FOUND;
    let message = `Failed to read file: ${filepath}`;
    
    if (error.code === 'ENOENT') {
      code = FileReaderErrorCode.FILE_NOT_FOUND;
      message = `File not found: ${filepath}`;
    } else if (error.code === 'EACCES') {
      code = FileReaderErrorCode.PERMISSION_DENIED;
      message = `Permission denied: ${filepath}`;
    } else if (error.code === 'EISDIR') {
      code = FileReaderErrorCode.NOT_A_FILE;
      message = `Path is a directory: ${filepath}`;
    }
    
    return Err({
      message,
      code,
      path: filepath
    });
  }
}

// =============================================================================
// PATH RESOLUTION UTILITIES
// =============================================================================

/**
 * Path resolution error
 */
export interface PathResolutionError {
  message: string;
  errorCode: number;
}

/**
 * Validate reference path
 */
export function validateReferencePath(reference: string): Result<string, PathResolutionError> {
  if (!reference || reference.trim() === '') {
    return Err({
      message: 'Reference path cannot be empty',
      errorCode: 400
    });
  }
  
  // Check for invalid characters (basic validation)
  if (reference.includes('\0')) {
    return Err({
      message: 'Reference path contains invalid characters',
      errorCode: 400
    });
  }
  
  return Ok(reference.trim());
}

/**
 * Validate path is within base directory (security check)
 */
export function validateWithinBase(
  absolutePath: string, 
  basePath: string, 
  relativePath: string
): Result<string, PathResolutionError> {
  const resolvedBase = path.resolve(basePath);
  const resolvedPath = path.resolve(absolutePath);
  
  if (!resolvedPath.startsWith(resolvedBase + path.sep) && resolvedPath !== resolvedBase) {
    return Err({
      message: `Path traversal detected: ${relativePath} resolves outside base directory`,
      errorCode: 403
    });
  }
  
  return Ok(resolvedPath);
}

/**
 * Find existing file from a list of paths
 */
export function findExistingFile(paths: string[], searchBase: string): { absolutePath: string } | null {
  for (const relativePath of paths) {
    const absolutePath = path.resolve(searchBase, relativePath);
    
    try {
      const stats = fs.statSync(absolutePath);
      if (stats.isFile()) {
        return { absolutePath };
      }
    } catch {
      // File doesn't exist, continue
    }
  }
  
  return null;
}

/**
 * Resolve to absolute path
 */
export function resolveToAbsolutePath(relativePath: string, basePath: string): string {
  if (path.isAbsolute(relativePath)) {
    return relativePath;
  }
  return path.resolve(basePath, relativePath);
}

/**
 * Substitute variables in path
 */
export function substituteVariables(
  pathStr: string, 
  variables: Record<string, string>, 
  strict: boolean = false
): string {
  return pathStr.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    if (varName in variables) {
      return variables[varName];
    }
    
    if (strict) {
      throw new Error(`Undefined variable: ${varName}`);
    }
    
    return match; // Return original if not found
  });
}

/**
 * Resolve extensions for a path
 */
export function resolveExtensions(pathStr: string, extensions: string[]): string[] {
  // If path already has an extension, just return it
  if (path.extname(pathStr)) {
    return [pathStr];
  }
  
  // Try with each extension
  return extensions.map(ext => pathStr + ext);
}

// =============================================================================
// PARSER UTILITIES
// =============================================================================

/**
 * Token found in parsing
 */
export interface Token {
  startIndex: number;
  endIndex: number;
  content: string;
}

/**
 * Create character mask for parsing
 */
export function createCharacterMask(length: number): boolean[] {
  return new Array(length).fill(false);
}

/**
 * Mask inline code sections
 */
export function maskInlineCode(line: string, mask: boolean[]): void {
  let inCode = false;
  let i = 0;
  
  while (i < line.length) {
    if (line[i] === '`') {
      inCode = !inCode;
      mask[i] = true;
    } else if (inCode) {
      mask[i] = true;
    }
    i++;
  }
}

/**
 * Mask HTML comments
 */
export function maskHtmlComments(line: string, mask: boolean[]): void {
  const commentStart = '<!--';
  const commentEnd = '-->';
  
  let searchIndex = 0;
  
  while (searchIndex < line.length) {
    const startIndex = line.indexOf(commentStart, searchIndex);
    if (startIndex === -1) break;
    
    const endIndex = line.indexOf(commentEnd, startIndex + commentStart.length);
    if (endIndex === -1) {
      // Comment extends to end of line
      for (let i = startIndex; i < line.length; i++) {
        mask[i] = true;
      }
      break;
    } else {
      // Complete comment
      for (let i = startIndex; i <= endIndex + commentEnd.length - 1; i++) {
        mask[i] = true;
      }
      searchIndex = endIndex + commentEnd.length;
    }
  }
}

/**
 * Find transclusion tokens in line
 */
export function findTransclusionTokens(line: string): Token[] {
  const tokens: Token[] = [];
  const pattern = /!\[\[([^\]]+)\]\]/g;
  let match;
  
  while ((match = pattern.exec(line)) !== null) {
    tokens.push({
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      content: match[1]
    });
  }
  
  return tokens;
}

/**
 * Check if position is masked
 */
export function isMasked(mask: boolean[], index: number): boolean {
  return mask[index] || false;
}

/**
 * Create reference from token
 */
export function createReferenceFromToken(token: Token): any {
  const content = token.content;
  
  // Split on # to separate path and heading
  const parts = content.split('#');
  const pathPart = parts[0];
  const headingPart = parts[1];
  
  // Check for range syntax (heading1#heading2)
  let heading: string | undefined;
  let endHeading: string | undefined;
  
  if (headingPart) {
    const headingParts = headingPart.split('#');
    heading = headingParts[0] || undefined;
    endHeading = headingParts[1] || undefined;
  }
  
  return {
    original: `![[${content}]]`,
    path: pathPart,
    startIndex: token.startIndex,
    endIndex: token.endIndex,
    heading,
    endHeading
  };
}