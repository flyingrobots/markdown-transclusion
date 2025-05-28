import type { FileCache, FileCacheEntry } from '../../src/types';

/**
 * Mock file cache for testing
 * Tracks all interactions for verification
 */
export class MockFileCache implements FileCache {
  private cache = new Map<string, FileCacheEntry>();
  
  // Call tracking
  getCalls: string[] = [];
  setCalls: Array<{ path: string; content: string }> = [];
  clearCalls = 0;
  statsCalls = 0;
  getTotalSizeCalls = 0;
  
  // Stats tracking
  hits = 0;
  misses = 0;
  
  get(path: string): FileCacheEntry | undefined {
    this.getCalls.push(path);
    const entry = this.cache.get(path);
    
    if (entry) {
      this.hits++;
      return entry;
    }
    
    this.misses++;
    return undefined;
  }
  
  set(path: string, content: string): void {
    this.setCalls.push({ path, content });
    this.cache.set(path, {
      content,
      timestamp: Date.now(),
      size: Buffer.byteLength(content, 'utf8')
    });
  }
  
  clear(): void {
    this.clearCalls++;
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
  
  stats(): { size: number; hits: number; misses: number } {
    this.statsCalls++;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses
    };
  }
  
  getTotalSize(): number {
    this.getTotalSizeCalls++;
    let total = 0;
    for (const entry of this.cache.values()) {
      total += entry.size;
    }
    return total;
  }
  
  // Test helpers
  getCallCount(): number {
    return this.getCalls.length;
  }
  
  setCallCount(): number {
    return this.setCalls.length;
  }
  
  wasCalled(path: string): boolean {
    return this.getCalls.includes(path);
  }
  
  wasSet(path: string): boolean {
    return this.setCalls.some(call => call.path === path);
  }
  
  reset(): void {
    this.clear();
    this.getCalls = [];
    this.setCalls = [];
    this.clearCalls = 0;
    this.statsCalls = 0;
    this.getTotalSizeCalls = 0;
  }
}