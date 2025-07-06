/**
 * Plugin Loader
 * 
 * Dynamically loads plugins from files, directories, and npm packages.
 * Following SRP and DI principles - depends on injected services.
 */

import { promises as fs } from 'fs';
import { join, resolve, extname } from 'path';
import type { TransformPlugin } from '../interfaces/TransformPlugin';
import type { StreamLogger } from '../../utils/logger';
import { PluginValidator, PluginValidationError } from './PluginValidator';

/**
 * File system provider interface for dependency injection
 */
export interface FileSystemProvider {
  readdir(path: string): Promise<string[]>;
  stat(path: string): Promise<{ isFile(): boolean; isDirectory(): boolean }>;
  readFile(path: string, encoding: BufferEncoding): Promise<string>;
  exists(path: string): Promise<boolean>;
}

/**
 * Node.js file system implementation
 */
export class NodeFileSystemProvider implements FileSystemProvider {
  async readdir(path: string): Promise<string[]> {
    return fs.readdir(path);
  }
  
  async stat(path: string): Promise<{ isFile(): boolean; isDirectory(): boolean }> {
    return fs.stat(path);
  }
  
  async readFile(path: string, encoding: BufferEncoding): Promise<string> {
    return fs.readFile(path, encoding);
  }
  
  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Plugin loading errors
 */
export class PluginLoadError extends Error {
  constructor(
    public readonly pluginPath: string,
    message: string,
    public readonly cause?: Error
  ) {
    super(`Failed to load plugin from ${pluginPath}: ${message}`);
    this.name = 'PluginLoadError';
  }
}

/**
 * Plugin loader configuration
 */
export interface PluginLoaderConfig {
  /** Timeout for plugin loading in milliseconds */
  loadTimeout: number;
  
  /** Whether to load plugins in sandbox mode */
  sandboxMode: boolean;
  
  /** Maximum plugin file size in bytes */
  maxFileSize: number;
  
  /** Allowed plugin file extensions */
  allowedExtensions: readonly string[];
}

/**
 * Default plugin loader configuration
 */
const DEFAULT_CONFIG: PluginLoaderConfig = {
  loadTimeout: 5000,
  sandboxMode: false,
  maxFileSize: 1024 * 1024, // 1MB
  allowedExtensions: ['.js', '.mjs', '.ts']
};

/**
 * Plugin loader class
 */
export class PluginLoader {
  private readonly config: PluginLoaderConfig;
  
  constructor(
    private readonly fileSystem: FileSystemProvider,
    private readonly logger: StreamLogger,
    private readonly validator: PluginValidator,
    config: Partial<PluginLoaderConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Load a single plugin from file path
   */
  async loadPlugin(pluginPath: string): Promise<TransformPlugin> {
    const resolvedPath = resolve(pluginPath);
    
    try {
      this.logger.debug(`Loading plugin from: ${resolvedPath}`);
      
      // Validate file exists and is accessible
      await this.validatePluginFile(resolvedPath);
      
      // Load the plugin module
      const pluginModule = await this.loadPluginModule(resolvedPath);
      
      // Extract plugin from module
      const plugin = this.extractPlugin(pluginModule, resolvedPath);
      
      // Validate plugin interface
      this.validator.validatePlugin(plugin, resolvedPath);
      
      this.logger.debug(`Successfully loaded plugin: ${plugin.metadata.name}`);
      return plugin;
      
    } catch (error) {
      if (error instanceof PluginValidationError || error instanceof PluginLoadError) {
        throw error;
      }
      throw new PluginLoadError(resolvedPath, error instanceof Error ? error.message : String(error), error instanceof Error ? error : undefined);
    }
  }
  
  /**
   * Load all plugins from a directory
   */
  async loadPluginsFromDirectory(directory: string): Promise<TransformPlugin[]> {
    const resolvedDir = resolve(directory);
    
    try {
      if (!await this.fileSystem.exists(resolvedDir)) {
        this.logger.warn(`Plugin directory does not exist: ${resolvedDir}`);
        return [];
      }
      
      const stat = await this.fileSystem.stat(resolvedDir);
      if (!stat.isDirectory()) {
        throw new PluginLoadError(resolvedDir, 'Path is not a directory');
      }
      
      const files = await this.fileSystem.readdir(resolvedDir);
      const plugins: TransformPlugin[] = [];
      
      for (const file of files) {
        const filePath = join(resolvedDir, file);
        const fileExt = extname(file);
        
        if (this.config.allowedExtensions.includes(fileExt)) {
          try {
            const plugin = await this.loadPlugin(filePath);
            plugins.push(plugin);
          } catch (error) {
            this.logger.warn(`Failed to load plugin from ${filePath}:`, error);
            // Continue loading other plugins
          }
        }
      }
      
      this.logger.info(`Loaded ${plugins.length} plugins from directory: ${resolvedDir}`);
      return plugins;
      
    } catch (error) {
      if (error instanceof PluginLoadError) {
        throw error;
      }
      throw new PluginLoadError(resolvedDir, error instanceof Error ? error.message : String(error), error instanceof Error ? error : undefined);
    }
  }
  
  /**
   * Load plugins from multiple sources
   */
  async loadPluginsFromSources(sources: string[]): Promise<TransformPlugin[]> {
    const allPlugins: TransformPlugin[] = [];
    
    for (const source of sources) {
      try {
        const resolvedSource = resolve(source);
        const stat = await this.fileSystem.stat(resolvedSource);
        
        if (stat.isFile()) {
          const plugin = await this.loadPlugin(resolvedSource);
          allPlugins.push(plugin);
        } else if (stat.isDirectory()) {
          const plugins = await this.loadPluginsFromDirectory(resolvedSource);
          allPlugins.push(...plugins);
        }
      } catch (error) {
        this.logger.error(`Failed to load plugins from ${source}:`, error);
        // Continue with other sources
      }
    }
    
    return allPlugins;
  }
  
  /**
   * Validate plugin file before loading
   */
  private async validatePluginFile(filePath: string): Promise<void> {
    if (!await this.fileSystem.exists(filePath)) {
      throw new PluginLoadError(filePath, 'Plugin file does not exist');
    }
    
    const stat = await this.fileSystem.stat(filePath);
    if (!stat.isFile()) {
      throw new PluginLoadError(filePath, 'Path is not a file');
    }
    
    const fileExt = extname(filePath);
    if (!this.config.allowedExtensions.includes(fileExt)) {
      throw new PluginLoadError(filePath, `Unsupported file extension: ${fileExt}`);
    }
  }
  
  /**
   * Load plugin module using dynamic import
   */
  private async loadPluginModule(filePath: string): Promise<unknown> {
    try {
      // Use dynamic import for both CommonJS and ES modules
      const module = await import(filePath);
      return module;
    } catch (error) {
      throw new PluginLoadError(filePath, `Failed to import module: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error : undefined);
    }
  }
  
  /**
   * Extract plugin from loaded module
   */
  private extractPlugin(module: any, filePath: string): TransformPlugin {
    // Try different export patterns
    let plugin = module.default || module;
    
    if (typeof plugin === 'function') {
      // Plugin might be a factory function
      try {
        plugin = plugin();
      } catch (error) {
        throw new PluginLoadError(filePath, `Plugin factory function failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    if (!plugin || typeof plugin !== 'object') {
      throw new PluginLoadError(filePath, 'Plugin module must export an object or function that returns an object');
    }
    
    return plugin;
  }
}