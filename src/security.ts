import * as path from 'path';

/**
 * Security error messages
 */
export const SecurityErrors = {
  ABSOLUTE_PATH: 'Absolute paths are not allowed',
  PATH_TRAVERSAL: 'Path traversal attempts are not allowed',
  NULL_BYTE: 'Null bytes in paths are not allowed',
  INVALID_CHARACTERS: 'Invalid characters in path',
  OUTSIDE_BASE: 'Path resolves outside of base directory'
} as const;

/**
 * Validate a path for security issues
 * @param filePath The path to validate
 * @returns True if path is safe, throws error if not
 */
export function validatePath(filePath: string): boolean {
  // Check for null bytes
  if (filePath.includes('\0')) {
    throw new Error(SecurityErrors.NULL_BYTE);
  }

  // Check for absolute paths
  if (path.isAbsolute(filePath)) {
    throw new Error(SecurityErrors.ABSOLUTE_PATH);
  }

  // Check for Windows absolute paths (C:\, D:\, etc)
  if (/^[a-zA-Z]:[/\\]/.test(filePath)) {
    throw new Error(SecurityErrors.ABSOLUTE_PATH);
  }

  // Check for UNC paths (\\server\share or //server/share)
  if (/^[/\\]{2}/.test(filePath)) {
    throw new Error(SecurityErrors.ABSOLUTE_PATH);
  }

  // Normalize the path to resolve . and .. segments
  const normalized = path.normalize(filePath);

  // Check for path traversal attempts
  // After normalization, any remaining .. at the start means traversal
  if (normalized.startsWith('..')) {
    throw new Error(SecurityErrors.PATH_TRAVERSAL);
  }

  // Check for path traversal in the middle (shouldn't happen after normalize, but be safe)
  if (normalized.includes('../') || normalized.includes('..\\')) {
    throw new Error(SecurityErrors.PATH_TRAVERSAL);
  }

  // Check for URL-encoded path traversal attempts
  const decoded = decodeURIComponent(filePath);
  if (decoded !== filePath) {
    // If decoding changed the path, check it too
    if (decoded.includes('..') || path.isAbsolute(decoded)) {
      throw new Error(SecurityErrors.PATH_TRAVERSAL);
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
      throw new Error(SecurityErrors.PATH_TRAVERSAL);
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