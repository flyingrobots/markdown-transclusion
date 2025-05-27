import type {
  TransclusionOptions,
  TransclusionError,
  TransclusionResult,
  ParsedReference,
  ResolvedPath,
  FileCacheEntry,
  FileCache,
  TransclusionTransform
} from '../src';

describe('Type Definitions', () => {
  it('should compile TransclusionOptions interface', () => {
    const options: TransclusionOptions = {
      basePath: '/path/to/base',
      extensions: ['.md', '.markdown'],
      maxDepth: 5,
      variables: { lang: 'en' },
      strict: true,
      validateOnly: false
    };
    expect(options).toBeDefined();
  });

  it('should compile TransclusionError interface', () => {
    const error: TransclusionError = {
      message: 'File not found',
      path: '/path/to/file.md',
      line: 10,
      code: 'FILE_NOT_FOUND'
    };
    expect(error).toBeDefined();
  });

  it('should compile TransclusionResult interface', () => {
    const result: TransclusionResult = {
      content: 'Processed content',
      errors: [],
      processedFiles: ['/path/to/file1.md', '/path/to/file2.md']
    };
    expect(result).toBeDefined();
  });

  it('should compile ParsedReference interface', () => {
    const reference: ParsedReference = {
      original: '![[file.md]]',
      path: 'file.md',
      startIndex: 0,
      endIndex: 12,
      heading: 'section'
    };
    expect(reference).toBeDefined();
  });

  it('should compile ResolvedPath interface', () => {
    const resolved: ResolvedPath = {
      absolutePath: '/absolute/path/to/file.md',
      exists: true,
      originalReference: 'file.md',
      error: undefined
    };
    expect(resolved).toBeDefined();
  });

  it('should compile FileCacheEntry interface', () => {
    const entry: FileCacheEntry = {
      content: 'File content',
      timestamp: Date.now(),
      size: 12
    };
    expect(entry).toBeDefined();
  });

  it('should compile FileCache interface', () => {
    const cache: FileCache = {
      get: (path: string) => undefined,
      set: (path: string, content: string) => {},
      clear: () => {},
      stats: () => ({ size: 0, hits: 0, misses: 0 })
    };
    expect(cache).toBeDefined();
  });

  it('should allow partial TransclusionOptions', () => {
    const minimalOptions: TransclusionOptions = {
      basePath: '/path'
    };
    expect(minimalOptions).toBeDefined();
  });

  it('should allow empty TransclusionOptions', () => {
    const emptyOptions: TransclusionOptions = {};
    expect(emptyOptions).toBeDefined();
  });
});