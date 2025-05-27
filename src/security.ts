import * as path from 'path';

/**
 * Security error codes enum
 */
export enum SecurityErrorCode {
  ABSOLUTE_PATH = 1001,
  PATH_TRAVERSAL = 1002,
  NULL_BYTE = 1003,
  INVALID_CHARACTERS = 1004,
  OUTSIDE_BASE = 1005
}

/**
 * Get error message for a security error code
 * Using switch for best performance with numeric comparison
 */
function getSecurityErrorMessage(code: SecurityErrorCode): string {
  switch (code) {
    case SecurityErrorCode.ABSOLUTE_PATH:
      return 'Absolute paths are not allowed';
    case SecurityErrorCode.PATH_TRAVERSAL:
      return 'Path traversal attempts are not allowed';
    case SecurityErrorCode.NULL_BYTE:
      return 'Null bytes in paths are not allowed';
    case SecurityErrorCode.INVALID_CHARACTERS:
      return 'Invalid characters in path';
    case SecurityErrorCode.OUTSIDE_BASE:
      return 'Path resolves outside of base directory';
    default:
      return 'Unknown security error';
  }
}

/**
 * Security validation error
 */
export class SecurityError extends Error {
  code: SecurityErrorCode;
  
  constructor(code: SecurityErrorCode) {
    super(getSecurityErrorMessage(code));
    this.name = 'SecurityError';
    this.code = code;
  }
}

/**
 * Validate a path for security issues
 * @param filePath The path to validate
 * @returns True if path is safe, throws error if not
 */
export function validatePath(filePath: string): boolean {
  // Check for null bytes
  if (filePath.includes('\0')) {
    throw new SecurityError(SecurityErrorCode.NULL_BYTE);
  }

  // Check for absolute paths
  if (path.isAbsolute(filePath)) {
    throw new SecurityError(SecurityErrorCode.ABSOLUTE_PATH);
  }

  // Check for Windows absolute paths (C:\, D:\, etc)
  if (/^[a-zA-Z]:[/\\]/.test(filePath)) {
    throw new SecurityError(SecurityErrorCode.ABSOLUTE_PATH);
  }

  // Check for UNC paths (\\server\share or //server/share)
  if (/^[/\\]{2}/.test(filePath)) {
    throw new SecurityError(SecurityErrorCode.ABSOLUTE_PATH);
  }

  // Normalize the path to resolve . and .. segments
  const normalized = path.normalize(filePath);

  // Check for path traversal attempts
  // After normalization, any remaining .. at the start means traversal
  if (normalized.startsWith('..')) {
    throw new SecurityError(SecurityErrorCode.PATH_TRAVERSAL);
  }

  // Check for path traversal in the middle (shouldn't happen after normalize, but be safe)
  if (normalized.includes('../') || normalized.includes('..\\')) {
    throw new SecurityError(SecurityErrorCode.PATH_TRAVERSAL);
  }

  // Check for URL-encoded path traversal attempts
  const decoded = decodeURIComponent(filePath);
  if (decoded !== filePath) {
    // If decoding changed the path, check it too
    if (decoded.includes('..') || path.isAbsolute(decoded)) {
      throw new SecurityError(SecurityErrorCode.PATH_TRAVERSAL);
    }
  }

  // Additional checks for encoded variants
  const encodedVariants = [
    '%2e%2e%2f', '%2e%2e/', '..%2f', '%2e%2e%5c', '..%5c',
    '%252e%252e%252f', '%252e%252e%255c'
  ];
  
  const lowerPath = filePath.toLowerCase();
  for (const variant of encodedVariants) {
    if (lowerPath.includes(variant)) {
      throw new SecurityError(SecurityErrorCode.PATH_TRAVERSAL);
    }
  }

  return true;
}

/**
 * Check if a resolved absolute path is within the base directory
 * @param resolvedPath The absolute path to check
 * @param basePath The base directory path
 * @returns True if path is within base directory
 */
export function isWithinBasePath(resolvedPath: string, basePath: string): boolean {
  // Normalize both paths to handle different separators and resolve symlinks
  const normalizedResolved = path.resolve(resolvedPath);
  const normalizedBase = path.resolve(basePath);

  // Ensure base path ends with separator for accurate comparison
  const baseWithSep = normalizedBase.endsWith(path.sep) 
    ? normalizedBase 
    : normalizedBase + path.sep;

  // Check if resolved path starts with base path
  // This prevents /base/../../etc/passwd from being accepted
  return normalizedResolved === normalizedBase || 
         normalizedResolved.startsWith(baseWithSep);
}

/**
 * Sanitize a file path by removing dangerous characters
 * This is a last resort - prefer validation and rejection
 * @param filePath The path to sanitize
 * @returns Sanitized path
 */
export function sanitizePath(filePath: string): string {
  // Remove null bytes
  let sanitized = filePath.replace(/\0/g, '');
  
  // Remove any control characters
  sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, '');
  
  // Normalize path separators
  sanitized = sanitized.replace(/[/\\]+/g, path.sep);
  
  return sanitized;
}