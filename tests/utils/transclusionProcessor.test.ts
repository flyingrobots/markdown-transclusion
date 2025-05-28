import {
  parseAndResolveRefs,
  composeLineOutput,
  extractErrors,
  ProcessedReference
} from '../../src/utils/transclusionProcessor';
import type { TransclusionOptions } from '../../src/types';

describe('transclusionProcessor', () => {
  const options: TransclusionOptions = {
    basePath: '/test',
    extensions: ['.md']
  };

  describe('parseAndResolveRefs', () => {
    it('should parse and resolve references in a line', () => {
      const line = 'Start ![[file1]] middle ![[file2]] end';
      const results = parseAndResolveRefs(line, options);
      
      expect(results).toHaveLength(2);
      expect(results[0].ref.path).toBe('file1');
      expect(results[0].resolved.absolutePath).toBe('/test/file1');
      expect(results[1].ref.path).toBe('file2');
      expect(results[1].resolved.absolutePath).toBe('/test/file2');
    });

    it('should return empty array for lines without transclusions', () => {
      const line = 'Just a regular line with no transclusions';
      const results = parseAndResolveRefs(line, options);
      
      expect(results).toHaveLength(0);
    });

    it('should handle variable substitution', () => {
      const line = '![[doc-{{lang}}]]';
      const optionsWithVars: TransclusionOptions = {
        ...options,
        variables: { lang: 'en' }
      };
      
      const results = parseAndResolveRefs(line, optionsWithVars);
      
      expect(results).toHaveLength(1);
      expect(results[0].resolved.absolutePath).toBe('/test/doc-en');
    });
  });

  describe('composeLineOutput', () => {
    it('should compose output with successful content', () => {
      const line = 'Before ![[file]] after';
      const processedRefs: ProcessedReference[] = [{
        ref: {
          original: '![[file]]',
          path: 'file',
          startIndex: 7,
          endIndex: 16
        },
        resolved: {
          absolutePath: '/test/file.md',
          exists: true,
          originalReference: 'file'
        },
        content: 'inserted content'
      }];
      
      const output = composeLineOutput(line, processedRefs);
      
      expect(output).toBe('Before inserted content after');
    });

    it('should handle multiple replacements', () => {
      const line = '![[a]] and ![[b]]';
      const processedRefs: ProcessedReference[] = [
        {
          ref: {
            original: '![[a]]',
            path: 'a',
            startIndex: 0,
            endIndex: 6
          },
          resolved: {
            absolutePath: '/test/a.md',
            exists: true,
            originalReference: 'a'
          },
          content: 'A'
        },
        {
          ref: {
            original: '![[b]]',
            path: 'b',
            startIndex: 11,
            endIndex: 17
          },
          resolved: {
            absolutePath: '/test/b.md',
            exists: true,
            originalReference: 'b'
          },
          content: 'B'
        }
      ];
      
      const output = composeLineOutput(line, processedRefs);
      
      expect(output).toBe('A and B');
    });

    it('should handle errors with appropriate placeholders', () => {
      const line = '![[missing]] and ![[error]]';
      const processedRefs: ProcessedReference[] = [
        {
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
            error: 'File not found'
          },
          error: {
            message: 'File not found',
            path: 'missing',
            code: 'RESOLVE_ERROR'
          }
        },
        {
          ref: {
            original: '![[error]]',
            path: 'error',
            startIndex: 17,
            endIndex: 27
          },
          resolved: {
            absolutePath: '/test/error.md',
            exists: true,
            originalReference: 'error'
          },
          error: {
            message: 'Read failed',
            path: '/test/error.md',
            code: 'READ_ERROR'
          }
        }
      ];
      
      const output = composeLineOutput(line, processedRefs);
      
      expect(output).toBe('<!-- Missing: missing --> and <!-- Error: ![[error]] -->');
    });

    it('should return original line if no processed refs', () => {
      const line = 'No transclusions here';
      const output = composeLineOutput(line, []);
      
      expect(output).toBe('No transclusions here');
    });
  });

  describe('extractErrors', () => {
    it('should extract all errors from processed references', () => {
      const processedRefs: ProcessedReference[] = [
        {
          ref: { original: '![[a]]', path: 'a', startIndex: 0, endIndex: 6 },
          resolved: { absolutePath: '/test/a.md', exists: true, originalReference: 'a' },
          content: 'Success'
        },
        {
          ref: { original: '![[b]]', path: 'b', startIndex: 10, endIndex: 16 },
          resolved: { absolutePath: '/test/b.md', exists: false, originalReference: 'b' },
          error: { message: 'Not found', path: 'b', code: 'RESOLVE_ERROR' }
        },
        {
          ref: { original: '![[c]]', path: 'c', startIndex: 20, endIndex: 26 },
          resolved: { absolutePath: '/test/c.md', exists: true, originalReference: 'c' },
          error: { message: 'Read error', path: '/test/c.md', code: 'READ_ERROR' }
        }
      ];
      
      const errors = extractErrors(processedRefs);
      
      expect(errors).toHaveLength(2);
      expect(errors[0].code).toBe('RESOLVE_ERROR');
      expect(errors[1].code).toBe('READ_ERROR');
    });

    it('should return empty array if no errors', () => {
      const processedRefs: ProcessedReference[] = [
        {
          ref: { original: '![[a]]', path: 'a', startIndex: 0, endIndex: 6 },
          resolved: { absolutePath: '/test/a.md', exists: true, originalReference: 'a' },
          content: 'Success'
        }
      ];
      
      const errors = extractErrors(processedRefs);
      
      expect(errors).toHaveLength(0);
    });
  });
});