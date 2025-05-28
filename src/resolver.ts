import * as path from 'path';
import * as fs from 'fs';
import type { FileResolution, TransclusionOptions } from './types';
import { validatePath, isWithinBasePath } from './security';
import {
  generatePathsToTry,
  validateReferencePath,
  validateWithinBase,
  findExistingFile,
  resolveToAbsolutePath
} from './utils/pathResolution';
import { substituteVariables as substituteVars } from './utils/pathTokens';
import { resolveExtensions } from './utils/extensionResolver';

/**
 * Default file extensions to try when no extension is provided
 */
const DEFAULT_EXTENSIONS = ['.md', '.markdown'];

/**
 * Re-export substituteVariables from pathTokens for backward compatibility
 */
export { substituteVariables } from './utils/pathTokens';

/**
 * Resolve a transclusion reference to an absolute file path
 * @param reference The reference path from the transclusion
 * @param options Resolution options
 * @returns Resolved path information
 */
export function resolvePath(
  reference: string,
  options: {
    basePath: string;
    extensions?: string[];
    variables?: Record<string, string>;
    strict?: boolean;
    parentPath?: string;
  }
): FileResolution {
  const { 
    basePath, 
    extensions = DEFAULT_EXTENSIONS,
    variables = {},
    strict = false,
    parentPath
  } = options;
  
  try {
    // Step 1: Substitute variables
    const substitutedReference = substituteVars(reference, variables, strict);
    
    // Step 2: Validate the reference path
    const validationResult = validateReferencePath(substitutedReference);
    if (!validationResult.ok) {
      return {
        absolutePath: '',
        exists: false,
        originalReference: reference,
        error: validationResult.error.message,
        errorCode: validationResult.error.errorCode
      };
    }

    // Step 3: Determine the resolution base (parent directory or base path)
    let resolutionBase = basePath;
    if (parentPath && !path.isAbsolute(substitutedReference)) {
      // If parent path is provided and reference is relative, resolve from parent
      resolutionBase = path.dirname(parentPath);
    }
    
    // Step 4: Generate paths to try using extension resolver
    const pathsToTry = resolveExtensions(substitutedReference, extensions);

    // Step 5: Try each potential path
    for (const relativePath of pathsToTry) {
      const absolutePath = resolveToAbsolutePath(relativePath, resolutionBase);

      // Step 5: Security check
      const securityResult = validateWithinBase(absolutePath, basePath, relativePath);
      if (!securityResult.ok) {
        return {
          absolutePath: '',
          exists: false,
          originalReference: reference,
          error: securityResult.error.message,
          errorCode: securityResult.error.errorCode
        };
      }

      // Step 6: Check if file exists
      const existingFile = findExistingFile([relativePath], basePath);
      if (existingFile) {
        return {
          absolutePath: existingFile.absolutePath,
          exists: true,
          originalReference: reference
        };
      }
    }

    // No file found
    return {
      absolutePath: resolveToAbsolutePath(substitutedReference, basePath),
      exists: false,
      originalReference: reference,
      error: `File not found: ${substitutedReference}`
    };

  } catch (error) {
    // Handle unexpected errors
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