/**
 * Plugin Registry
 * 
 * Manages plugin registration, lifecycle, and execution.
 * Following SRP - single responsibility for plugin management.
 */

import type { 
  TransformPlugin,
  ContentTransformPlugin,
  FileProcessPlugin,
  ValidatorPlugin,
  PostProcessPlugin,
  PluginExecutionResult,
  ValidationResult,
  isContentTransformPlugin,
  isFileProcessPlugin,
  isValidatorPlugin,
  isPostProcessPlugin
} from '../interfaces/TransformPlugin';
import type {
  PluginContext,
  TransformContext,
  FileProcessContext,
  ValidationContext,
  PostProcessContext
} from '../interfaces/PluginContext';
import { PluginType, PluginPriority } from '../interfaces/PluginMetadata';
import type { StreamLogger } from '../../utils/logger';

/**
 * Plugin registry errors
 */
export class PluginRegistryError extends Error {
  constructor(message: string, public readonly pluginName?: string) {
    super(message);
    this.name = 'PluginRegistryError';
  }
}

/**
 * Plugin execution statistics
 */
export interface PluginExecutionStats {
  totalExecutions: number;
  totalDuration: number;
  averageDuration: number;
  successCount: number;
  errorCount: number;
  lastExecution?: Date;
  lastError?: Error;
}

/**
 * Registered plugin wrapper
 */
interface RegisteredPlugin {
  plugin: TransformPlugin;
  stats: PluginExecutionStats;
  enabled: boolean;
}

/**
 * Plugin registry class
 */
export class PluginRegistry {
  private readonly plugins = new Map<string, RegisteredPlugin>();
  private initialized = false;
  
  constructor(private readonly logger: StreamLogger) {}
  
  /**
   * Register a plugin
   */
  register(plugin: TransformPlugin): void {
    const { name, type, priority = PluginPriority.NORMAL } = plugin.metadata;
    
    if (this.plugins.has(name)) {
      throw new PluginRegistryError(`Plugin already registered: ${name}`, name);
    }
    
    this.plugins.set(name, {
      plugin,
      stats: {
        totalExecutions: 0,
        totalDuration: 0,
        averageDuration: 0,
        successCount: 0,
        errorCount: 0
      },
      enabled: true
    });
    
    this.logger.debug(`Registered plugin: ${name} (type: ${type}, priority: ${priority})`);
  }
  
  /**
   * Unregister a plugin
   */
  unregister(pluginName: string): void {
    const registered = this.plugins.get(pluginName);
    if (!registered) {
      throw new PluginRegistryError(`Plugin not found: ${pluginName}`, pluginName);
    }
    
    // Cleanup plugin if it has cleanup method
    if (registered.plugin.cleanup) {
      const cleanup = registered.plugin.cleanup();
      if (cleanup && typeof cleanup.catch === 'function') {
        cleanup.catch((error: any) => {
          this.logger.error(`Error during plugin cleanup for ${pluginName}:`, error);
        });
      }
    }
    
    this.plugins.delete(pluginName);
    this.logger.debug(`Unregistered plugin: ${pluginName}`);
  }
  
  /**
   * Get a specific plugin
   */
  getPlugin(name: string): TransformPlugin | undefined {
    const registered = this.plugins.get(name);
    return registered?.enabled ? registered.plugin : undefined;
  }
  
  /**
   * Get all registered plugins
   */
  getAllPlugins(): TransformPlugin[] {
    return Array.from(this.plugins.values())
      .filter(registered => registered.enabled)
      .map(registered => registered.plugin);
  }
  
  /**
   * Get plugins by type
   */
  getPluginsByType<T extends TransformPlugin>(type: PluginType): T[] {
    return Array.from(this.plugins.values())
      .filter(registered => registered.enabled && registered.plugin.metadata.type === type)
      .map(registered => registered.plugin as T);
  }
  
