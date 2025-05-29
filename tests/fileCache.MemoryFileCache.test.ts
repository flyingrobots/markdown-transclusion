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

  describe('maxEntrySize', () => {
    it('should cache content smaller than maxEntrySize', () => {
      const cache = new MemoryFileCache(100); // 100 bytes max
      const smallContent = 'a'.repeat(50); // 50 bytes
      
      cache.set('/small.md', smallContent);
      
      const result = cache.get('/small.md');
      expect(result).toBeDefined();
      expect(result?.content).toBe(smallContent);
    });

    it('should not cache content larger than maxEntrySize', () => {
      const cache = new MemoryFileCache(100); // 100 bytes max
      const largeContent = 'a'.repeat(150); // 150 bytes
      
      cache.set('/large.md', largeContent);
      
      const result = cache.get('/large.md');
      expect(result).toBeUndefined();
      expect(cache.stats().size).toBe(0);
    });

    it('should cache content exactly at maxEntrySize', () => {
      const cache = new MemoryFileCache(100); // 100 bytes max
      const exactContent = 'a'.repeat(100); // Exactly 100 bytes
      
      cache.set('/exact.md', exactContent);
      
      const result = cache.get('/exact.md');
      expect(result).toBeDefined();
      expect(result?.content).toBe(exactContent);
    });

    it('should use default maxEntrySize of 1MB when not specified', () => {
      const cache = new MemoryFileCache(); // Default 1MB
      const smallContent = 'a'.repeat(1000); // 1KB
      const largeContent = 'a'.repeat(1024 * 1024 + 1); // 1MB + 1 byte
      
      cache.set('/small.md', smallContent);
      cache.set('/large.md', largeContent);
      
      expect(cache.get('/small.md')).toBeDefined();
      expect(cache.get('/large.md')).toBeUndefined();
    });

    it('should handle UTF-8 multi-byte characters correctly', () => {
      const cache = new MemoryFileCache(12); // 12 bytes max
      const content3Bytes = '你'; // 3 bytes
      const content12Bytes = '你好世界'; // 12 bytes (4 chars * 3 bytes)
      const content15Bytes = '你好世界!'; // 15 bytes
      
      cache.set('/3bytes.md', content3Bytes);
      cache.set('/12bytes.md', content12Bytes);
      cache.set('/15bytes.md', content15Bytes);
      
      expect(cache.get('/3bytes.md')).toBeDefined();
      expect(cache.get('/12bytes.md')).toBeDefined();
      expect(cache.get('/15bytes.md')).toBeUndefined();
    });

    it('should not affect getTotalSize when large entries are rejected', () => {
      const cache = new MemoryFileCache(50);
      
      cache.set('/small1.md', 'a'.repeat(20)); // 20 bytes - cached
      cache.set('/large.md', 'b'.repeat(100)); // 100 bytes - rejected
      cache.set('/small2.md', 'c'.repeat(30)); // 30 bytes - cached
      
      expect(cache.getTotalSize()).toBe(50); // Only the cached entries
      expect(cache.stats().size).toBe(2);
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