import {
  readResolvedRefs,
  ResolvedReference
} from '../../src/utils/transclusionProcessor';
import { readFile } from '../../src/fileReader';
import { extractHeadingContent } from '../../src/utils/headingExtractor';
import { trimForTransclusion } from '../../src/utils/contentProcessing';
import type { TransclusionOptions } from '../../src/types';

jest.mock('../../src/fileReader');
jest.mock('../../src/utils/headingExtractor');
jest.mock('../../src/utils/contentProcessing');

describe('transclusionProcessor - readResolvedRefs', () => {
  const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
  const mockExtractHeading = extractHeadingContent as jest.MockedFunction<typeof extractHeadingContent>;
  const mockTrimContent = trimForTransclusion as jest.MockedFunction<typeof trimForTransclusion>;
  
  const options: TransclusionOptions = {
    basePath: '/test',
    extensions: ['.md']
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default behavior - pass through content
    mockTrimContent.mockImplementation(content => content);
  });

  describe('successful file reading', () => {
    it('should read content for existing files', async () => {
      const resolvedRefs: ResolvedReference[] = [{
        ref: {
          original: '![[doc]]',
          path: 'doc',
          startIndex: 0,
          endIndex: 8
        },
        resolved: {
          absolutePath: '/test/doc.md',
          exists: true,
          originalReference: 'doc'
        }
      }];
      
      mockReadFile.mockResolvedValue('# Document Content\n\nParagraph here.');
      mockTrimContent.mockReturnValue('# Document Content\n\nParagraph here.');
      
      const results = await readResolvedRefs(resolvedRefs, options);
      
      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('# Document Content\n\nParagraph here.');
      expect(results[0].error).toBeUndefined();
      expect(mockReadFile).toHaveBeenCalledWith('/test/doc.md', undefined);
    });

    it('should use cache when provided', async () => {
      const mockCache = { 
        get: jest.fn(), 
        set: jest.fn(),
        clear: jest.fn(),
        stats: jest.fn().mockReturnValue({ hits: 0, misses: 0, size: 0 })
      };
      const optionsWithCache = { ...options, cache: mockCache };
      
      const resolvedRefs: ResolvedReference[] = [{
        ref: {
          original: '![[cached]]',
          path: 'cached',
          startIndex: 0,
          endIndex: 11
        },
        resolved: {
          absolutePath: '/test/cached.md',
          exists: true,
          originalReference: 'cached'
        }
      }];
      
      mockReadFile.mockResolvedValue('Cached content');
      
      await readResolvedRefs(resolvedRefs, optionsWithCache);
      
      expect(mockReadFile).toHaveBeenCalledWith('/test/cached.md', mockCache);
    });
  });

  describe('heading extraction', () => {
    it('should extract specific heading content when requested', async () => {
      const resolvedRefs: ResolvedReference[] = [{
        ref: {
          original: '![[doc#Section 2]]',
          path: 'doc',
          heading: 'Section 2',
          startIndex: 0,
          endIndex: 18
        },
        resolved: {
          absolutePath: '/test/doc.md',
          exists: true,
          originalReference: 'doc'
        }
      }];
      
      const fullContent = '# Title\n\n## Section 1\n\nFirst section.\n\n## Section 2\n\nSecond section.\n\n## Section 3\n\nThird section.';
      mockReadFile.mockResolvedValue(fullContent);
      mockExtractHeading.mockReturnValue('## Section 2\n\nSecond section.');
      mockTrimContent.mockReturnValue('## Section 2\n\nSecond section.');
      
      const results = await readResolvedRefs(resolvedRefs, options);
      
      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('## Section 2\n\nSecond section.');
      expect(mockExtractHeading).toHaveBeenCalledWith(fullContent, 'Section 2');
    });

    it('should return error when heading is not found', async () => {
      const resolvedRefs: ResolvedReference[] = [{
        ref: {
          original: '![[doc#Missing Heading]]',
          path: 'doc',
          heading: 'Missing Heading',
          startIndex: 0,
          endIndex: 24
        },
        resolved: {
          absolutePath: '/test/doc.md',
          exists: true,
          originalReference: 'doc'
        }
      }];
      
      mockReadFile.mockResolvedValue('# Document\n\nContent without the requested heading.');
      mockExtractHeading.mockReturnValue(null);
      
      const results = await readResolvedRefs(resolvedRefs, options);
      
      expect(results).toHaveLength(1);
      expect(results[0].content).toBeUndefined();
      expect(results[0].error).toEqual({
        message: 'Heading "Missing Heading" not found in /test/doc.md',
        path: '/test/doc.md',
        code: 'HEADING_NOT_FOUND'
      });
    });
  });

  describe('error handling', () => {
    it('should handle file read errors', async () => {
      const resolvedRefs: ResolvedReference[] = [{
        ref: {
          original: '![[corrupted]]',
          path: 'corrupted',
          startIndex: 0,
          endIndex: 14
        },
        resolved: {
          absolutePath: '/test/corrupted.md',
          exists: true,
          originalReference: 'corrupted'
        }
      }];
      
      mockReadFile.mockRejectedValue(new Error('EACCES: permission denied'));
      
      const results = await readResolvedRefs(resolvedRefs, options);
      
      expect(results).toHaveLength(1);
      expect(results[0].content).toBeUndefined();
      expect(results[0].error).toEqual({
        message: 'EACCES: permission denied',
        path: '/test/corrupted.md',
        code: 'READ_ERROR'
      });
    });

    it('should handle non-existent files', async () => {
      const resolvedRefs: ResolvedReference[] = [{
        ref: {
          original: '![[missing]]',
          path: 'missing',
          startIndex: 0,
          endIndex: 12
        },
        resolved: {
          absolutePath: '/test/missing.md',
          exists: false,
          originalReference: 'missing',
          error: 'File not found: missing.md'
        }
      }];
      
      const results = await readResolvedRefs(resolvedRefs, options);
      
      expect(results).toHaveLength(1);
      expect(results[0].content).toBeUndefined();
      expect(results[0].error).toEqual({
        message: 'File not found: missing.md',
        path: 'missing',
        code: 'FILE_NOT_FOUND'
      });
      expect(mockReadFile).not.toHaveBeenCalled();
    });

    it('should use default error message when resolved.error is undefined', async () => {
      const resolvedRefs: ResolvedReference[] = [{
        ref: {
          original: '![[notfound]]',
          path: 'notfound',
          startIndex: 0,
          endIndex: 13
        },
        resolved: {
          absolutePath: '/test/notfound.md',
          exists: false,
          originalReference: 'notfound'
          // No error property
        }
      }];
      
      const results = await readResolvedRefs(resolvedRefs, options);
      
      expect(results).toHaveLength(1);
      expect(results[0].error?.message).toBe('File not found');
    });
  });

  describe('multiple references', () => {
    it('should process multiple references independently', async () => {
      const resolvedRefs: ResolvedReference[] = [
        {
          ref: {
            original: '![[success]]',
            path: 'success',
            startIndex: 0,
            endIndex: 12
          },
          resolved: {
            absolutePath: '/test/success.md',
            exists: true,
            originalReference: 'success'
          }
        },
        {
          ref: {
            original: '![[failure]]',
            path: 'failure',
            startIndex: 20,
            endIndex: 32
          },
          resolved: {
            absolutePath: '/test/failure.md',
            exists: true,
            originalReference: 'failure'
          }
        },
        {
          ref: {
            original: '![[missing]]',
            path: 'missing',
            startIndex: 40,
            endIndex: 52
          },
          resolved: {
            absolutePath: '/test/missing.md',
            exists: false,
            originalReference: 'missing'
          }
        }
      ];
      
      mockReadFile
        .mockResolvedValueOnce('Success content')
        .mockRejectedValueOnce(new Error('Read error'));
      mockTrimContent.mockImplementation(c => c);
      
      const results = await readResolvedRefs(resolvedRefs, options);
      
      expect(results).toHaveLength(3);
      expect(results[0].content).toBe('Success content');
      expect(results[0].error).toBeUndefined();
      expect(results[1].content).toBeUndefined();
      expect(results[1].error?.code).toBe('READ_ERROR');
      expect(results[2].content).toBeUndefined();
      expect(results[2].error?.code).toBe('FILE_NOT_FOUND');
    });
  });

  describe('edge cases', () => {
    it('should handle empty resolved refs array', async () => {
      const results = await readResolvedRefs([], options);
      expect(results).toEqual([]);
      expect(mockReadFile).not.toHaveBeenCalled();
    });

    it('should handle binary files', async () => {
      const resolvedRefs: ResolvedReference[] = [{
        ref: {
          original: '![[image.png]]',
          path: 'image.png',
          startIndex: 0,
          endIndex: 14
        },
        resolved: {
          absolutePath: '/test/image.png',
          exists: true,
          originalReference: 'image.png'
        }
      }];
      
      mockReadFile.mockRejectedValue(new Error('Binary file detected'));
      
      const results = await readResolvedRefs(resolvedRefs, options);
      
      expect(results[0].error?.message).toBe('Binary file detected');
    });

    it('should handle very long file paths', async () => {
      const longPath = '/test/' + 'a'.repeat(300) + '.md';
      const resolvedRefs: ResolvedReference[] = [{
        ref: {
          original: '![[' + 'a'.repeat(300) + ']]',
          path: 'a'.repeat(300),
          startIndex: 0,
          endIndex: 306
        },
        resolved: {
          absolutePath: longPath,
          exists: true,
          originalReference: 'a'.repeat(300)
        }
      }];
      
      mockReadFile.mockResolvedValue('Content');
      mockTrimContent.mockReturnValue('Content');
      
      const results = await readResolvedRefs(resolvedRefs, options);
      
      expect(results[0].content).toBe('Content');
      expect(mockReadFile).toHaveBeenCalledWith(longPath, undefined);
    });
  });
});