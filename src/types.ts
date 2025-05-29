import type { Transform } from 'stream';

export interface TransclusionOptions {
  /**
   * Base directory for resolving relative paths.
   * Defaults to process.cwd() when not specified.
   */
  basePath?: string;
  extensions?: string[];
  variables?: Record<string, string>;
  strict?: boolean;
  cache?: FileCache;
  maxDepth?: number;
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
}

/**
 * File resolution result with metadata
 */
export interface FileResolution {
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

  /**
   * Error code if error is a known type
   */
  errorCode?: number;
}

/**
 * Cached file content with metadata
 */
export interface CachedFileContent {
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
  get(path: string): CachedFileContent | undefined;

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

  /**
   * Get total size of cached content in bytes
   */
  getTotalSize?(): number;
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