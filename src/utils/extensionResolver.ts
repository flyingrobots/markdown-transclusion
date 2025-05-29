import * as path from 'path';

/**
 * Extension resolution strategy
 */
export interface ExtensionStrategy {
  /**
   * Name of the strategy
   */
  name: string;
  
  /**
   * Check if a path should use this strategy
   */
  shouldApply(filePath: string): boolean;
  
  /**
   * Generate paths to try
   */
  generatePaths(filePath: string, extensions: string[]): string[];
}

/**
 * Default strategy: try path as-is, then with each extension
 */
export class DefaultExtensionStrategy implements ExtensionStrategy {
  name = 'default';
  
  shouldApply(filePath: string): boolean {
    // Apply to paths without extensions
    return path.extname(filePath) === '';
  }
  
  generatePaths(filePath: string, extensions: string[]): string[] {
    const paths = [filePath]; // Try without extension first
    
    // Add each extension
    for (const ext of extensions) {
      const extWithDot = ext.startsWith('.') ? ext : '.' + ext;
      paths.push(filePath + extWithDot);
    }
    
    return paths;
  }
}

/**
 * Explicit extension strategy: only try the path as-is
 */
export class ExplicitExtensionStrategy implements ExtensionStrategy {
  name = 'explicit';
  
  shouldApply(filePath: string): boolean {
    // Apply to paths with extensions
    return path.extname(filePath) !== '';
  }
  
  generatePaths(filePath: string, extensions: string[]): string[] {
    // Only try the exact path
    return [filePath];
  }
}

/**
 * Priority extension strategy: try extensions in priority order
 */
export class PriorityExtensionStrategy implements ExtensionStrategy {
  name = 'priority';
  
  constructor(private priorityMap: Map<string, number>) {}
  
  shouldApply(filePath: string): boolean {
    return path.extname(filePath) === '';
  }
  
  generatePaths(filePath: string, extensions: string[]): string[] {
    const paths = [filePath];
    
    // Sort extensions by priority
    const sortedExts = [...extensions].sort((a, b) => {
      const priorityA = this.priorityMap.get(a) ?? 999;
      const priorityB = this.priorityMap.get(b) ?? 999;
      return priorityA - priorityB;
    });
    
    for (const ext of sortedExts) {
      const extWithDot = ext.startsWith('.') ? ext : '.' + ext;
      paths.push(filePath + extWithDot);
    }
    
    return paths;
  }
}

/**
 * Extension resolver using strategy pattern
 */
export class ExtensionResolver {
  private strategies: ExtensionStrategy[] = [];
  
  constructor() {
    // Add default strategies
    this.addStrategy(new ExplicitExtensionStrategy());
    this.addStrategy(new DefaultExtensionStrategy());
  }
  
  /**
   * Add a strategy to the resolver
   */
  addStrategy(strategy: ExtensionStrategy): void {
    // Add new strategies at the beginning for priority
    this.strategies.unshift(strategy);
  }
  
  /**
   * Remove a strategy by name
   */
  removeStrategy(name: string): void {
    this.strategies = this.strategies.filter(s => s.name !== name);
  }
  
  /**
   * Resolve paths to try for a given file path
   */
  resolve(filePath: string, extensions: string[]): string[] {
    // Find applicable strategy
    for (const strategy of this.strategies) {
      if (strategy.shouldApply(filePath)) {
        return strategy.generatePaths(filePath, extensions);
      }
    }
    
    // Fallback: just return the path as-is
    return [filePath];
  }
}

/**
 * Create default extension resolver
 */
export function createDefaultResolver(): ExtensionResolver {
  return new ExtensionResolver();
}

/**
 * Create priority-based resolver
 */
export function createPriorityResolver(priorities: Record<string, number>): ExtensionResolver {
  const resolver = new ExtensionResolver();
  resolver.removeStrategy('default');
  resolver.addStrategy(new PriorityExtensionStrategy(new Map(Object.entries(priorities))));
  return resolver;
}

/**
 * Simple function for backward compatibility
 */
export function resolveExtensions(
  filePath: string,
  extensions: string[] = []
): string[] {
  const resolver = createDefaultResolver();
  return resolver.resolve(filePath, extensions);
}