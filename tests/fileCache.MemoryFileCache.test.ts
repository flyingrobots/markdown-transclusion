import { MemoryFileCache } from '../src/fileCache';

describe('MemoryFileCache', () => {
  let cache: MemoryFileCache;

  beforeEach(() => {
    cache = new MemoryFileCache();
  });

  describe('get()', () => {
    it('should return undefined for cache miss', () => {
      const result = cache.get('/path/to/missing.md');
      
      expect(result).toBeUndefined();
    });

    it('should return correct value for cache hit', () => {
      const content = '# Test Document\n\nThis is cached content.';
      cache.set('/path/to/file.md', content);
      
      const result = cache.get('/path/to/file.md');
      
      expect(result).toBeDefined();
      expect(result?.content).toBe(content);
    });

    it('should return cached entry with correct metadata', () => {
      const content = 'Short content';
      const beforeTime = Date.now();
      
      cache.set('/test.md', content);
      
      const afterTime = Date.now();
      const result = cache.get('/test.md');
      
      expect(result).toBeDefined();
      expect(result?.content).toBe(content);
      expect(result?.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(result?.timestamp).toBeLessThanOrEqual(afterTime);
      expect(result?.size).toBe(Buffer.byteLength(content, 'utf8'));
    });

    it('should handle empty string key', () => {
      cache.set('', 'empty key content');
      
      const result = cache.get('');
      
      expect(result).toBeDefined();
      expect(result?.content).toBe('empty key content');
    });

    it('should handle very long path keys', () => {
      const longPath = '/very/long/path/' + 'a'.repeat(1000) + '.md';
      cache.set(longPath, 'content');
      
      const result = cache.get(longPath);
      
      expect(result).toBeDefined();
      expect(result?.content).toBe('content');
    });
  });

  describe('set()', () => {
    it('should add new entry to cache', () => {
      const path = '/new/file.md';
      const content = 'New content';
      
      expect(cache.get(path)).toBeUndefined();
      
      cache.set(path, content);
      
      const result = cache.get(path);
      expect(result).toBeDefined();
      expect(result?.content).toBe(content);
    });

    it('should overwrite existing entry', () => {
      const path = '/file.md';
      const content1 = 'Original content';
      const content2 = 'Updated content';
      
      cache.set(path, content1);
      const result1 = cache.get(path);
      expect(result1?.content).toBe(content1);
      
      cache.set(path, content2);
      const result2 = cache.get(path);
      expect(result2?.content).toBe(content2);
    });

    it('should update timestamp when overwriting', () => {
      const path = '/file.md';
      
      cache.set(path, 'content1');
      const firstEntry = cache.get(path);
      const firstTimestamp = firstEntry?.timestamp;
      
      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        cache.set(path, 'content2');
        const secondEntry = cache.get(path);
        const secondTimestamp = secondEntry?.timestamp;
        
        expect(secondTimestamp).toBeGreaterThan(firstTimestamp!);
      }, 10);
    });

    it('should calculate correct size for UTF-8 content', () => {
      // Test ASCII
      cache.set('/ascii.md', 'Hello');
      expect(cache.get('/ascii.md')?.size).toBe(5);
      
      // Test UTF-8 with multi-byte characters
      cache.set('/utf8.md', '你好'); // Chinese "Hello"
      expect(cache.get('/utf8.md')?.size).toBe(6); // 3 bytes per character
      
      // Test emoji
      cache.set('/emoji.md', '😀');
      expect(cache.get('/emoji.md')?.size).toBe(4); // 4 bytes for emoji
    });

    it('should handle empty content', () => {
      cache.set('/empty.md', '');
      
      const result = cache.get('/empty.md');
      expect(result).toBeDefined();
      expect(result?.content).toBe('');
      expect(result?.size).toBe(0);
    });
  });

  describe('clear()', () => {
    it('should remove all cached entries', () => {
      cache.set('/file1.md', 'content1');
      cache.set('/file2.md', 'content2');
      cache.set('/file3.md', 'content3');
      
      expect(cache.get('/file1.md')).toBeDefined();
      expect(cache.get('/file2.md')).toBeDefined();
      expect(cache.get('/file3.md')).toBeDefined();
      
      cache.clear();
      
      expect(cache.get('/file1.md')).toBeUndefined();
      expect(cache.get('/file2.md')).toBeUndefined();
      expect(cache.get('/file3.md')).toBeUndefined();
    });

    it('should reset hit and miss counters', () => {
      cache.set('/file.md', 'content');
      
      // Generate some hits and misses
      cache.get('/file.md'); // hit
      cache.get('/file.md'); // hit
      cache.get('/missing.md'); // miss
      
      let stats = cache.stats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      
      cache.clear();
      
      stats = cache.stats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(0);
    });

    it('should work on empty cache', () => {
      expect(() => cache.clear()).not.toThrow();
      
      const stats = cache.stats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('stats()', () => {
    it('should return accurate statistics', () => {
      // Initial state
      let stats = cache.stats();
      expect(stats).toEqual({ size: 0, hits: 0, misses: 0 });
      
      // Add some entries
      cache.set('/file1.md', 'content1');
      cache.set('/file2.md', 'content2');
      
      stats = cache.stats();
      expect(stats.size).toBe(2);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      
      // Generate hits
      cache.get('/file1.md');
      cache.get('/file2.md');
      
      stats = cache.stats();
      expect(stats.hits).toBe(2);
      
      // Generate misses
      cache.get('/missing1.md');
      cache.get('/missing2.md');
      cache.get('/missing3.md');
      
      stats = cache.stats();
      expect(stats.misses).toBe(3);
    });

    it('should track cumulative hits and misses', () => {
      cache.set('/file.md', 'content');
      
      // Multiple operations
      for (let i = 0; i < 10; i++) {
        cache.get('/file.md'); // hit
      }
      
      for (let i = 0; i < 5; i++) {
        cache.get(`/missing${i}.md`); // miss
      }
      
      const stats = cache.stats();
      expect(stats.hits).toBe(10);
      expect(stats.misses).toBe(5);
      expect(stats.size).toBe(1);
    });
  });

  describe('getTotalSize()', () => {
    it('should calculate total size of all cached content', () => {
      cache.set('/small.md', 'abc'); // 3 bytes
      cache.set('/medium.md', 'hello world'); // 11 bytes
      cache.set('/large.md', 'x'.repeat(100)); // 100 bytes
      
      const totalSize = cache.getTotalSize();
      expect(totalSize).toBe(3 + 11 + 100);
    });

    it('should return 0 for empty cache', () => {
      expect(cache.getTotalSize()).toBe(0);
    });

    it('should handle UTF-8 content correctly', () => {
      cache.set('/utf8.md', '你好世界'); // 12 bytes (3 bytes per character)
      cache.set('/mixed.md', 'Hello 世界'); // 12 bytes (5 + 1 + 6 for two Chinese chars)
      
      const totalSize = cache.getTotalSize();
      expect(totalSize).toBe(12 + 12);
    });

    it('should update when entries are overwritten', () => {
      cache.set('/file.md', 'short'); // 5 bytes
      expect(cache.getTotalSize()).toBe(5);
      
      cache.set('/file.md', 'much longer content'); // 19 bytes
      expect(cache.getTotalSize()).toBe(19);
    });
  });

  describe('edge cases', () => {
    it('should handle rapid get/set operations', () => {
      const iterations = 1000;
      
      // Rapid sets
      for (let i = 0; i < iterations; i++) {
        cache.set(`/file${i}.md`, `content${i}`);
      }
      
      // Rapid gets
      for (let i = 0; i < iterations; i++) {
        const result = cache.get(`/file${i}.md`);
        expect(result?.content).toBe(`content${i}`);
      }
      
      const stats = cache.stats();
      expect(stats.size).toBe(iterations);
      expect(stats.hits).toBe(iterations);
    });

    it('should handle special characters in paths', () => {
      const specialPaths = [
        '/path with spaces.md',
        '/path/with/中文/characters.md',
        '/path\\with\\backslashes.md',
        '/path?with=query&params.md',
        '/path#with#hashes.md'
      ];
      
      specialPaths.forEach((path, index) => {
        cache.set(path, `content${index}`);
        const result = cache.get(path);
        expect(result?.content).toBe(`content${index}`);
      });
    });

    it('should maintain separate entries for similar paths', () => {
      cache.set('/file.md', 'content1');
      cache.set('/File.md', 'content2'); // Different case
      cache.set('/file.MD', 'content3'); // Different extension case
      
      expect(cache.get('/file.md')?.content).toBe('content1');
      expect(cache.get('/File.md')?.content).toBe('content2');
      expect(cache.get('/file.MD')?.content).toBe('content3');
      
      expect(cache.stats().size).toBe(3);
    });
  });
});