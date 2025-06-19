/**
 * Plugin Validator
 * 
 * Validates plugin structure and compliance with interfaces.
 * Following SRP - single responsibility for plugin validation.
 */

import type { 
  TransformPlugin, 
  BasePlugin,
  ContentTransformPlugin,
  FileProcessPlugin,
  ValidatorPlugin,
  PostProcessPlugin
} from '../interfaces/TransformPlugin';
import { PluginType } from '../interfaces/PluginMetadata';

/**
 * Validation errors for plugin loading
 */
export class PluginValidationError extends Error {
  constructor(
    public readonly pluginPath: string,
    message: string,
    public readonly validationErrors: string[]
  ) {
    super(`Plugin validation failed for ${pluginPath}: ${message}`);
    this.name = 'PluginValidationError';
  }
}

/**
 * Plugin validator class
 */
export class PluginValidator {
  /**
   * Validate that an object conforms to the plugin interface
   */
  validatePlugin(plugin: unknown, pluginPath: string): plugin is TransformPlugin {
    const errors: string[] = [];
    
    if (!this.isObject(plugin)) {
      errors.push('Plugin must be an object');
      throw new PluginValidationError(pluginPath, 'Invalid plugin structure', errors);
    }
    
    // Validate base plugin requirements
    this.validateBasePlugin(plugin, errors);
    
    // Validate specific plugin type requirements
    this.validatePluginType(plugin, errors);
    
    if (errors.length > 0) {
      throw new PluginValidationError(pluginPath, 'Plugin validation failed', errors);
    }
    
    return true;
  }
  
  /**
   * Validate base plugin requirements
   */
  private validateBasePlugin(plugin: any, errors: string[]): void {
    // Check metadata
    if (!plugin.metadata || typeof plugin.metadata !== 'object') {
      errors.push('Plugin must have metadata object');
      return;
    }
    
    const { metadata } = plugin;
    
    if (!metadata.name || typeof metadata.name !== 'string') {
      errors.push('Plugin metadata must have a string name');
    }
    
    if (!metadata.version || typeof metadata.version !== 'string') {
      errors.push('Plugin metadata must have a string version');
    }
    
    if (!metadata.description || typeof metadata.description !== 'string') {
      errors.push('Plugin metadata must have a string description');
    }
    
    if (!metadata.type || !Object.values(PluginType).includes(metadata.type)) {
      errors.push(`Plugin metadata must have a valid type (${Object.values(PluginType).join(', ')})`);
    }
    
    if (metadata.priority !== undefined && typeof metadata.priority !== 'number') {
      errors.push('Plugin metadata priority must be a number');
    }
    
    if (metadata.async !== undefined && typeof metadata.async !== 'boolean') {
      errors.push('Plugin metadata async must be a boolean');
    }
    
    // Check optional lifecycle methods
    if (plugin.init && typeof plugin.init !== 'function') {
      errors.push('Plugin init must be a function if provided');
    }
    
    if (plugin.cleanup && typeof plugin.cleanup !== 'function') {
      errors.push('Plugin cleanup must be a function if provided');
    }
  }
  
  /**
   * Validate plugin type-specific requirements
   */
  private validatePluginType(plugin: any, errors: string[]): void {
    const pluginType = plugin.metadata?.type;
    
    switch (pluginType) {
      case PluginType.CONTENT_TRANSFORMER:
        this.validateContentTransformPlugin(plugin, errors);
        break;
      case PluginType.FILE_PROCESSOR:
        this.validateFileProcessPlugin(plugin, errors);
        break;
      case PluginType.VALIDATOR:
        this.validateValidatorPlugin(plugin, errors);
        break;
      case PluginType.POST_PROCESSOR:
        this.validatePostProcessPlugin(plugin, errors);
        break;
    }
  }
  
  /**
   * Validate content transform plugin
   */
  private validateContentTransformPlugin(plugin: any, errors: string[]): void {
    if (!plugin.transform || typeof plugin.transform !== 'function') {
      errors.push('Content transform plugin must have a transform function');
    }
  }
  
  /**
   * Validate file process plugin
   */
  private validateFileProcessPlugin(plugin: any, errors: string[]): void {
    if (!plugin.processFile || typeof plugin.processFile !== 'function') {
      errors.push('File process plugin must have a processFile function');
    }
  }
  
  /**
   * Validate validator plugin
   */
  private validateValidatorPlugin(plugin: any, errors: string[]): void {
    if (!plugin.validate || typeof plugin.validate !== 'function') {
      errors.push('Validator plugin must have a validate function');
    }
  }
  
  /**
   * Validate post process plugin
   */
  private validatePostProcessPlugin(plugin: any, errors: string[]): void {
    if (!plugin.postProcess || typeof plugin.postProcess !== 'function') {
      errors.push('Post process plugin must have a postProcess function');
    }
  }
  
  /**
   * Check if value is an object
   */
  private isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
  
  /**
   * Validate plugin name format
   */
  validatePluginName(name: string): boolean {
    // Plugin names should be kebab-case
    return /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name);
  }
  
  /**
   * Validate plugin version format
   */
  validatePluginVersion(version: string): boolean {
    // Basic semver validation
    return /^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$/.test(version);
  }
}