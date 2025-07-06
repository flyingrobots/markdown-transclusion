import {
  composeLineOutput,
  ProcessedReference
} from '../../src/utils/transclusionProcessor';

describe('transclusionProcessor - composeLineOutput edge cases', () => {
  describe('fallback error handling', () => {
    it('should use fallback error message when no content and no error provided', () => {
      const line = 'Before ![[weird]] after';
      const processedRefs: ProcessedReference[] = [{
        ref: {
          original: '![[weird]]',
          path: 'weird',
          startIndex: 7,
          endIndex: 17
        },
        resolved: {
          absolutePath: '/test/weird.md',
          exists: true,
          originalReference: 'weird'
        }
        // No content, no error - edge case
      }];
      
      const output = composeLineOutput(line, processedRefs);
      
      expect(output).toBe('Before <!-- Error: Could not transclude weird --> after');
    });

    it('should handle malformed processed reference', () => {
      const line = '![[malformed]]';
      const processedRefs: ProcessedReference[] = [{
        ref: {
          original: '![[malformed]]',
          path: 'malformed',
          startIndex: 0,
          endIndex: 14
        },
        resolved: {
          absolutePath: '/test/malformed.md',
          exists: false,
          originalReference: 'malformed'
        },
        content: undefined,
        error: undefined
      }];
      
      const output = composeLineOutput(line, processedRefs);
      
      expect(output).toBe('<!-- Error: Could not transclude malformed -->');
    });
  });

  describe('complex edge cases', () => {
    it('should handle overlapping references correctly', () => {
      const line = '![[a]] ![[b]] ![[c]]';
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
          content: 'AAA'
        },
        {
          ref: {
            original: '![[b]]',
            path: 'b',
            startIndex: 7,
            endIndex: 13
          },
          resolved: {
            absolutePath: '/test/b.md',
            exists: true,
            originalReference: 'b'
          }
          // Missing content and error
        },
        {
          ref: {
            original: '![[c]]',
            path: 'c',
            startIndex: 14,
            endIndex: 20
          },
          resolved: {
            absolutePath: '/test/c.md',
            exists: true,
            originalReference: 'c'
          },
          content: 'CCC'
        }
      ];
      
      const output = composeLineOutput(line, processedRefs);
      
      expect(output).toBe('AAA <!-- Error: Could not transclude b --> CCC');
    });

    it('should preserve exact spacing and formatting', () => {
      const line = '   ![[spaced]]   \t![[tabbed]]\n';
      const processedRefs: ProcessedReference[] = [
        {
          ref: {
            original: '![[spaced]]',
            path: 'spaced',
            startIndex: 3,
            endIndex: 14
          },
          resolved: {
            absolutePath: '/test/spaced.md',
            exists: true,
            originalReference: 'spaced'
          },
          content: 'S'
        },
        {
          ref: {
            original: '![[tabbed]]',
            path: 'tabbed',
            startIndex: 18,
            endIndex: 29
          },
          resolved: {
            absolutePath: '/test/tabbed.md',
            exists: true,
            originalReference: 'tabbed'
          },
          content: 'T'
        }
      ];
      
      const output = composeLineOutput(line, processedRefs);
      
      expect(output).toBe('   S   \tT\n');
    });

    it('should handle empty path in error case', () => {
      const line = '![[]]';
      const processedRefs: ProcessedReference[] = [{
        ref: {
          original: '![[]]',
          path: '',
          startIndex: 0,
          endIndex: 5
        },
        resolved: {
          absolutePath: '/test/',
          exists: false,
          originalReference: ''
        }
        // No content or error
      }];
      
      const output = composeLineOutput(line, processedRefs);
      
      expect(output).toBe('<!-- Error: Could not transclude  -->');
    });
  });
});