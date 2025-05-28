import type { FileCache, FileCacheEntry } from './types';

/**
 * No-op file cache implementation (default)
 * Does nothing, just passes through
 */
export class NoopFileCache implements FileCache {
  get(_path: string): FileCacheEntry | undefined {
    return undefined;
  }

  set(_path: string, _content: string): void {
    // Do nothing
  }

  clear(): void {
    // Do nothing
  }

  stats(): { size: number; hits: number; misses: number } {
    return { size: 0, hits: 0, misses: 0 };
  }

  getTotalSize(): number {
    return 0;
  }
}

/**
 * Simple in-memory file cache implementation
 */
export class MemoryFileCache implements FileCache {
  private cache = new Map<string, FileCacheEntry>();
  private hits = 0;
  private misses = 0;

  /**
   * Get cached content for a path
   * @param path The file path
   * @returns Cached entry or undefined
   */
  get(path: string): FileCacheEntry | undefined {
    const entry = this.cache.get(path);
    if (entry) {
      this.hits++;
      return entry;
    }
    this.misses++;
    return undefined;
  }

  /**
   * Store content in cache
   * @param path The file path
   * @param content The file content
   */
  set(path: string, content: string): void {
    this.cache.set(path, {
      content,
      timestamp: Date.now(),
      size: Buffer.byteLength(content, 'utf8')
    });
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   * @returns Cache stats
   */
  stats(): { size: number; hits: number; misses: number } {
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses
    };
  }

  /**
   * Get total cached bytes
   * @returns Total size in bytes
   */
  getTotalSize(): number {
    let total = 0;
    for (const entry of this.cache.values()) {
      total += entry.size;
    }
    return total;
  }
}

export type { FileCache, FileCacheEntry }; // if FileCacheEntry is also needed