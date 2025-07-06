/**
 * Unit tests for Suggestion Engine
 * Tests SRP, DI principles and validates fuzzy matching algorithms
 */

import {
  SuggestionEngine,
  LevenshteinFuzzyMatcher,
  MarkdownHeadingProvider,
  FuzzyMatcher,
  FileSystemProvider,
  HeadingProvider,
  SuggestionContext
} from '../../src/utils/suggestionEngine';

// Test doubles for dependency injection
class MockFuzzyMatcher implements FuzzyMatcher {
  private mockResults: Array<{ text: string; score: number }> = [];

  setMockResults(results: Array<{ text: string; score: number }>) {
    this.mockResults = results;
  }

  match(target: string, candidates: string[]): Array<{ text: string; score: number }> {
    return this.mockResults;
  }
}

class MockFileSystemProvider implements FileSystemProvider {
  private mockFiles: string[] = [];
  private mockFileContents: Map<string, string> = new Map();

  setMockFiles(files: string[]) {
    this.mockFiles = files;
  }

  setMockFileContent(path: string, content: string) {
    this.mockFileContents.set(path, content);
  }

  async getMarkdownFiles(basePath: string): Promise<string[]> {
    return this.mockFiles;
  }

  async fileExists(path: string): Promise<boolean> {
    return this.mockFileContents.has(path);
  }

  async readFile(path: string): Promise<string> {
    const content = this.mockFileContents.get(path);
    if (content === undefined) {
      throw new Error(`File not found: ${path}`);
    }
    return content;
  }
}

class MockHeadingProvider implements HeadingProvider {
  private mockHeadings: string[] = [];

  setMockHeadings(headings: string[]) {
    this.mockHeadings = headings;
  }

  extractHeadings(content: string): string[] {
    return this.mockHeadings;
  }
}

