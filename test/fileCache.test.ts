import { MemoryFileCache } from '../src/fileCache';

describe('MemoryFileCache', () => {
  let cache: MemoryFileCache;

  beforeEach(() => {
    cache = new MemoryFileCache();
  });

  describe('basic operations', () => {
    it('should store and retrieve content', () => {
      cache.set('/path/to/file.md', 'Hello, world!');
      
      const entry = cache.get('/path/to/file.md');
      expect(entry).toBeDefined();
      expect(entry?.content).toBe('Hello, world!');
      expect(entry?.size).toBe(13); // "Hello, world!" is 13 bytes
      expect(entry?.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should return undefined for missing entries', () => {
      const entry = cache.get('/nonexistent');
      expect(entry).toBeUndefined();
    });

    it('should overwrite existing entries', () => {
      cache.set('/file.md', 'Original');
      cache.set('/file.md', 'Updated');
      
      const entry = cache.get('/file.md');
      expect(entry?.content).toBe('Updated');
    });

    it('should handle empty content', () => {
      cache.set('/empty.md', '');
      
      const entry = cache.get('/empty.md');
      expect(entry?.content).toBe('');
      expect(entry?.size).toBe(0);
    });
  });

  describe('Unicode content', () => {
    it('should correctly calculate size for Unicode content', () => {
      const unicodeContent = '你好世界 😀';
      cache.set('/unicode.md', unicodeContent);
      
      const entry = cache.get('/unicode.md');
      expect(entry?.content).toBe(unicodeContent);
      // UTF-8 byte length: 你(3) 好(3) 世(3) 界(3) space(1) 😀(4) = 17 bytes
      expect(entry?.size).toBe(17);
    });
  });

  describe('statistics', () => {
    it('should track cache hits and misses', () => {
      cache.set('/file1.md', 'content1');
      cache.set('/file2.md', 'content2');
      
      // Initial stats
      let stats = cache.stats();
      expect(stats.size).toBe(2);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      
      // Cache hit
      cache.get('/file1.md');
      stats = cache.stats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(0);
      
      // Cache miss
      cache.get('/file3.md');
      stats = cache.stats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      
      // Another hit
      cache.get('/file2.md');
      stats = cache.stats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
    });

    it('should calculate total cache size', () => {
      cache.set('/file1.md', 'Hello'); // 5 bytes
      cache.set('/file2.md', 'World!'); // 6 bytes
      cache.set('/file3.md', '你好'); // 6 bytes UTF-8
      
      expect(cache.getTotalSize()).toBe(17);
    });
  });

  describe('clear operation', () => {
    it('should clear all entries and reset stats', () => {
      cache.set('/file1.md', 'content1');
      cache.set('/file2.md', 'content2');
      cache.get('/file1.md');
      cache.get('/missing.md');
      
      cache.clear();
      
      const stats = cache.stats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      
      expect(cache.get('/file1.md')).toBeUndefined();
      expect(cache.get('/file2.md')).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle very long paths', () => {
      const longPath = '/very/long/path/'.repeat(100) + 'file.md';
      cache.set(longPath, 'content');
      
      expect(cache.get(longPath)?.content).toBe('content');
    });

    it('should handle large content', () => {
      const largeContent = 'x'.repeat(1024 * 1024); // 1MB
      cache.set('/large.md', largeContent);
      
      const entry = cache.get('/large.md');
      expect(entry?.content).toBe(largeContent);
      expect(entry?.size).toBe(1024 * 1024);
    });
  });
});