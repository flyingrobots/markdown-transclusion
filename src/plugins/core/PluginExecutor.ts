/**
 * Plugin Executor
 * 
 * Orchestrates plugin loading and execution within the transclusion pipeline.
 * Following DI principles - depends on injected services.
 */

import { promises as fs } from 'fs';
import type { TransclusionOptions } from '../../types';
import type { StreamLogger } from '../../utils/logger';
import type { 
  TransformPlugin,
  PluginExecutionResult
} from '../interfaces/TransformPlugin';
import type {
  PluginContext,
  TransformContext,
  FileProcessContext,
  ValidationContext,
  PostProcessContext
} from '../interfaces/PluginContext';
import { PluginType } from '../interfaces/PluginMetadata';
import { PluginLoader, NodeFileSystemProvider } from './PluginLoader';
import { PluginValidator } from './PluginValidator';
import { PluginRegistry } from './PluginRegistry';

/**
 * Plugin configuration loaded from file
 */
export interface PluginConfig {
  [pluginName: string]: Record<string, unknown>;
}

/**
 * Plugin executor configuration
 */
export interface PluginExecutorConfig {
  /** Plugin sources (files, directories) */
  pluginSources: string[];
  
  /** Path to plugin configuration file */
  configPath?: string;
  
  /** Whether to enable built-in plugins */
  enableBuiltins: boolean;
  
  /** Timeout for plugin operations in milliseconds */
  operationTimeout: number;
}

/**
 * Plugin execution statistics
 */
export interface PluginExecutionSummary {
  totalPlugins: number;
  enabledPlugins: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalDuration: number;
  results: PluginExecutionResult[];
}

/**
 * Plugin executor class
 */
export class PluginExecutor {
  private readonly loader: PluginLoader;
  private readonly registry: PluginRegistry;
  private readonly validator: PluginValidator;
  private pluginConfig: PluginConfig = {};
  private initialized = false;
  
  constructor(
    private readonly logger: StreamLogger,
    private readonly config: PluginExecutorConfig
  ) {
    this.validator = new PluginValidator();
    this.loader = new PluginLoader(
      new NodeFileSystemProvider(),
      logger,
      this.validator
    );
    this.registry = new PluginRegistry(logger);
  }
  
  /**
   * Initialize plugin system
   */
  async initialize(transclusionOptions: TransclusionOptions): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      // Load plugin configuration
      await this.loadPluginConfig();
      
      // Load built-in plugins if enabled
      if (this.config.enableBuiltins) {
        await this.loadBuiltinPlugins();
      }
      
      // Load external plugins
      if (this.config.pluginSources.length > 0) {
        await this.loadExternalPlugins();
      }
      
      // Initialize all plugins
      const context = this.createPluginContext(transclusionOptions);
      await this.registry.initializePlugins(context);
      
      this.initialized = true;
      
