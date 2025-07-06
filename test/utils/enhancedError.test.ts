/**
 * Unit tests for Enhanced Error System
 * Tests error factory, context builder, and formatter
 */

import {
  EnhancedErrorFactory,
  ErrorContextBuilder,
  ContextExtractor,
  ErrorFormatter,
  ErrorType,
  EnhancedTransclusionError
} from '../../src/utils/enhancedError';
import type { Suggestion } from '../../src/utils/suggestionEngine';

describe('EnhancedErrorFactory', () => {
  const mockContext = {
    sourceFile: 'test.md',
    line: 5,
    reference: '![[missing.md]]',
    surroundingLines: ['line before', 'error line', 'line after']
  };

  const mockSuggestions: Suggestion[] = [
    { text: 'similar.md', confidence: 85, type: 'file', reason: 'Very similar filename' },
    { text: 'another.md', confidence: 70, type: 'file', reason: 'Similar filename' }
  ];

  describe('createFileNotFoundError', () => {
    test('should create enhanced file not found error with suggestions', () => {
      const error = EnhancedErrorFactory.createFileNotFoundError(
        'missing.md',
        mockContext,
        mockSuggestions
      );

      expect(error).toEqual({
        message: "File not found: 'missing.md'",
        path: 'missing.md',
        code: ErrorType.FILE_NOT_FOUND,
        line: 5,
        errorType: ErrorType.FILE_NOT_FOUND,
        context: mockContext,
        suggestions: mockSuggestions,
        fixActions: expect.arrayContaining([
          expect.objectContaining({
            description: "Replace with 'similar.md'",
            autofix: true
          }),
          expect.objectContaining({
            description: 'Check file path spelling',
            autofix: false
          })
        ]),
        severity: 'error'
      });
    });

    test('should not include autofix when confidence is low', () => {
      const lowConfidenceSuggestions: Suggestion[] = [
        { text: 'maybe.md', confidence: 60, type: 'file', reason: 'Possible match' }
      ];

      const error = EnhancedErrorFactory.createFileNotFoundError(
        'missing.md',
        mockContext,
        lowConfidenceSuggestions
      );

      const autofixActions = error.fixActions.filter(action => action.autofix);
      expect(autofixActions).toHaveLength(0);
    });
  });

  describe('createHeadingNotFoundError', () => {
    test('should create enhanced heading not found error', () => {
      const headingSuggestions: Suggestion[] = [
        { text: 'Installation', confidence: 90, type: 'heading', reason: 'Very similar heading' }
      ];

      const error = EnhancedErrorFactory.createHeadingNotFoundError(
        'Instalation',
        'setup.md',
        mockContext,
        headingSuggestions
      );

      expect(error.message).toBe("Heading 'Instalation' not found in 'setup.md'");
      expect(error.errorType).toBe(ErrorType.HEADING_NOT_FOUND);
      expect(error.suggestions).toEqual(headingSuggestions);
      expect(error.fixActions[0].description).toContain("Replace with 'Installation'");
    });
  });

  describe('createVariableUndefinedError', () => {
    test('should create enhanced variable undefined error', () => {
      const variableSuggestions: Suggestion[] = [
        { text: 'lang', confidence: 95, type: 'variable', reason: "Variable 'lang' = 'en'" }
      ];

      const error = EnhancedErrorFactory.createVariableUndefinedError(
        'langue',
        mockContext,
        variableSuggestions
      );

      expect(error.message).toBe("Variable 'langue' is undefined");
      expect(error.errorType).toBe(ErrorType.VARIABLE_UNDEFINED);
      expect(error.fixActions).toContainEqual(
        expect.objectContaining({
          description: 'Define variable: --variables langue=value'
        })
      );
    });
  });

  describe('createCircularReferenceError', () => {
    test('should create circular reference error with chain', () => {
      const chain = ['a.md', 'b.md', 'c.md', 'a.md'];

      const error = EnhancedErrorFactory.createCircularReferenceError(
        chain,
        mockContext
      );

      expect(error.message).toBe('Circular reference detected: a.md → b.md → c.md → a.md');
      expect(error.errorType).toBe(ErrorType.CIRCULAR_REFERENCE);
      expect(error.fixActions).toContainEqual(
        expect.objectContaining({
          description: 'Break the circular dependency'
        })
      );
    });
  });

  describe('createPathTraversalError', () => {
    test('should create path traversal error with appropriate suggestions', () => {
      const error = EnhancedErrorFactory.createPathTraversalError(
        '../outside/file.md',
        mockContext
      );

      expect(error.message).toBe("Path traversal blocked: '../outside/file.md'");
      expect(error.errorType).toBe(ErrorType.PATH_TRAVERSAL);
      expect(error.fixActions).toContainEqual(
        expect.objectContaining({
          description: 'Use --base-path to allow broader file access'
        })
      );
    });
  });
});

describe('ErrorContextBuilder', () => {
  test('should build error context with all properties', () => {
    const context = new ErrorContextBuilder()
      .setSourceFile('test.md')
      .setLine(10)
      .setColumn(5)
      .setReference('![[file.md]]')
      .setSurroundingLines(['before', 'current', 'after'])
      .build();

    expect(context).toEqual({
      sourceFile: 'test.md',
      line: 10,
      column: 5,
      reference: '![[file.md]]',
      surroundingLines: ['before', 'current', 'after']
    });
  });

  test('should build context with minimal properties', () => {
    const context = new ErrorContextBuilder()
      .setSourceFile('test.md')
      .setLine(5)
      .setReference('![[file.md]]')
      .build();

    expect(context.sourceFile).toBe('test.md');
    expect(context.line).toBe(5);
    expect(context.reference).toBe('![[file.md]]');
    expect(context.column).toBeUndefined();
    expect(context.surroundingLines).toBeUndefined();
  });

  test('should allow method chaining', () => {
    const builder = new ErrorContextBuilder();
    const result = builder.setSourceFile('test.md');
    
    expect(result).toBe(builder); // Should return this for chaining
  });
});

