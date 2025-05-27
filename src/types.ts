import type { Transform } from 'stream';

/**
 * Options for configuring transclusion behavior
 */
export interface TransclusionOptions {
  /**
   * Base directory for resolving relative paths
   * @default process.cwd()
   */
  basePath?: string;

  /**
   * Allowed file extensions for transclusion
   * @default ['.md', '.markdown']
   */
  extensions?: string[];

  /**
   * Maximum depth for recursive transclusions
   * @default 10
   */
  maxDepth?: number;

  /**
   * Variables for template substitution
   * @example { lang: 'es', version: '1.0' }
   */
  variables?: Record<string, string>;

  /**
   * Whether to throw errors on missing files or invalid references
   * @default false
   */
  strict?: boolean;

  /**
   * Whether to validate references without processing content
   * @default false
   */
  validateOnly?: boolean;
}

/**
 * Error information for transclusion failures
 */
export interface TransclusionError {
  /**
   * Human-readable error message
   */
  message: string;

  /**
   * Path to the file that caused the error
   */
  path: string;

  /**
   * Line number where the error occurred (if applicable)
   */
  line?: number;

  /**
   * Error code for programmatic handling
   */
  code?: string;
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
 * Parsed transclusion reference from markdown
 */
export interface ParsedReference {
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
}

/**
 * Resolved file path with metadata
 */
export interface ResolvedPath {
  /**
   * Absolute path to the file
   */
  absolutePath: string;

  /**
   * Whether the file exists on disk
   */
  exists: boolean;

  /**
   * Original reference that was resolved
   */
  originalReference: string;

  /**
   * Any error encountered during resolution
   */
  error?: string;
}

/**
 * Internal file cache entry
 */
export interface FileCacheEntry {
  /**
   * File content
   */
  content: string;

  /**
   * Timestamp when cached
   */
  timestamp: number;

  /**
   * File size in bytes
   */
  size: number;
}

/**
 * File cache interface
 */
export interface FileCache {
  /**
   * Get cached content for a path
   */
  get(path: string): FileCacheEntry | undefined;

  /**
   * Store content in cache
   */
  set(path: string, content: string): void;

  /**
   * Clear all cached entries
   */
  clear(): void;

  /**
   * Get cache statistics
   */
  stats(): {
    size: number;
    hits: number;
    misses: number;
  };
}

/**
 * Transform stream for processing transclusions
 */
export interface TransclusionTransform extends Transform {
  /**
   * Options used by this transform
   */
  readonly options: TransclusionOptions;

  /**
   * Errors encountered during processing
   */
  readonly errors: TransclusionError[];
}