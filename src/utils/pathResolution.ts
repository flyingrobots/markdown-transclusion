import * as path from 'path';
import * as fs from 'fs';
import { validatePath, isWithinBasePath, SecurityErrorCode } from '../security';
import { Result, Ok, Err } from './result';

/**
 * Error types for path resolution
 */
export interface PathResolutionError {
  code: 'INVALID_PATH' | 'OUTSIDE_BASE' | 'NOT_FOUND' | 'VARIABLE_ERROR';
  message: string;
  path: string;
  errorCode?: number;
}

/**
 * Generate potential file paths to try based on reference and extensions
 */
export function generatePathsToTry(
  reference: string,
  extensions: string[] = []
): string[] {
  const hasExtension = path.extname(reference) !== '';
  const pathsToTry: string[] = [];

  if (hasExtension) {
    // If already has extension, only try that path
    pathsToTry.push(reference);
  } else {
    // Try without extension first
    pathsToTry.push(reference);
    // Then try with each extension
    extensions.forEach(ext => {
      pathsToTry.push(reference + ext);
    });
  }

  return pathsToTry;
}

/**
 * Validate a path for security concerns
 */
export function validateReferencePath(
  reference: string
): Result<void, PathResolutionError> {
  try {
    validatePath(reference);
    return Ok(undefined);
  } catch (error) {
    const errorCode = error instanceof Error && 'code' in error ? 
      (error as any).code : undefined;
    
    return Err({
      code: 'INVALID_PATH',
      message: error instanceof Error ? error.message : 'Invalid path',
      path: reference,
      errorCode
    });
  }
}

/**
 * Check if resolved path is within base directory
 */
export function validateWithinBase(
  absolutePath: string,
  basePath: string,
  relativePath: string
): Result<void, PathResolutionError> {
  if (!isWithinBasePath(absolutePath, basePath)) {
    return Err({
      code: 'OUTSIDE_BASE',
      message: `Path resolves outside base directory: ${relativePath}`,
      path: relativePath,
      errorCode: SecurityErrorCode.OUTSIDE_BASE
    });
  }
  return Ok(undefined);
}

/**
 * Check if a file exists and is a regular file
 */
export function checkFileExists(filePath: string): boolean {
  try {
    const stats = fs.statSync(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Find the first existing file from a list of paths
 */
export function findExistingFile(
  pathsToTry: string[],
  basePath: string
): { absolutePath: string; exists: boolean } | null {
  for (const relativePath of pathsToTry) {
    const absolutePath = path.resolve(basePath, relativePath);
    
    if (checkFileExists(absolutePath)) {
      return { absolutePath, exists: true };
    }
  }
  
  return null;
}

/**
 * Normalize a file path (resolve . and .. segments)
 */
export function normalizePath(filePath: string): string {
  return path.normalize(filePath);
}

/**
 * Resolve a reference to an absolute path
 */
export function resolveToAbsolutePath(
  reference: string,
  basePath: string
): string {
  return path.resolve(basePath, reference);
}