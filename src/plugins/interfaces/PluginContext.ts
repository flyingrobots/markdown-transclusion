/**
 * Plugin Context Interfaces
 * 
 * Provides context information for plugin execution following DI principles.
 * Context is injected into plugins rather than plugins accessing global state.
 */

import type { StreamLogger } from '../../utils/logger';

/**
 * Base context available to all plugins
 */
export interface PluginContext {
  /** Base directory for resolving relative paths */
  readonly basePath: string;
  
  /** User-defined variables for substitution */
  readonly variables: Readonly<Record<string, string>>;
  
  /** Logger instance for plugin output */
  readonly logger: StreamLogger;
  
  /** Plugin-specific configuration */
  readonly config: Readonly<Record<string, unknown>>;
  
  /** Global transclusion options */
  readonly options: Readonly<{
    strict: boolean;
    maxDepth: number;
    extensions: readonly string[];
    stripFrontmatter: boolean;
  }>;
}

/**
 * Context for content transformation operations
 */
export interface TransformContext extends PluginContext {
  /** Path of the file being processed */
  readonly filePath: string;
  
  /** Current line number in the file (if available) */
  readonly lineNumber?: number;
  
  /** Original transclusion syntax that triggered this transformation */
  readonly originalSyntax?: string;
  
  /** Depth of transclusion nesting */
  readonly depth: number;
  
  /** Array of file paths in the current transclusion chain */
  readonly pathStack: readonly string[];
}

/**
 * Context for file processing operations
 */
export interface FileProcessContext extends PluginContext {
  /** Path of the file being processed */
  readonly filePath: string;
  
  /** File extension (without dot) */
  readonly extension: string;
  
  /** File size in bytes */
  readonly fileSize: number;
  
  /** File modification timestamp */
  readonly lastModified: Date;
}

/**
 * Context for validation operations
 */
export interface ValidationContext extends PluginContext {
  /** Path of the file being validated */
  readonly filePath: string;
  
  /** Whether validation is running in strict mode */
  readonly strictMode: boolean;
  
  /** Array of validation rules to apply */
  readonly rules: readonly string[];
}

/**
 * Context for post-processing operations
 */
export interface PostProcessContext extends PluginContext {
  /** Final output file path (if specified) */
  readonly outputPath?: string;
  
  /** Statistics about the transclusion process */
  readonly stats: Readonly<{
    filesProcessed: number;
    transclusionsResolved: number;
    warnings: number;
    errors: number;
    duration: number;
  }>;
  
  /** Whether this is a dry run */
  readonly dryRun: boolean;
}