describe('SuggestionEngine', () => {
  let mockFuzzyMatcher: MockFuzzyMatcher;
  let mockFileSystem: MockFileSystemProvider;
  let mockHeadingProvider: MockHeadingProvider;
  let suggestionEngine: SuggestionEngine;

  beforeEach(() => {
    mockFuzzyMatcher = new MockFuzzyMatcher();
    mockFileSystem = new MockFileSystemProvider();
    mockHeadingProvider = new MockHeadingProvider();
    suggestionEngine = new SuggestionEngine(
      mockFuzzyMatcher,
      mockFileSystem,
      mockHeadingProvider
    );
  });

  describe('suggestFiles', () => {
    test('should return file suggestions with confidence scores', async () => {
      mockFuzzyMatcher.setMockResults([
        { text: 'installation.md', score: 0.87 },
        { text: 'introduction.md', score: 0.65 },
        { text: 'configuration.md', score: 0.43 }
      ]);

      const context: SuggestionContext = {
        target: 'installaton.md',
        availableFiles: ['installation.md', 'introduction.md', 'configuration.md']
      };

      const suggestions = await suggestionEngine.suggestFiles('installaton.md', context);

      expect(suggestions).toHaveLength(2); // Should filter out low confidence (0.43)
      expect(suggestions[0]).toEqual({
        text: 'installation.md',
        confidence: 87,
        type: 'file',
        reason: 'Very similar filename'
      });
      expect(suggestions[1]).toEqual({
        text: 'introduction.md',
        confidence: 65,
        type: 'file',
        reason: 'Similar filename'
      });
    });

    test('should limit to top 3 suggestions', async () => {
      mockFuzzyMatcher.setMockResults([
        { text: 'file1.md', score: 0.9 },
        { text: 'file2.md', score: 0.8 },
        { text: 'file3.md', score: 0.7 },
        { text: 'file4.md', score: 0.6 },
        { text: 'file5.md', score: 0.5 }
      ]);

      const context: SuggestionContext = {
        target: 'file.md',
        availableFiles: ['file1.md', 'file2.md', 'file3.md', 'file4.md', 'file5.md']
      };

      const suggestions = await suggestionEngine.suggestFiles('file.md', context);

      expect(suggestions).toHaveLength(3);
      expect(suggestions.map(s => s.text)).toEqual(['file1.md', 'file2.md', 'file3.md']);
    });

    test('should get files from filesystem when not provided in context', async () => {
      mockFileSystem.setMockFiles(['doc1.md', 'doc2.md']);
      mockFuzzyMatcher.setMockResults([
        { text: 'doc1.md', score: 0.8 }
      ]);

      const context: SuggestionContext = {
        target: 'doc.md',
        basePath: '/test'
      };

      const suggestions = await suggestionEngine.suggestFiles('doc.md', context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].text).toBe('doc1.md');
    });
  });

  describe('suggestHeadings', () => {
    test('should return heading suggestions with confidence scores', async () => {
      mockHeadingProvider.setMockHeadings(['Installation', 'Configuration', 'Introduction']);
      mockFileSystem.setMockFileContent('setup.md', '# Setup\n## Installation\n## Configuration');
      mockFuzzyMatcher.setMockResults([
        { text: 'Installation', score: 0.9 },
        { text: 'Introduction', score: 0.6 }
      ]);

      const suggestions = await suggestionEngine.suggestHeadings('Instalation', 'setup.md', {
        target: 'Instalation'
      });

      expect(suggestions).toHaveLength(2);
      expect(suggestions[0]).toEqual({
        text: 'Installation',
        confidence: 90,
        type: 'heading',
        reason: 'Very similar heading'
      });
    });

    test('should use provided headings from context', async () => {
      mockFuzzyMatcher.setMockResults([
        { text: 'API Reference', score: 0.85 }
      ]);

      const context: SuggestionContext = {
        target: 'API Referece',
        availableHeadings: ['API Reference', 'User Guide']
      };

      const suggestions = await suggestionEngine.suggestHeadings('API Referece', 'file.md', context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].text).toBe('API Reference');
    });

    test('should handle file read errors gracefully', async () => {
      mockFuzzyMatcher.setMockResults([]);

      const suggestions = await suggestionEngine.suggestHeadings('heading', 'nonexistent.md', {
        target: 'heading'
      });

      expect(suggestions).toHaveLength(0);
    });
  });

  describe('suggestVariables', () => {
    test('should return variable suggestions with values', () => {
      mockFuzzyMatcher.setMockResults([
        { text: 'lang', score: 0.9 },
        { text: 'language', score: 0.7 }
      ]);

      const context: SuggestionContext = {
        target: 'langue',
        availableVariables: {
          lang: 'en',
          language: 'english',
          version: '1.0'
        }
      };

      const suggestions = suggestionEngine.suggestVariables('langue', context);

      expect(suggestions).toHaveLength(2);
      expect(suggestions[0]).toEqual({
        text: 'lang',
        confidence: 90,
        type: 'variable',
        reason: "Variable 'lang' = 'en'"
      });
      expect(suggestions[1]).toEqual({
        text: 'language',
        confidence: 70,
        type: 'variable',
        reason: "Variable 'language' = 'english'"
      });
    });

    test('should return empty array when no variables available', () => {
      const context: SuggestionContext = {
        target: 'var'
      };

      const suggestions = suggestionEngine.suggestVariables('var', context);

      expect(suggestions).toHaveLength(0);
    });

    test('should filter by confidence threshold', () => {
      mockFuzzyMatcher.setMockResults([
        { text: 'goodMatch', score: 0.8 },
        { text: 'poorMatch', score: 0.3 }
      ]);

      const context: SuggestionContext = {
        target: 'match',
        availableVariables: {
          goodMatch: 'value1',
          poorMatch: 'value2'
        }
      };

      const suggestions = suggestionEngine.suggestVariables('match', context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].text).toBe('goodMatch');
    });
  });

  describe('suggestPathResolution', () => {
    test('should suggest base-path for paths with ../', async () => {
      const context: SuggestionContext = {
        target: '../shared/file.md'
      };

      const suggestions = await suggestionEngine.suggestPathResolution('../shared/file.md', context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]).toEqual({
        text: 'Check --base-path setting',
        confidence: 80,
        type: 'path',
        reason: 'Path contains ../ - ensure base path allows traversal'
      });
    });

    test('should suggest adding extension for extensionless files', async () => {
      const context: SuggestionContext = {
        target: 'readme',
        availableFiles: ['readme.md', 'other.md']
      };

      const suggestions = await suggestionEngine.suggestPathResolution('readme', context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]).toEqual({
        text: 'readme.md',
        confidence: 90,
        type: 'file',
        reason: 'File extension may be missing'
      });
    });
  });
});