describe('ContextExtractor', () => {
  describe('extractSurroundingLines', () => {
    test('should extract surrounding lines with default context', () => {
      const content = `line 1
line 2
line 3
line 4
line 5
line 6
line 7`;

      const surroundingLines = ContextExtractor.extractSurroundingLines(content, 4, 2);

      expect(surroundingLines).toEqual([
        'line 2',
        'line 3',
        'line 4',
        'line 5',
        'line 6'
      ]);
    });

    test('should handle boundaries correctly', () => {
      const content = `line 1
line 2
line 3`;

      // Test start boundary
      const startLines = ContextExtractor.extractSurroundingLines(content, 1, 2);
      expect(startLines).toEqual(['line 1', 'line 2', 'line 3']);

      // Test end boundary
      const endLines = ContextExtractor.extractSurroundingLines(content, 3, 2);
      expect(endLines).toEqual(['line 1', 'line 2', 'line 3']);
    });

    test('should handle single line content', () => {
      const content = 'single line';

      const lines = ContextExtractor.extractSurroundingLines(content, 1, 2);

      expect(lines).toEqual(['single line']);
    });
  });

  describe('findReferenceColumn', () => {
    test('should find column position of reference', () => {
      const line = 'This is a ![[reference]] in text';

      const column = ContextExtractor.findReferenceColumn(line, '![[reference]]');

      expect(column).toBe(10);
    });

    test('should return -1 if reference not found', () => {
      const line = 'This line has no reference';

      const column = ContextExtractor.findReferenceColumn(line, '![[missing]]');

      expect(column).toBe(-1);
    });
  });
});

describe('ErrorFormatter', () => {
  const mockError: EnhancedTransclusionError = {
    message: "File not found: 'missing.md'",
    path: 'missing.md',
    code: ErrorType.FILE_NOT_FOUND,
    line: 5,
    errorType: ErrorType.FILE_NOT_FOUND,
    context: {
      sourceFile: 'main.md',
      line: 5,
      reference: '![[missing.md]]',
      surroundingLines: ['before', 'error line', 'after']
    },
    suggestions: [
      { text: 'existing.md', confidence: 85, type: 'file', reason: 'Similar filename' }
    ],
    fixActions: [
      { description: 'Check file path spelling', autofix: false },
      { description: 'Replace with existing.md', command: 'sed -i ...', autofix: true }
    ],
    severity: 'error'
  };

  describe('formatForTerminal', () => {
    test('should format error with all sections', () => {
      const formatted = ErrorFormatter.formatForTerminal(mockError);

      expect(formatted).toContain('❌ Error: File not found');
      expect(formatted).toContain('📍 Referenced in: main.md:5');
      expect(formatted).toContain('🔗 Reference: ![[missing.md]]');
      expect(formatted).toContain('🔍 Suggestions:');
      expect(formatted).toContain('existing.md (85% match)');
      expect(formatted).toContain('💡 How to fix:');
      expect(formatted).toContain('Check file path spelling');
      expect(formatted).toContain('Command: sed -i ...');
    });

    test('should use appropriate emoji for severity levels', () => {
      const warningError = { ...mockError, severity: 'warning' as const };
      const infoError = { ...mockError, severity: 'info' as const };

      expect(ErrorFormatter.formatForTerminal(warningError)).toContain('⚠️ Error:');
      expect(ErrorFormatter.formatForTerminal(infoError)).toContain('ℹ️ Error:');
    });

    test('should handle high confidence suggestions', () => {
      const highConfidenceError = {
        ...mockError,
        suggestions: [
          { text: 'correct.md', confidence: 95, type: 'file' as const, reason: 'Very similar' }
        ]
      };

      const formatted = ErrorFormatter.formatForTerminal(highConfidenceError);

      expect(formatted).toContain('correct.md (95% match) ← Did you mean this?');
    });
  });

  describe('formatForJSON', () => {
    test('should format error as JSON object', () => {
      const json = ErrorFormatter.formatForJSON(mockError);

      expect(json).toEqual({
        type: ErrorType.FILE_NOT_FOUND,
        message: "File not found: 'missing.md'",
        severity: 'error',
        context: mockError.context,
        suggestions: mockError.suggestions,
        fixActions: mockError.fixActions
      });
    });

    test('should be JSON serializable', () => {
      const json = ErrorFormatter.formatForJSON(mockError);

      expect(() => JSON.stringify(json)).not.toThrow();
    });
  });
});

describe('Error System Integration', () => {
  test('should maintain TransclusionError interface compatibility', () => {
    const basicError = {
      message: 'Test error',
      path: 'test.md',
      line: 1,
      code: 'TEST_ERROR'
    };

    const context = new ErrorContextBuilder()
      .setSourceFile('main.md')
      .setLine(1)
      .setReference('![[test.md]]')
      .build();

    const enhancedError = EnhancedErrorFactory.createFileNotFoundError(
      'test.md',
      context,
      []
    );

    // Should have all original TransclusionError properties
    expect(enhancedError.message).toBeDefined();
    expect(enhancedError.path).toBeDefined();
    expect(enhancedError.line).toBeDefined();
    expect(enhancedError.code).toBeDefined();

    // Should have additional enhanced properties
    expect(enhancedError.errorType).toBeDefined();
    expect(enhancedError.context).toBeDefined();
    expect(enhancedError.suggestions).toBeDefined();
    expect(enhancedError.fixActions).toBeDefined();
    expect(enhancedError.severity).toBeDefined();
  });
});