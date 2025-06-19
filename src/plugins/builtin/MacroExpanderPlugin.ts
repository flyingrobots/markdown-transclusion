/**
 * Macro Expander Plugin
 * 
 * Expands custom macros in content during transclusion.
 * Demonstrates ContentTransformPlugin with dynamic content generation.
 */

import type { ContentTransformPlugin, TransformContext } from '../interfaces/TransformPlugin';
import { PluginType, PluginPriority } from '../interfaces/PluginMetadata';

/**
 * Configuration for macro expander plugin
 */
export interface MacroExpanderConfig {
  /** Custom macro definitions */
  macros: Record<string, string>;
  
  /** Whether to enable built-in macros */
  enableBuiltins: boolean;
  
  /** Macro syntax pattern (default: {{MACRO_NAME}}) */
  macroPattern: string;
  
  /** Whether to preserve unknown macros */
  preserveUnknown: boolean;
  
  /** Case sensitivity for macro names */
  caseSensitive: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: MacroExpanderConfig = {
  macros: {},
  enableBuiltins: true,
  macroPattern: '{{([A-Z_][A-Z0-9_]*?)}}',
  preserveUnknown: true,
  caseSensitive: false
};

/**
 * Built-in macro generators
 */
interface MacroGenerator {
  generate(context: TransformContext): string;
  description: string;
}

/**
 * Macro Expander Plugin Implementation
 */
export class MacroExpanderPlugin implements ContentTransformPlugin {
  readonly metadata = {
    name: 'macro-expander',
    version: '1.0.0',
    description: 'Custom macro expansion system for dynamic content',
    author: 'Markdown Transclusion',
    type: PluginType.CONTENT_TRANSFORMER,
    priority: PluginPriority.HIGH, // Run early to expand macros for other plugins
    async: false,
    tags: ['macros', 'templating', 'dynamic']
  };
  
  private config: MacroExpanderConfig = DEFAULT_CONFIG;
  private macroPattern!: RegExp;
  private builtinMacros: Record<string, MacroGenerator> = {};
  
  async init(context: any): Promise<void> {
    // Merge provided configuration with defaults
    if (context.config?.['macro-expander']) {
      this.config = { ...DEFAULT_CONFIG, ...context.config['macro-expander'] };
    }
    
    // Compile macro pattern regex
    this.macroPattern = new RegExp(this.config.macroPattern, 'g');
    
    // Initialize built-in macros
    this.initializeBuiltinMacros();
    
    context.logger.debug('Macro expander plugin initialized', { 
      config: this.config,
      customMacros: Object.keys(this.config.macros).length,
      builtinMacros: Object.keys(this.builtinMacros).length
    });
  }
  
  transform(content: string, context: TransformContext): string {
    return content.replace(this.macroPattern, (match, macroName) => {
      return this.expandMacro(macroName, match, context);
    });
  }
  
  /**
   * Expand a single macro
   */
  private expandMacro(macroName: string, originalMatch: string, context: TransformContext): string {
    const normalizedName = this.config.caseSensitive ? macroName : macroName.toUpperCase();
    
    // Try custom macros first
    if (this.config.macros[normalizedName] !== undefined) {
      return this.config.macros[normalizedName];
    }
    
    // Try built-in macros
    if (this.config.enableBuiltins && this.builtinMacros[normalizedName]) {
      try {
        return this.builtinMacros[normalizedName].generate(context);
      } catch (error) {
        context.logger.warn(`Failed to expand built-in macro ${normalizedName}:`, error);
        return this.config.preserveUnknown ? originalMatch : '';
      }
    }
    
    // Handle unknown macros
    if (this.config.preserveUnknown) {
      return originalMatch;
    } else {
      context.logger.warn(`Unknown macro: ${macroName} in ${context.filePath}`);
      return '';
    }
  }
  
  /**
   * Initialize built-in macro generators
   */
  private initializeBuiltinMacros(): void {
    this.builtinMacros = {
      DATE: {
        description: 'Current date in ISO format',
        generate: () => new Date().toISOString().split('T')[0]
      },
      
      DATETIME: {
        description: 'Current date and time in ISO format',
        generate: () => new Date().toISOString()
      },
      
      TIMESTAMP: {
        description: 'Current Unix timestamp',
        generate: () => Math.floor(Date.now() / 1000).toString()
      },
      
      YEAR: {
        description: 'Current year',
        generate: () => new Date().getFullYear().toString()
      },
      
      MONTH: {
        description: 'Current month (1-12)',
        generate: () => (new Date().getMonth() + 1).toString()
      },
      
      DAY: {
        description: 'Current day of month',
        generate: () => new Date().getDate().toString()
      },
      
      FILE_PATH: {
        description: 'Current file path',
        generate: (context) => context.filePath
      },
      
      FILE_NAME: {
        description: 'Current file name',
        generate: (context) => context.filePath.split('/').pop() || context.filePath
      },
      
      FILE_DIR: {
        description: 'Current file directory',
        generate: (context) => context.filePath.split('/').slice(0, -1).join('/') || '.'
      },
      
      BASE_PATH: {
        description: 'Base path for transclusion',
        generate: (context) => context.basePath
      },
      
      DEPTH: {
        description: 'Current transclusion depth',
        generate: (context) => context.depth.toString()
      },
      
      LINE_NUMBER: {
        description: 'Current line number (if available)',
        generate: (context) => context.lineNumber?.toString() || '0'
      },
      
      RANDOM_ID: {
        description: 'Random alphanumeric ID',
        generate: () => Math.random().toString(36).substr(2, 9)
      },
      
      UUID: {
        description: 'Simple UUID v4 (not cryptographically secure)',
        generate: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        })
      },
      
      VARIABLE_COUNT: {
        description: 'Number of defined variables',
        generate: (context) => Object.keys(context.variables).length.toString()
      },
      
      PATH_STACK_SIZE: {
        description: 'Size of current path stack',
        generate: (context) => context.pathStack.length.toString()
      }
    };
    
    // Add variable access macros
    // This allows accessing variables with {{VAR:variable_name}} syntax
    this.builtinMacros.VAR = {
      description: 'Access variable value (use VAR:variable_name)',
      generate: (context) => {
        // This is a special case - the macro name contains the variable name
        // The actual implementation would need to parse the full macro text
        return '[VAR macro requires variable name]';
      }
    };
  }
  
  /**
   * Get available macros (for documentation/help)
   */
  getAvailableMacros(): Record<string, string> {
    const available: Record<string, string> = {};
    
    // Add custom macros
    for (const [name, value] of Object.entries(this.config.macros)) {
      available[name] = `Custom macro: ${value}`;
    }
    
    // Add built-in macros
    if (this.config.enableBuiltins) {
      for (const [name, generator] of Object.entries(this.builtinMacros)) {
        available[name] = generator.description;
      }
    }
    
    return available;
  }
  
  /**
   * Add or update a custom macro
   */
  addMacro(name: string, value: string): void {
    this.config.macros[name] = value;
  }
  
  /**
   * Remove a custom macro
   */
  removeMacro(name: string): void {
    delete this.config.macros[name];
  }
}