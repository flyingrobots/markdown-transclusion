/**
 * Core cache interfaces and implementations
 */

/**
 * Cached file content with metadata
 */
export interface CachedFileContent {
  content: string;
  timestamp: number;
  size: number;
}

/**
 * File cache interface for transclusion operations
 */
export interface FileCache {
  /**
   * Get cached content for a path
   */
  get(path: string): CachedFileContent | undefined;
  
  /**
   * Store content in cache
   */
  set(path: string, content: string): void;
  
  /**
   * Clear all cached entries
   */
  clear(): void;
  
  /**
   * Get cache statistics
   */
  stats(): { size: number; hits: number; misses: number };
  
  /**
   * Get total size of cached content in bytes
   */
  getTotalSize(): number;
}

/**
 * No-op file cache implementation (default)
 * Does nothing, just passes through
 */
export class NoopFileCache implements FileCache {
  get(_path: string): CachedFileContent | undefined {
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
  private cache = new Map<string, CachedFileContent>();
  private hits = 0;
  private misses = 0;
  private maxEntrySize: number;

  /**
   * Create a new memory file cache
   * @param maxEntrySize Maximum size in bytes for a single cache entry (default: 1MB)
   */
  constructor(maxEntrySize: number = 1024 * 1024) {
    this.maxEntrySize = maxEntrySize;
  }

  /**
   * Get cached content for a path
   * @param path The file path
   * @returns Cached entry or undefined
   */
  get(path: string): CachedFileContent | undefined {
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
    const size = Buffer.byteLength(content, 'utf8');
    
    // Skip caching if the content exceeds maxEntrySize
    if (size > this.maxEntrySize) {
      return;
    }
    
    this.cache.set(path, {
      content,
      timestamp: Date.now(),
      size
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