/**
 * Plugin Metadata Interface
 * 
 * Defines the structure for plugin identification and dependency information.
 * Following SRP - single responsibility for metadata representation.
 */

export interface PluginMetadata {
  /** Unique plugin name (kebab-case recommended) */
  readonly name: string;
  
  /** Semantic version (e.g., "1.2.3") */
  readonly version: string;
  
  /** Human-readable description of plugin functionality */
  readonly description: string;
  
  /** Plugin author information (optional) */
  readonly author?: string;
  
  /** Array of plugin names this plugin depends on (optional) */
  readonly dependencies?: readonly string[];
  
  /** Plugin tags for categorization (optional) */
  readonly tags?: readonly string[];
}

/**
 * Plugin execution order priority
 * Lower numbers execute first
 */
export enum PluginPriority {
  HIGHEST = 0,
  HIGH = 25,
  NORMAL = 50,
  LOW = 75,
  LOWEST = 100
}

/**
 * Plugin type classification
 */
export enum PluginType {
  /** Transform content during transclusion */
  CONTENT_TRANSFORMER = 'content-transformer',
  
  /** Process files before transclusion */
  FILE_PROCESSOR = 'file-processor',
  
  /** Final transformations after all transclusions */
  POST_PROCESSOR = 'post-processor',
  
  /** Validate content and provide feedback */
  VALIDATOR = 'validator'
}

/**
 * Extended metadata for plugin registration
 */
export interface PluginRegistrationInfo extends PluginMetadata {
  /** Plugin type for execution pipeline placement */
  readonly type: PluginType;
  
  /** Execution priority (lower = earlier) */
  readonly priority: PluginPriority;
  
  /** Whether plugin supports async operations */
  readonly async: boolean;
  
  /** Plugin configuration schema (optional) */
  readonly configSchema?: Record<string, unknown>;
}