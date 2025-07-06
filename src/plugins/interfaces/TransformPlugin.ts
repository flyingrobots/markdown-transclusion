/**
 * Core Plugin Interface
 * 
 * Defines the contract for all plugins following Single Responsibility Principle.
 * Each plugin has one clear purpose: transform content in a specific way.
 */

import type { 
  // PluginMetadata, 
  PluginRegistrationInfo 
} from './PluginMetadata';
import type { 
  PluginContext,
  TransformContext,
  FileProcessContext,
  ValidationContext,
  PostProcessContext
} from './PluginContext';

// Re-export context types for convenience
export type {
  PluginContext,
  TransformContext,
  FileProcessContext,
  ValidationContext,
  PostProcessContext
} from './PluginContext';

/**
 * Base plugin interface - all plugins must implement this
 */
export interface BasePlugin {
  /** Plugin identification and metadata */
  readonly metadata: PluginRegistrationInfo;
  
  /** 
   * Initialize plugin with context (optional)
   * Called once when plugin is loaded
   */
  init?(context: PluginContext): Promise<void> | void;
  
  /** 
   * Cleanup plugin resources (optional)
   * Called when plugin is unloaded or process exits
   */
  cleanup?(): Promise<void> | void;
}

/**
 * Content transformer plugin
 * Transforms content during transclusion process
 */
export interface ContentTransformPlugin extends BasePlugin {
  /**
   * Transform content with provided context
   * @param content - The content to transform
   * @param context - Context information for transformation
   * @returns Transformed content
   */
  transform(content: string, context: TransformContext): Promise<string> | string;
}

/**
 * File processor plugin
 * Processes files before they are transcluded
 */
export interface FileProcessPlugin extends BasePlugin {
  /**
   * Process file content before transclusion
   * @param content - Raw file content
   * @param context - File processing context
   * @returns Processed content
   */
  processFile(content: string, context: FileProcessContext): Promise<string> | string;
}

/**
 * Validator plugin
 * Validates content and provides feedback
 */
export interface ValidatorPlugin extends BasePlugin {
  /**
   * Validate content and return validation results
   * @param content - Content to validate
   * @param context - Validation context
   * @returns Validation results
   */
  validate(content: string, context: ValidationContext): Promise<ValidationResult[]> | ValidationResult[];
}

/**
 * Post-processor plugin
 * Performs final transformations after all transclusions are complete
 */
export interface PostProcessPlugin extends BasePlugin {
  /**
   * Post-process final content
   * @param content - Final content after all transclusions
   * @param context - Post-processing context
   * @returns Final processed content
   */
  postProcess(content: string, context: PostProcessContext): Promise<string> | string;
}

/**
 * Union type for all plugin types
 */
export type TransformPlugin = 
  | ContentTransformPlugin 
  | FileProcessPlugin 
  | ValidatorPlugin 
  | PostProcessPlugin;

/**
 * Validation result from validator plugins
 */
export interface ValidationResult {
  /** Validation rule that was checked */
  rule: string;
  
  /** Whether validation passed */
  passed: boolean;
  
  /** Error or warning message (if validation failed) */
  message?: string;
  
  /** Severity level */
  severity: 'error' | 'warning' | 'info';
  
  /** Line number where issue was found (if applicable) */
  line?: number;
  
  /** Column number where issue was found (if applicable) */
  column?: number;
  
  /** Suggested fix (if available) */
  suggestion?: string;
}

/**
 * Plugin execution result
 */
export interface PluginExecutionResult {
  /** Plugin that executed */
  pluginName: string;
  
  /** Whether execution was successful */
  success: boolean;
  
  /** Execution time in milliseconds */
  duration: number;
  
  /** Error message (if execution failed) */
  error?: string;
  
  /** Validation results (for validator plugins) */
  validationResults?: ValidationResult[];
}

/**
 * Type guards for plugin type checking
 */
export function isContentTransformPlugin(plugin: TransformPlugin): plugin is ContentTransformPlugin {
  return 'transform' in plugin;
}

export function isFileProcessPlugin(plugin: TransformPlugin): plugin is FileProcessPlugin {
  return 'processFile' in plugin;
}

export function isValidatorPlugin(plugin: TransformPlugin): plugin is ValidatorPlugin {
  return 'validate' in plugin;
}

export function isPostProcessPlugin(plugin: TransformPlugin): plugin is PostProcessPlugin {
  return 'postProcess' in plugin;
}