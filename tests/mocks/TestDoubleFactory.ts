import { MockFileCache } from './MockFileCache';
import { MockFileSystem } from './MockFileSystem';
import type { FileCache } from '../../src/types';

/**
 * Factory for creating test doubles (mocks, stubs, spies)
 * Centralizes creation of test-friendly implementations
 */
export class TestDoubleFactory {
  /**
   * Create a mock file cache with full interaction tracking
   */
  static createMockFileCache(): MockFileCache {
    return new MockFileCache();
  }
  
  /**
   * Create a stub file cache that always returns the same content
   */
  static createStubFileCache(stubContent: string = 'stub content'): FileCache {
    return {
      get: (path: string) => ({
        content: stubContent,
        timestamp: Date.now(),
        size: Buffer.byteLength(stubContent, 'utf8')
      }),
      set: () => {},
      clear: () => {},
      stats: () => ({ size: 1, hits: 0, misses: 0 })
    };
  }
  
  /**
   * Create a failing file cache that always returns undefined
   */
  static createFailingFileCache(): FileCache {
    return {
      get: () => undefined,
      set: () => {},
      clear: () => {},
      stats: () => ({ size: 0, hits: 0, misses: 0 })
    };
  }
  
  /**
   * Create a file cache that throws errors
   */
  static createThrowingFileCache(error: Error = new Error('Cache error')): FileCache {
    return {
      get: () => { throw error; },
      set: () => { throw error; },
      clear: () => { throw error; },
      stats: () => { throw error; }
    };
  }
  
  /**
   * Create a mock file reader using MockFileSystem
   */
  static createMockFileReader(files: Record<string, string> = {}) {
    const fs = new MockFileSystem();
    fs.addFiles(files);
    
    return {
      readFile: (path: string) => fs.readFile(path),
      readFileSync: (path: string) => fs.readFileSync(path),
      exists: (path: string) => fs.exists(path),
      addFile: (path: string, content: string) => fs.addFile(path, content),
      removeFile: (path: string) => fs.removeFile(path),
      setError: (path: string, error: Error) => fs.setError(path, error),
      getAccessLog: () => fs.getAccessLog(),
      clear: () => fs.clear()
    };
  }
  
  /**
   * Create preset cache with specific files
   */
  static createPresetCache(files: Record<string, string>): MockFileCache {
    const cache = new MockFileCache();
    for (const [path, content] of Object.entries(files)) {
      cache.set(path, content);
    }
    // Reset tracking after preset
    cache.getCalls = [];
    cache.setCalls = [];
    cache.hits = 0;
    cache.misses = 0;
    return cache;
  }
}