  /**
   * Initialize all plugins
   */
  async initializePlugins(context: PluginContext): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    const plugins = this.getAllPlugins();
    const initPromises = plugins
      .filter(plugin => plugin.init)
      .map(async plugin => {
        try {
          await plugin.init!(context);
          this.logger.debug(`Initialized plugin: ${plugin.metadata.name}`);
        } catch (error) {
          this.logger.error(`Failed to initialize plugin ${plugin.metadata.name}:`, error);
          // Disable plugin if initialization fails
          const registered = this.plugins.get(plugin.metadata.name);
          if (registered) {
            registered.enabled = false;
          }
        }
      });
    
    await Promise.all(initPromises);
    this.initialized = true;
    this.logger.info(`Initialized ${plugins.length} plugins`);
  }
  
  /**
   * Cleanup all plugins
   */
  async cleanupPlugins(): Promise<void> {
    const plugins = this.getAllPlugins();
    const cleanupPromises = plugins
      .filter(plugin => plugin.cleanup)
      .map(async plugin => {
        try {
          await plugin.cleanup!();
          this.logger.debug(`Cleaned up plugin: ${plugin.metadata.name}`);
        } catch (error) {
          this.logger.error(`Failed to cleanup plugin ${plugin.metadata.name}:`, error);
        }
      });
    
    await Promise.all(cleanupPromises);
    this.initialized = false;
    this.logger.info('Cleaned up all plugins');
  }
  
  /**
   * Execute content transformer plugins
   */
  async executeContentTransformers(
    content: string, 
    context: TransformContext
  ): Promise<{ content: string; results: PluginExecutionResult[] }> {
    const plugins = this.getPluginsByType<ContentTransformPlugin>(PluginType.CONTENT_TRANSFORMER)
      .sort((a, b) => (a.metadata.priority || PluginPriority.NORMAL) - (b.metadata.priority || PluginPriority.NORMAL));
    
    let transformedContent = content;
    const results: PluginExecutionResult[] = [];
    
    for (const plugin of plugins) {
      const result = await this.executePlugin(
        plugin,
        async () => plugin.transform(transformedContent, context)
      );
      
      if (result.success && typeof result.result === 'string') {
        transformedContent = result.result;
      }
      
      results.push({
        pluginName: plugin.metadata.name,
        success: result.success,
        duration: result.duration,
        error: result.error?.message
      });
    }
    
    return { content: transformedContent, results };
  }
  
  /**
   * Execute file processor plugins
   */
  async executeFileProcessors(
    content: string,
    context: FileProcessContext
  ): Promise<{ content: string; results: PluginExecutionResult[] }> {
    const plugins = this.getPluginsByType<FileProcessPlugin>(PluginType.FILE_PROCESSOR)
      .sort((a, b) => (a.metadata.priority || PluginPriority.NORMAL) - (b.metadata.priority || PluginPriority.NORMAL));
    
    let processedContent = content;
    const results: PluginExecutionResult[] = [];
    
    for (const plugin of plugins) {
      const result = await this.executePlugin(
        plugin,
        async () => plugin.processFile(processedContent, context)
      );
      
      if (result.success && typeof result.result === 'string') {
        processedContent = result.result;
      }
      
      results.push({
        pluginName: plugin.metadata.name,
        success: result.success,
        duration: result.duration,
        error: result.error?.message
      });
    }
    
    return { content: processedContent, results };
  }
  
  /**
   * Execute validator plugins
   */
  async executeValidators(
    content: string,
    context: ValidationContext
  ): Promise<{ results: PluginExecutionResult[] }> {
    const plugins = this.getPluginsByType<ValidatorPlugin>(PluginType.VALIDATOR);
    const results: PluginExecutionResult[] = [];
    
    // Validators can run in parallel
    const validationPromises = plugins.map(async plugin => {
      const result = await this.executePlugin(
        plugin,
        async () => plugin.validate(content, context)
      );
      
      return {
        pluginName: plugin.metadata.name,
        success: result.success,
        duration: result.duration,
        error: result.error?.message,
        validationResults: result.success ? result.result as ValidationResult[] : undefined
      };
    });
    
    results.push(...await Promise.all(validationPromises));
    return { results };
  }
  
  /**
   * Execute post-processor plugins
   */
  async executePostProcessors(
    content: string,
    context: PostProcessContext
  ): Promise<{ content: string; results: PluginExecutionResult[] }> {
    const plugins = this.getPluginsByType<PostProcessPlugin>(PluginType.POST_PROCESSOR)
      .sort((a, b) => (a.metadata.priority || PluginPriority.NORMAL) - (b.metadata.priority || PluginPriority.NORMAL));
    
    let processedContent = content;
    const results: PluginExecutionResult[] = [];
    
    for (const plugin of plugins) {
      const result = await this.executePlugin(
        plugin,
        async () => plugin.postProcess(processedContent, context)
      );
      
      if (result.success && typeof result.result === 'string') {
        processedContent = result.result;
      }
      
      results.push({
        pluginName: plugin.metadata.name,
        success: result.success,
        duration: result.duration,
        error: result.error?.message
      });
    }
    
    return { content: processedContent, results };
  }
  
  /**
   * Execute a single plugin with error handling and timing
   */
  private async executePlugin<T>(
    plugin: TransformPlugin,
    executor: () => Promise<T> | T
  ): Promise<{ success: boolean; result?: T; error?: Error; duration: number }> {
    const startTime = Date.now();
    const registered = this.plugins.get(plugin.metadata.name);
    
    if (!registered) {
      throw new PluginRegistryError(`Plugin not registered: ${plugin.metadata.name}`, plugin.metadata.name);
    }
    
    try {
      const result = await executor();
      const duration = Date.now() - startTime;
      
      // Update stats
      registered.stats.totalExecutions++;
      registered.stats.successCount++;
      registered.stats.totalDuration += duration;
      registered.stats.averageDuration = registered.stats.totalDuration / registered.stats.totalExecutions;
      registered.stats.lastExecution = new Date();
      
      return { success: true, result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      const pluginError = error instanceof Error ? error : new Error(String(error));
      
      // Update stats
      registered.stats.totalExecutions++;
      registered.stats.errorCount++;
      registered.stats.totalDuration += duration;
      registered.stats.averageDuration = registered.stats.totalDuration / registered.stats.totalExecutions;
      registered.stats.lastExecution = new Date();
      registered.stats.lastError = pluginError;
      
      this.logger.error(`Plugin execution failed for ${plugin.metadata.name}:`, pluginError);
      
      return { success: false, error: pluginError, duration };
    }
  }
  
  /**
   * Get plugin statistics
   */
  getPluginStats(pluginName: string): PluginExecutionStats | undefined {
    const registered = this.plugins.get(pluginName);
    return registered ? { ...registered.stats } : undefined;
  }
  
  /**
   * Get all plugin statistics
   */
  getAllPluginStats(): Record<string, PluginExecutionStats> {
    const stats: Record<string, PluginExecutionStats> = {};
    for (const [name, registered] of this.plugins.entries()) {
      stats[name] = { ...registered.stats };
    }
    return stats;
  }
  
  /**
   * Enable/disable a plugin
   */
  setPluginEnabled(pluginName: string, enabled: boolean): void {
    const registered = this.plugins.get(pluginName);
    if (!registered) {
      throw new PluginRegistryError(`Plugin not found: ${pluginName}`, pluginName);
    }
    
    registered.enabled = enabled;
    this.logger.debug(`Plugin ${pluginName} ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Check if plugin is enabled
   */
  isPluginEnabled(pluginName: string): boolean {
    const registered = this.plugins.get(pluginName);
    return registered?.enabled ?? false;
  }
}