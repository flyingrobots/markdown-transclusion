import * as path from 'path';
import * as fs from 'fs';
import type { ResolvedPath, TransclusionOptions } from './types';
import { validatePath, isWithinBasePath } from './security';

/**
 * Default file extensions to try when no extension is provided
 */
const DEFAULT_EXTENSIONS = ['.md', '.markdown'];

/**
 * Resolve a transclusion reference to an absolute file path
 * @param reference The reference path from the transclusion
 * @param basePath The base directory for resolving relative paths
 * @param extensions Optional list of extensions to try
 * @returns Resolved path information
 */
export function resolvePath(
  reference: string,
  basePath: string,
  extensions: string[] = DEFAULT_EXTENSIONS
): ResolvedPath {
  try {
    // Validate the reference path for security
    validatePath(reference);

    // If the reference already has an extension, use it as-is
    const hasExtension = path.extname(reference) !== '';
    const pathsToTry: string[] = [];

    if (hasExtension) {
      pathsToTry.push(reference);
    } else {
      // Try with each extension
      pathsToTry.push(reference); // Try without extension first
      extensions.forEach(ext => {
        pathsToTry.push(reference + ext);
      });
    }

    // Try each potential path
    for (const relativePath of pathsToTry) {
      const absolutePath = path.resolve(basePath, relativePath);

      // Security check: ensure resolved path is within base directory
      if (!isWithinBasePath(absolutePath, basePath)) {
        return {
          absolutePath: '',
          exists: false,
          originalReference: reference,
          error: `Path resolves outside base directory: ${relativePath}`
        };
      }

      // Check if file exists and is actually a file (not directory)
      if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) {
        return {
          absolutePath,
          exists: true,
          originalReference: reference
        };
      }
    }

    // No file found
    return {
      absolutePath: path.resolve(basePath, reference),
      exists: false,
      originalReference: reference,
      error: `File not found: ${reference}`
    };

  } catch (error) {
    // Security validation failed
    return {
      absolutePath: '',
      exists: false,
      originalReference: reference,
      error: error instanceof Error ? error.message : 'Unknown error',
      ...(error instanceof Error && 'code' in error && { errorCode: (error as any).code })
    };
  }
}

/**
 * Check if a file exists and is accessible
 * @param filePath The path to check
 * @returns True if file exists and is readable
 */
export function fileExists(filePath: string): boolean {
  try {
    const stats = fs.statSync(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Get the directory name from a file path
 * @param filePath The file path
 * @returns Directory name
 */
export function getDirectory(filePath: string): string {
  return path.dirname(filePath);
}

/**
 * Join path segments safely
 * @param segments Path segments to join
 * @returns Joined path
 */
export function joinPath(...segments: string[]): string {
  return path.join(...segments);
}