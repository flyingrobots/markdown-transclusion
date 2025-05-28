import * as path from 'path';
import * as fs from 'fs';
import type { ResolvedPath, TransclusionOptions } from './types';
import { validatePath, isWithinBasePath } from './security';
import {
  generatePathsToTry,
  validateReferencePath,
  validateWithinBase,
  findExistingFile,
  resolveToAbsolutePath
} from './utils/pathResolution';

/**
 * Default file extensions to try when no extension is provided
 */
const DEFAULT_EXTENSIONS = ['.md', '.markdown'];

/**
 * Pattern to match variable placeholders
 * Matches: {{varname}} with optional dashes, underscores, and alphanumeric characters
 */
const VARIABLE_PATTERN = /\{\{([a-zA-Z0-9_-]+)\}\}/g;

/**
 * Substitute variables in a path string
 * @param path The path containing variable placeholders
 * @param variables The variables to substitute
 * @param strict Whether to throw on undefined variables
 * @returns Path with variables substituted
 */
export function substituteVariables(
  path: string, 
  variables: Record<string, string> = {},
  strict = false
): string {
  return path.replace(VARIABLE_PATTERN, (match, varName) => {
    if (varName in variables) {
      return variables[varName];
    }
    if (strict) {
      throw new Error(`Undefined variable: ${varName}`);
    }
    // Return original placeholder if not strict mode
    return match;
  });
}

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
  }
): ResolvedPath {
  const { 
    basePath, 
    extensions = DEFAULT_EXTENSIONS,
    variables = {},
    strict = false
  } = options;
  
  try {
    // Step 1: Substitute variables
    const substitutedReference = substituteVariables(reference, variables, strict);
    
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

    // Step 3: Generate paths to try
    const pathsToTry = generatePathsToTry(substitutedReference, extensions);

    // Step 4: Try each potential path
    for (const relativePath of pathsToTry) {
      const absolutePath = resolveToAbsolutePath(relativePath, basePath);

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