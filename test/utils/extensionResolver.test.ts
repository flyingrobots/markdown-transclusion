import {
  ExtensionResolver,
  DefaultExtensionStrategy,
  ExplicitExtensionStrategy,
  PriorityExtensionStrategy,
  createDefaultResolver,
  createPriorityResolver,
  resolveExtensions
} from '../../src/utils/extensionResolver';

describe('extensionResolver', () => {
  describe('DefaultExtensionStrategy', () => {
    const strategy = new DefaultExtensionStrategy();
    
    it('should apply to paths without extensions', () => {
      expect(strategy.shouldApply('file')).toBe(true);
      expect(strategy.shouldApply('path/to/file')).toBe(true);
    });
    
    it('should not apply to paths with extensions', () => {
      expect(strategy.shouldApply('file.txt')).toBe(false);
      expect(strategy.shouldApply('path/to/file.md')).toBe(false);
    });
    
    it('should generate paths with no extension first', () => {
      const paths = strategy.generatePaths('file', ['.md', '.txt']);
      expect(paths).toEqual(['file', 'file.md', 'file.txt']);
    });
  });

  describe('ExplicitExtensionStrategy', () => {
    const strategy = new ExplicitExtensionStrategy();
    
    it('should apply to paths with extensions', () => {
      expect(strategy.shouldApply('file.txt')).toBe(true);
      expect(strategy.shouldApply('path/to/file.md')).toBe(true);
    });
    
    it('should not apply to paths without extensions', () => {
      expect(strategy.shouldApply('file')).toBe(false);
      expect(strategy.shouldApply('path/to/file')).toBe(false);
    });
    
    it('should only return the original path', () => {
      const paths = strategy.generatePaths('file.txt', ['.md', '.doc']);
      expect(paths).toEqual(['file.txt']);
    });
  });

  describe('PriorityExtensionStrategy', () => {
    const priorityMap = new Map([
      ['.md', 1],
      ['.markdown', 2],
      ['.txt', 3]
    ]);
    const strategy = new PriorityExtensionStrategy(priorityMap);
    
    it('should apply to paths without extensions', () => {
      expect(strategy.shouldApply('file')).toBe(true);
    });
    
    it('should generate paths in priority order', () => {
      const paths = strategy.generatePaths('file', ['.txt', '.md', '.markdown']);
      expect(paths).toEqual(['file', 'file.md', 'file.markdown', 'file.txt']);
    });
    
    it('should handle extensions without priority', () => {
      const paths = strategy.generatePaths('file', ['.doc', '.md', '.xyz']);
      expect(paths).toEqual(['file', 'file.md', 'file.doc', 'file.xyz']);
    });
  });

  describe('ExtensionResolver', () => {
    it('should use default strategies', () => {
      const resolver = new ExtensionResolver();
      
      // Path with extension
      expect(resolver.resolve('file.txt', ['.md'])).toEqual(['file.txt']);
      
      // Path without extension
      expect(resolver.resolve('file', ['.md', '.txt'])).toEqual(['file', 'file.md', 'file.txt']);
    });
    
    it('should allow adding custom strategies', () => {
      const resolver = new ExtensionResolver();
      const customStrategy = {
        name: 'custom',
        shouldApply: (path: string) => path.startsWith('special/'),
        generatePaths: (path: string) => [`${path}.special`]
      };
      
      resolver.addStrategy(customStrategy);
      
      expect(resolver.resolve('special/file', ['.md'])).toEqual(['special/file.special']);
    });
    
    it('should allow removing strategies', () => {
      const resolver = new ExtensionResolver();
      resolver.removeStrategy('default');
      
      // Without default strategy, paths without extensions only try explicit
      expect(resolver.resolve('file', ['.md'])).toEqual(['file']);
    });
    
    it('should fallback to original path if no strategy applies', () => {
      const resolver = new ExtensionResolver();
      resolver.removeStrategy('default');
      resolver.removeStrategy('explicit');
      
      expect(resolver.resolve('file', ['.md'])).toEqual(['file']);
    });
  });

  describe('Factory functions', () => {
    it('createDefaultResolver should create standard resolver', () => {
      const resolver = createDefaultResolver();
      
      expect(resolver.resolve('file', ['.md'])).toEqual(['file', 'file.md']);
      expect(resolver.resolve('file.txt', ['.md'])).toEqual(['file.txt']);
    });
    
    it('createPriorityResolver should create priority-based resolver', () => {
      const resolver = createPriorityResolver({
        '.md': 1,
        '.txt': 3,
        '.doc': 2
      });
      
      const paths = resolver.resolve('file', ['.txt', '.doc', '.md']);
      expect(paths).toEqual(['file', 'file.md', 'file.doc', 'file.txt']);
    });
  });

  describe('resolveExtensions (compatibility)', () => {
    it('should work like generatePathsToTry', () => {
      expect(resolveExtensions('file', ['.md', '.txt'])).toEqual(['file', 'file.md', 'file.txt']);
      expect(resolveExtensions('file.md', ['.txt'])).toEqual(['file.md']);
    });
    
    it('should handle empty extensions', () => {
      expect(resolveExtensions('file', [])).toEqual(['file']);
    });
  });
});