describe('LevenshteinFuzzyMatcher', () => {
  let matcher: LevenshteinFuzzyMatcher;

  beforeEach(() => {
    matcher = new LevenshteinFuzzyMatcher();
  });

  test('should return perfect match for identical strings', () => {
    const results = matcher.match('test', ['test', 'other']);

    expect(results[0]).toEqual({
      text: 'test',
      score: 1.0
    });
  });

  test('should score substring matches highly', () => {
    const results = matcher.match('test', ['testing', 'contest', 'other']);

    const testingResult = results.find(r => r.text === 'testing');
    const contestResult = results.find(r => r.text === 'contest');

    expect(testingResult!.score).toBeGreaterThan(0.5);
    expect(contestResult!.score).toBeGreaterThan(0.4);
  });

  test('should handle case insensitive matching', () => {
    const results = matcher.match('Test', ['test', 'TEST', 'other']);

    expect(results[0].score).toBe(1.0);
    expect(results[1].score).toBe(1.0);
  });

  test('should return sorted results by score', () => {
    const results = matcher.match('abc', ['abcd', 'ab', 'xyz', 'abc']);

    // Find the perfect match
    const perfectMatch = results.find(r => r.text === 'abc');
    expect(perfectMatch).toBeDefined();
    expect(perfectMatch!.score).toBe(1.0);

    // Verify sorting - scores should be in descending order
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
    }
  });

  test('should filter out zero scores', () => {
    const results = matcher.match('abc', ['abc', 'xyz123456789']);

    expect(results.every(r => r.score > 0)).toBe(true);
  });

  test('should handle empty inputs gracefully', () => {
    const results = matcher.match('', ['test']);
    expect(results).toHaveLength(0);

    const results2 = matcher.match('test', []);
    expect(results2).toHaveLength(0);
  });
});

describe('MarkdownHeadingProvider', () => {
  let provider: MarkdownHeadingProvider;

  beforeEach(() => {
    provider = new MarkdownHeadingProvider();
  });

  test('should extract all heading levels', () => {
    const content = `# Heading 1
Some content
## Heading 2
More content
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6`;

    const headings = provider.extractHeadings(content);

    expect(headings).toEqual([
      'Heading 1',
      'Heading 2',
      'Heading 3',
      'Heading 4',
      'Heading 5',
      'Heading 6'
    ]);
  });

  test('should handle headings with special characters', () => {
    const content = `# API & Configuration
## User's Guide
### "Getting Started"
#### Setup (Advanced)`;

    const headings = provider.extractHeadings(content);

    expect(headings).toEqual([
      'API & Configuration',
      "User's Guide",
      '"Getting Started"',
      'Setup (Advanced)'
    ]);
  });

  test('should ignore inline code with hashes', () => {
    const content = `# Real Heading
Some text with \`#hashtag\` in code
## Another Heading`;

    const headings = provider.extractHeadings(content);

    expect(headings).toEqual(['Real Heading', 'Another Heading']);
  });

  test('should handle empty content', () => {
    const headings = provider.extractHeadings('');

    expect(headings).toHaveLength(0);
  });

  test('should trim whitespace from headings', () => {
    const content = `#   Heading with spaces   
##    Another heading    `;

    const headings = provider.extractHeadings(content);

    expect(headings).toEqual(['Heading with spaces', 'Another heading']);
  });
});