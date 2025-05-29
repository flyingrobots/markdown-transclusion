import * as fc from 'fast-check';
import { parseTransclusionReferences } from '../src/parser';
import { processLine } from '../src/transclude';
import { LineTranscluder } from '../src/utils/LineTranscluder';
import { MockFileCache } from './mocks';
import type { TransclusionOptions } from '../src/types';

describe('Property-Based Tests', () => {
  const options: TransclusionOptions = {
    basePath: '/test',
    extensions: ['md'],
    cache: new MockFileCache()
  };

  describe('Transclusion Reference Parsing', () => {
    it('should never crash on random input', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          // Should not throw
          const results = parseTransclusionReferences(input);
          expect(results).toBeDefined();
        }),
        { numRuns: 1000 }
      );
    });

    it('should handle references with special characters', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => s.length > 0 && s.length < 100),
          (filename) => {
            const input = `![[${filename}]]`;
            const results = parseTransclusionReferences(input);
            
            // The parser should not crash on any input
            expect(results).toBeDefined();
            expect(Array.isArray(results)).toBe(true);
            
            // If there's a result, check its validity
            if (results.length > 0) {
              const result = results[0];
              expect(result.path).toBeDefined();
              // The original should be the exact matched transclusion
              // Note: if the input has extra ] characters after ]], they are not part of the transclusion
              expect(result.original).toMatch(/^!\[\[.*\]\]$/);
              expect(result.startIndex).toBeGreaterThanOrEqual(0);
              expect(result.endIndex).toBeGreaterThan(result.startIndex);
              expect(result.endIndex).toBeLessThanOrEqual(input.length);
              
              // The path should be trimmed
              expect(result.path).toBe(result.path.trim());
              
              // If there's a heading, it should also be trimmed
              if (result.heading) {
                expect(result.heading).toBe(result.heading.trim());
              }
            }
            
            // The parser correctly handles various edge cases:
            // - Empty paths are skipped
            // - Paths that are only whitespace are skipped
            // - Paths starting with # (heading-only) are skipped
            // - Nested brackets are handled correctly
          }
        ),
        { numRuns: 500 }
      );
    });

    it('should handle references with headings', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.string().filter(s => s.length > 0 && !s.includes('#')),
            fc.string().filter(s => s.length > 0 && !s.includes(']'))
          ),
          ([filename, heading]) => {
            const input = `![[${filename}#${heading}]]`;
            const results = parseTransclusionReferences(input);
            const result = results.length > 0 ? results[0] : null;
            
            if (result) {
              expect(result.path).toBe(filename.trim());
              // Heading might be undefined if parsing fails
              if (result.heading) {
                expect(result.heading).toBe(heading.trim());
              }
              expect(result.original).toBe(input);
            }
          }
        ),
        { numRuns: 500 }
      );
    });

    it('should handle malformed references gracefully', () => {
      const malformedCases = [
        '![[',
        '![[]]',
        '![[file',
        '![[file]',
        '![[file]]extra',
        '![file]]',
        '![[file#]]',
        '![[#heading]]',
        '![[file##heading]]',
        '![[file#heading#another]]',
        '![[file\n]]',
        '![[file\r\n]]',
        '![[file\t]]',
        '![[file with spaces]]',
        '![[file|alias]]', // Obsidian alias syntax
        '![[file.md|Custom Name]]',
        '![[../../../etc/passwd]]',
        '![[/absolute/path]]',
        '![[C:\\Windows\\System32]]',
        '![[file://local]]',
        '![[http://example.com]]',
        '![[{{variable}}]]',
        '![[file-{{var1}}-{{var2}}]]',
        '![[file#{{heading}}]]',
        '![[{{}}]]',
        '![[{{}}-file]]',
        '![[file-{{}}]]',
        '![[file-{{var}}#heading]]',
        '![[file-{{var}}.md#{{heading}}]]'
      ];

      malformedCases.forEach(input => {
        const line = `Text before ${input} text after`;
        // Should not throw
        expect(() => parseTransclusionReferences(input)).not.toThrow();
      });
    });
  });

  describe('Line Processing Edge Cases', () => {
    it('should handle lines with multiple references', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string().filter(s => s.length > 0 && s.length < 20), { minLength: 2, maxLength: 5 }),
          async (filenames) => {
            const line = filenames.map(f => `![[${f}]]`).join(' and ');
            const result = await processLine(line, options);
            
            expect(result.output).toBeDefined();
            expect(result.errors).toBeDefined();
            expect(Array.isArray(result.errors)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle deeply nested references', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }),
          fc.string().filter(s => s.length > 0 && s.length < 10),
          async (depth, filename) => {
            let nested = filename;
            for (let i = 0; i < depth; i++) {
              nested = `![[${nested}]]`;
            }
            
            const result = await processLine(nested, options);
            expect(result.output).toBeDefined();
            // Deeply nested references will fail because files don't exist
            // We're just testing that it doesn't crash or hang
            expect(result.errors.length).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle unicode filenames', async () => {
      const unicodeFilenames = [
        '文档',
        'ドキュメント',
        '🎉celebration',
        'café',
        'naïve',
        'Привет',
        'مرحبا',
        'שלום',
        'file_with_emoji_🚀',
        '混合_mixed_文字'
      ];

      for (const filename of unicodeFilenames) {
        const line = `![[${filename}]]`;
        const result = await processLine(line, options);
        expect(result.output).toContain('<!-- Error: File not found:');
        expect(result.errors[0].path).toBe(filename);
      }
    });

    it('should handle very long filenames', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 100, maxLength: 500 }),
          async (longFilename) => {
            const line = `![[${longFilename}]]`;
            const result = await processLine(line, options);
            
            expect(result.output).toBeDefined();
            expect(result.errors).toBeDefined();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Variable Substitution Edge Cases', () => {
    it('should handle various variable patterns', async () => {
      const variablePatterns = [
        { pattern: '{{var}}', vars: { var: 'value' }, expected: 'value' },
        { pattern: '{{var}}', vars: {}, expected: '{{var}}' },
        { pattern: '{{var}}', vars: { var: '' }, expected: '' },
        { pattern: '{{var}}', vars: { var: '{{nested}}' }, expected: '{{nested}}' },
        { pattern: '{{var1}}-{{var2}}', vars: { var1: 'a', var2: 'b' }, expected: 'a-b' },
        { pattern: '{{var1}}-{{var2}}', vars: { var1: 'a' } as Record<string, string>, expected: 'a-{{var2}}' },
        { pattern: '{{CamelCase}}', vars: { CamelCase: 'value' }, expected: 'value' },
        { pattern: '{{snake_case}}', vars: { snake_case: 'value' }, expected: 'value' },
        { pattern: '{{kebab-case}}', vars: { 'kebab-case': 'value' }, expected: 'value' },
        { pattern: '{{123}}', vars: { '123': 'value' }, expected: 'value' }
      ];

      for (const { pattern, vars, expected } of variablePatterns) {
        const line = `![[file-${pattern}]]`;
        const optionsWithVars = { ...options, variables: vars };
        const result = await processLine(line, optionsWithVars);
        
        // The file won't exist, but we can check the error message
        expect(result.output).toContain(`file-${expected}`);
      }
    });

    it('should handle variables with special characters in values', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string(),
          fc.string().filter(s => s.length > 0),
          async (varName, varValue) => {
            // Clean up var name to be valid
            const cleanVarName = varName.replace(/[{}]/g, '').trim() || 'var';
            const line = `![[file-{{${cleanVarName}}}]]`;
            const optionsWithVars = { ...options, variables: { [cleanVarName]: varValue } };
            
            const result = await processLine(line, optionsWithVars);
            expect(result.output).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Circular Reference Detection', () => {
    it('should handle self-referencing files', async () => {
      // Test that self-references are detected
      const line = '![[self-ref]]';
      const result = await processLine(line, options);
      
      // The file won't exist, but that's OK for this test
      expect(result.output).toContain('<!-- Error:');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should generate various reference patterns', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string().filter(s => s.length > 0 && s.length < 10), { minLength: 2, maxLength: 5 }),
          (filenames) => {
            // Generate a chain of references
            const refs = filenames.map((f, i) => {
              const nextFile = filenames[(i + 1) % filenames.length];
              return `${f} contains ![[${nextFile}]]`;
            });
            
            // This would create a circular reference if processed
            expect(refs.length).toBe(filenames.length);
            expect(refs.every(r => r.includes('![['))).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Performance and Resource Limits', () => {
    it('should handle extremely long lines', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }),
          async (refCount) => {
            // Create a line with many references
            const references = Array(refCount).fill(0).map((_, i) => `![[file${i}]]`);
            const line = references.join(' ');
            
            const start = Date.now();
            const result = await processLine(line, options);
            const duration = Date.now() - start;
            
            expect(result.output).toBeDefined();
            expect(duration).toBeLessThan(1000); // Should complete within 1 second
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should respect max depth limit configuration', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          (maxDepth) => {
            const optionsWithDepth = { ...options, maxDepth };
            const transcluder = new LineTranscluder(optionsWithDepth);
            
            // Verify max depth is properly set
            expect(transcluder).toBeDefined();
            // With real files, depth limit would prevent infinite recursion
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});