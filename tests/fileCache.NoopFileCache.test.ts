import { NoopFileCache } from '../src/fileCache';

describe('NoopFileCache', () => {
  let cache: NoopFileCache;

  beforeEach(() => {
    cache = new NoopFileCache();
  });

  describe('get()', () => {
    it('should always return undefined', () => {
      expect(cache.get('/any/path.md')).toBeUndefined();
      expect(cache.get('')).toBeUndefined();
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should return undefined even after set', () => {
      cache.set('/file.md', 'content');
      expect(cache.get('/file.md')).toBeUndefined();
    });
  });

  describe('set()', () => {
    it('should not throw when setting values', () => {
      expect(() => cache.set('/file.md', 'content')).not.toThrow();
      expect(() => cache.set('', '')).not.toThrow();
      expect(() => cache.set('/path', 'x'.repeat(10000))).not.toThrow();
    });

    it('should not store any values', () => {
      cache.set('/file1.md', 'content1');
      cache.set('/file2.md', 'content2');
      
      expect(cache.get('/file1.md')).toBeUndefined();
      expect(cache.get('/file2.md')).toBeUndefined();
    });
  });

  describe('clear()', () => {
    it('should not throw when clearing', () => {
      expect(() => cache.clear()).not.toThrow();
    });

    it('should work even when called multiple times', () => {
      expect(() => {
        cache.clear();
        cache.clear();
        cache.clear();
      }).not.toThrow();
    });
  });

  describe('stats()', () => {
    it('should always return zeros', () => {
      const stats = cache.stats();
      expect(stats).toEqual({ size: 0, hits: 0, misses: 0 });
    });

    it('should return zeros even after operations', () => {
      cache.set('/file.md', 'content');
      cache.get('/file.md');
      cache.get('/missing.md');
      cache.clear();
      
      const stats = cache.stats();
      expect(stats).toEqual({ size: 0, hits: 0, misses: 0 });
    });
  });

  describe('getTotalSize()', () => {
    it('should always return 0', () => {
      expect(cache.getTotalSize()).toBe(0);
    });

    it('should return 0 even after set operations', () => {
      cache.set('/large.md', 'x'.repeat(10000));
      cache.set('/utf8.md', '你好世界');
      
      expect(cache.getTotalSize()).toBe(0);
    });
  });

  describe('noop behavior verification', () => {
    it('should truly do nothing - no side effects', () => {
      const initialStats = cache.stats();
      const initialSize = cache.getTotalSize();
      
      // Perform many operations
      for (let i = 0; i < 100; i++) {
        cache.set(`/file${i}.md`, `content${i}`);
        cache.get(`/file${i}.md`);
      }
      cache.clear();
      
      // Verify nothing changed
      expect(cache.stats()).toEqual(initialStats);
      expect(cache.getTotalSize()).toBe(initialSize);
      
      // All gets still return undefined
      expect(cache.get('/file0.md')).toBeUndefined();
      expect(cache.get('/file99.md')).toBeUndefined();
    });
  });
});