      const pluginCount = this.registry.getAllPlugins().length;
      this.logger.info(`Plugin system initialized with ${pluginCount} plugins`);
      
    } catch (error) {
      this.logger.error('Failed to initialize plugin system:', error);
      throw error;
    }
  }
  
  /**
   * Cleanup plugin system
   */
  async cleanup(): Promise<void> {
    if (!this.initialized) {
      return;
    }
    
    try {
      await this.registry.cleanupPlugins();
      this.initialized = false;
      this.logger.debug('Plugin system cleaned up');
    } catch (error) {
      this.logger.error('Failed to cleanup plugin system:', error);
    }
  }
  
  /**
   * Execute content transformers on content
   */
  async transformContent(
    content: string,
    filePath: string,
    transclusionOptions: TransclusionOptions,
    lineNumber?: number,
    originalSyntax?: string,
    depth: number = 0,
    pathStack: string[] = []
  ): Promise<{ content: string; results: PluginExecutionResult[] }> {
    if (!this.initialized) {
      throw new Error('Plugin executor not initialized');
    }
    
    const context: TransformContext = {
      ...this.createPluginContext(transclusionOptions),
      filePath,
      lineNumber,
      originalSyntax,
      depth,
      pathStack: [...pathStack]
    };
    
    return this.registry.executeContentTransformers(content, context);
  }
  
  /**
   * Execute file processors on file content
   */
  async processFile(
    content: string,
    filePath: string,
    transclusionOptions: TransclusionOptions
  ): Promise<{ content: string; results: PluginExecutionResult[] }> {
    if (!this.initialized) {
      throw new Error('Plugin executor not initialized');
    }
    
    const stat = await fs.stat(filePath);
    const context: FileProcessContext = {
      ...this.createPluginContext(transclusionOptions),
      filePath,
      extension: filePath.split('.').pop() || '',
      fileSize: stat.size,
      lastModified: stat.mtime
    };
    
    return this.registry.executeFileProcessors(content, context);
  }
  
  /**
   * Execute validators on content
   */
  async validateContent(
    content: string,
    filePath: string,
    transclusionOptions: TransclusionOptions
  ): Promise<{ results: PluginExecutionResult[] }> {
    if (!this.initialized) {
      throw new Error('Plugin executor not initialized');
    }
    
    const context: ValidationContext = {
      ...this.createPluginContext(transclusionOptions),
      filePath,
      strictMode: transclusionOptions.strict || false,
      rules: [] // Could be extended to support validation rules
    };
    
    return this.registry.executeValidators(content, context);
  }
  
  /**
   * Execute post-processors on final content
   */
  async postProcessContent(
    content: string,
    transclusionOptions: TransclusionOptions,
    outputPath?: string,
    stats?: any,
    dryRun: boolean = false
  ): Promise<{ content: string; results: PluginExecutionResult[] }> {
    if (!this.initialized) {
      throw new Error('Plugin executor not initialized');
    }
    
    const context: PostProcessContext = {
      ...this.createPluginContext(transclusionOptions),
      outputPath,
      stats: stats || {
        filesProcessed: 0,
        transclusionsResolved: 0,
        warnings: 0,
        errors: 0,
        duration: 0
      },
      dryRun
    };
    
    return this.registry.executePostProcessors(content, context);
  }
  
  /**
   * Get plugin execution summary
   */
  getExecutionSummary(): PluginExecutionSummary {
    const allStats = this.registry.getAllPluginStats();
    const plugins = this.registry.getAllPlugins();
    
    let successfulExecutions = 0;
    let failedExecutions = 0;
    let totalDuration = 0;
    
    for (const stats of Object.values(allStats)) {
      successfulExecutions += stats.successCount;
      failedExecutions += stats.errorCount;
      totalDuration += stats.totalDuration;
    }
    
    return {
      totalPlugins: plugins.length,
      enabledPlugins: plugins.filter(p => this.registry.isPluginEnabled(p.metadata.name)).length,
      successfulExecutions,
      failedExecutions,
      totalDuration,
      results: [] // Would need to collect recent results
    };
  }
  
  /**
   * Load plugin configuration from file
   */
  private async loadPluginConfig(): Promise<void> {
    if (!this.config.configPath) {
      return;
    }
    
    try {
      const configContent = await fs.readFile(this.config.configPath, 'utf-8');
      this.pluginConfig = JSON.parse(configContent);
      this.logger.debug(`Loaded plugin configuration from: ${this.config.configPath}`);
    } catch (error) {
      this.logger.warn(`Failed to load plugin configuration from ${this.config.configPath}:`, error);
    }
  }
  
  /**
   * Load built-in plugins
   */
  private async loadBuiltinPlugins(): Promise<void> {
    try {
      // Dynamically import built-in plugins
      const { CodeHighlighterPlugin } = await import('../builtin/CodeHighlighterPlugin');
      const { MacroExpanderPlugin } = await import('../builtin/MacroExpanderPlugin');
      const { TableFormatterPlugin } = await import('../builtin/TableFormatterPlugin');
      
      // Register built-in plugins
      this.registry.register(new CodeHighlighterPlugin());
      this.registry.register(new MacroExpanderPlugin());
      this.registry.register(new TableFormatterPlugin());
      
      this.logger.debug('Loaded built-in plugins');
    } catch (error) {
      this.logger.error('Failed to load built-in plugins:', error);
    }
  }
  
  /**
   * Load external plugins from configured sources
   */
  private async loadExternalPlugins(): Promise<void> {
    try {
      const plugins = await this.loader.loadPluginsFromSources(this.config.pluginSources);
      
      for (const plugin of plugins) {
        this.registry.register(plugin);
      }
      
      this.logger.info(`Loaded ${plugins.length} external plugins`);
    } catch (error) {
      this.logger.error('Failed to load external plugins:', error);
    }
  }
  
  /**
   * Create plugin context from transclusion options
   */
  private createPluginContext(transclusionOptions: TransclusionOptions): PluginContext {
    return {
      basePath: transclusionOptions.basePath || process.cwd(),
      variables: transclusionOptions.variables || {},
      logger: this.logger,
      config: this.pluginConfig,
      options: {
        strict: transclusionOptions.strict || false,
        maxDepth: transclusionOptions.maxDepth || 10,
        extensions: transclusionOptions.extensions || ['md', 'markdown'],
        stripFrontmatter: transclusionOptions.stripFrontmatter || false
      }
    };
  }
  
  /**
   * Get available plugins
   */
  getAvailablePlugins(): TransformPlugin[] {
    return this.registry.getAllPlugins();
  }
  
  /**
   * Get plugins by type
   */
  getPluginsByType(type: PluginType): TransformPlugin[] {
    return this.registry.getPluginsByType(type);
  }
  
  /**
   * Enable/disable a plugin
   */
  setPluginEnabled(pluginName: string, enabled: boolean): void {
    this.registry.setPluginEnabled(pluginName, enabled);
  }
  
  /**
   * Get plugin statistics
   */
  getPluginStats(pluginName: string) {
    return this.registry.getPluginStats(pluginName);
  }
}