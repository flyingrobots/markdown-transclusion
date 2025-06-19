/**
 * Plugin System Public API
 * 
 * Main entry point for the plugin system, providing clean exports
 * following the established API patterns.
 */

// Core interfaces
export type {
  TransformPlugin,
  ContentTransformPlugin,
  FileProcessPlugin,
  ValidatorPlugin,
  PostProcessPlugin,
  BasePlugin,
  ValidationResult,
  PluginExecutionResult
} from './interfaces/TransformPlugin';

export type {
  PluginMetadata,
  PluginRegistrationInfo
} from './interfaces/PluginMetadata';

export type {
  PluginContext,
  TransformContext,
  FileProcessContext,
  ValidationContext,
  PostProcessContext
} from './interfaces/PluginContext';

export {
  PluginType,
  PluginPriority
} from './interfaces/PluginMetadata';

export {
  isContentTransformPlugin,
  isFileProcessPlugin,
  isValidatorPlugin,
  isPostProcessPlugin
} from './interfaces/TransformPlugin';

// Core classes
export { PluginLoader, NodeFileSystemProvider } from './core/PluginLoader';
export { PluginRegistry } from './core/PluginRegistry';
export { PluginValidator } from './core/PluginValidator';
export { PluginExecutor } from './core/PluginExecutor';

export type {
  PluginExecutorConfig,
  PluginExecutionSummary,
  PluginConfig
} from './core/PluginExecutor';

// Built-in plugins
export { CodeHighlighterPlugin } from './builtin/CodeHighlighterPlugin';
export { MacroExpanderPlugin } from './builtin/MacroExpanderPlugin';
export { TableFormatterPlugin } from './builtin/TableFormatterPlugin';

export type {
  CodeHighlighterConfig
} from './builtin/CodeHighlighterPlugin';

export type {
  MacroExpanderConfig
} from './builtin/MacroExpanderPlugin';

export type {
  TableFormatterConfig
} from './builtin/TableFormatterPlugin';

// Error types
export { PluginValidationError } from './core/PluginValidator';
export { PluginLoadError } from './core/PluginLoader';
export { PluginRegistryError } from './core/PluginRegistry';

/**
 * Create a plugin executor with default configuration
 */
export function createPluginExecutor(
  logger: any,
  pluginSources: string[] = [],
  configPath?: string
) {
  const { PluginExecutor } = require('./core/PluginExecutor');
  
  return new PluginExecutor(logger, {
    pluginSources,
    configPath,
    enableBuiltins: true,
    operationTimeout: 5000
  });
}