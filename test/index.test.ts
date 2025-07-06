import * as markdownTransclusion from '../src/index';

describe('markdown-transclusion exports', () => {
  it('should export all required functions', () => {
    // Parser exports
    expect(markdownTransclusion.parseTransclusionReferences).toBeDefined();
    expect(typeof markdownTransclusion.parseTransclusionReferences).toBe('function');

    // Security exports
    expect(markdownTransclusion.validatePath).toBeDefined();
    expect(typeof markdownTransclusion.validatePath).toBe('function');
    expect(markdownTransclusion.isWithinBasePath).toBeDefined();
    expect(typeof markdownTransclusion.isWithinBasePath).toBe('function');
    expect(markdownTransclusion.SecurityError).toBeDefined();
    expect(markdownTransclusion.SecurityErrorCode).toBeDefined();

    // Resolver exports
    expect(markdownTransclusion.resolvePath).toBeDefined();
    expect(typeof markdownTransclusion.resolvePath).toBe('function');
    expect(markdownTransclusion.substituteVariables).toBeDefined();
    expect(typeof markdownTransclusion.substituteVariables).toBe('function');

    // Cache exports
    expect(markdownTransclusion.NoopFileCache).toBeDefined();
    expect(markdownTransclusion.MemoryFileCache).toBeDefined();

    // File reader exports
    expect(markdownTransclusion.readFile).toBeDefined();
    expect(typeof markdownTransclusion.readFile).toBe('function');
    expect(markdownTransclusion.readFileSync).toBeDefined();
    expect(typeof markdownTransclusion.readFileSync).toBe('function');
    expect(markdownTransclusion.FileReaderError).toBeDefined();
    expect(markdownTransclusion.FileReaderErrorCode).toBeDefined();

    // Stream exports
    expect(markdownTransclusion.TransclusionTransform).toBeDefined();
    expect(markdownTransclusion.createTransclusionStream).toBeDefined();
    expect(typeof markdownTransclusion.createTransclusionStream).toBe('function');

    // Main API exports
    expect(markdownTransclusion.processLine).toBeDefined();
    expect(typeof markdownTransclusion.processLine).toBe('function');
    expect(markdownTransclusion.transclude).toBeDefined();
    expect(typeof markdownTransclusion.transclude).toBe('function');
    expect(markdownTransclusion.transcludeFile).toBeDefined();
    expect(typeof markdownTransclusion.transcludeFile).toBe('function');
  });

  it('should be able to call exported functions', async () => {
    // Test parseTransclusionReferences
    const refs = markdownTransclusion.parseTransclusionReferences('Hello ![[world]]');
    expect(refs).toHaveLength(1);
    expect(refs[0].path).toBe('world');

    // Test substituteVariables
    const substituted = markdownTransclusion.substituteVariables('{{name}}', { name: 'test' });
    expect(substituted).toBe('test');

    // Test validatePath
    const validation = markdownTransclusion.validatePath('test.md');
    expect(validation).toBe(true);

    // Test NoopFileCache
    const noopCache = new markdownTransclusion.NoopFileCache();
    expect(await noopCache.get('test')).toBeUndefined();

    // Test MemoryFileCache
    const memCache = new markdownTransclusion.MemoryFileCache();
    await memCache.set('test', 'hello');
    expect(await memCache.get('test')).toBeDefined();
  });

  it('should export error classes that can be instantiated', () => {
    // Test SecurityError
    const secError = new markdownTransclusion.SecurityError(
      markdownTransclusion.SecurityErrorCode.PATH_TRAVERSAL
    );
    expect(secError).toBeInstanceOf(Error);
    expect(secError.code).toBe(markdownTransclusion.SecurityErrorCode.PATH_TRAVERSAL);

    // Test FileReaderError
    const fileError = new markdownTransclusion.FileReaderError(
      markdownTransclusion.FileReaderErrorCode.FILE_NOT_FOUND,
      'test.md'
    );
    expect(fileError).toBeInstanceOf(Error);
    expect(fileError.code).toBe(markdownTransclusion.FileReaderErrorCode.FILE_NOT_FOUND);
  });

  it('should export stream classes that can be instantiated', () => {
    const stream = markdownTransclusion.createTransclusionStream();
    expect(stream).toBeInstanceOf(markdownTransclusion.TransclusionTransform);
    stream.destroy(); // Clean up
  });
});