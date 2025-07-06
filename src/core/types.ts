/**
 * Core types for the transclusion engine
 */

import type { FileCache } from './cache';
import type { TransclusionError } from './errors';

// Re-export TransclusionError so it's available from this module
export type { TransclusionError } from './errors';

/**
 * Options for transclusion operations
 */
export interface TransclusionOptions {
  /**
   * Base directory for resolving relative paths.
   * Defaults to process.cwd() when not specified.
   */
  basePath?: string;

  /**
   * File extensions to try when resolving paths
   */
  extensions?: string[];

  /**
   * Variables for path substitution
   */
  variables?: Record<string, string>;

  /**
   * Whether to fail on first error (strict mode)
   */
  strict?: boolean;

  /**
   * Optional file cache instance
   */
  cache?: FileCache;

  /**
   * Maximum transclusion depth (default: 10)
   */
  maxDepth?: number;

  /**
   * Whether to only validate without processing
   */
  validateOnly?: boolean;

  /**
   * Whether to strip YAML/TOML frontmatter from transcluded files
   */
  stripFrontmatter?: boolean;

  /**
   * Initial file path for resolving relative paths in the first file
   */
  initialFilePath?: string;
}

/**
 * Result of a transclusion operation
 */
export interface TransclusionResult {
  /**
   * The processed content with transclusions resolved
   */
  content: string;

  /**
   * Any errors encountered during processing
   */
  errors: TransclusionError[];

  /**
   * Paths of all files that were processed
   */
  processedFiles: string[];
}

/**
 * Parsed transclusion token from markdown
 */
export interface TransclusionToken {
  /**
   * The complete original reference (e.g., "![[file.md]]")
   */
  original: string;

  /**
   * The extracted path (e.g., "file.md")
   */
  path: string;

  /**
   * Start position in the line
   */
  startIndex: number;

  /**
   * End position in the line
   */
  endIndex: number;

  /**
   * Optional heading anchor (e.g., "heading" from "![[file#heading]]")
   */
  heading?: string;

  /**
   * Optional end heading for range extraction
   */
  endHeading?: string;

  /**
   * Alias for endHeading (backward compatibility)
   */
  headingEnd?: string;
}

/**
 * File resolution result
 */
export interface FileResolution {
  /**
   * Original path from the transclusion
   */
  originalPath: string;

  /**
   * Resolved absolute path
   */
  resolvedPath?: string;
  
  /**
   * Absolute path - this is the primary property used by the system
   * For backward compatibility, this should always be set to the same value as resolvedPath
   */
  absolutePath: string;

  /**
   * Error if resolution failed
   */
  error?: string;

  /**
   * Error code if resolution failed  
   */
  errorCode?: number;

  /**
   * Whether the file exists
   */
  exists: boolean;
}