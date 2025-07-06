const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { TransclusionTransform } = require('../../dist/stream');
const { Readable } = require('stream');

describe('Template Variables API', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'template-api-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function processContent(content, options = {}) {
    const stream = new TransclusionTransform({
      basePath: tempDir,
      ...options
    });

    const input = Readable.from([content]);
    const chunks = [];

    return new Promise((resolve, reject) => {
      input.pipe(stream)
        .on('data', chunk => chunks.push(chunk))
        .on('end', () => resolve(chunks.join('')))
        .on('error', reject);
    });
  }

  describe('Function variables', () => {
    test('should execute function variables', async () => {
      const result = await processContent(
        'Time: {{time}}, User: {{user}}',
        {
          templateVariables: {
            time: () => '12:00 PM',
            user: () => 'Current User'
          }
        }
      );

      expect(result).toBe('Time: 12:00 PM, User: Current User');
    });

    test('should handle functions returning different types', async () => {
      const result = await processContent(
        'String: {{str}}, Number: {{num}}, Bool: {{bool}}',
        {
          templateVariables: {
            str: () => 'hello',
            num: () => 42,
            bool: () => true
          }
        }
      );

      expect(result).toBe('String: hello, Number: 42, Bool: true');
    });

    test('should handle function errors gracefully', async () => {
      const result = await processContent(
        'Good: {{good}}, Bad: {{bad}}',
        {
          templateVariables: {
            good: () => 'OK',
            bad: () => { throw new Error('Function error'); }
          }
        }
      );

      // Should use the original variable when function throws
      expect(result).toBe('Good: OK, Bad: {{bad}}');
    });
  });

  describe('Object values', () => {
    test('should stringify objects', async () => {
      const result = await processContent(
        'Data: {{data}}',
        {
          templateVariables: {
            data: { name: 'Test', value: 123 }
          }
        }
      );

      expect(result).toBe('Data: {"name":"Test","value":123}');
    });

    test('should handle Date objects', async () => {
      const testDate = new Date('2024-01-15T10:30:00.000Z');
      const result = await processContent(
        'Created: {{date}}',
        {
          templateVariables: {
            date: testDate
          }
        }
      );

      expect(result).toBe('Created: 2024-01-15T10:30:00.000Z');
    });

    test('should handle circular references', async () => {
      const obj = { name: 'Test' };
      obj.self = obj; // Create circular reference
      
      const result = await processContent(
        'Object: {{obj}}',
        {
          templateVariables: {
            obj: obj
          }
        }
      );

      expect(result).toBe('Object: [object Object]');
    });
  });

  describe('Integration with transclusion', () => {
    test('should replace variables in transcluded files', async () => {
      const includedFile = path.join(tempDir, 'template.md');
      await fs.writeFile(includedFile, 'Hello {{name}}, welcome to {{app}}!');

      const result = await processContent(
        '![[template.md]]',
        {
          templateVariables: {
            name: 'Developer',
            app: 'MyApp'
          }
        }
      );

      expect(result).toBe('Hello Developer, welcome to MyApp!');
    });

    test.skip('should handle variables in filename references', async () => {
      // This feature is not yet implemented - variable substitution in transclusion filenames
      const dataFile = path.join(tempDir, 'user-data.md');
      await fs.writeFile(dataFile, 'User data content');

      const result = await processContent(
        '![[{{filename}}]]',
        {
          templateVariables: {
            filename: 'user-data.md'
          }
        }
      );

      expect(result).toBe('User data content');
    });

    test('should process variables in correct order', async () => {
      const file1 = path.join(tempDir, 'step1.md');
      await fs.writeFile(file1, 'Step 1: {{step1}}');
      
      const file2 = path.join(tempDir, 'step2.md');
      await fs.writeFile(file2, '![[step1.md]]\nStep 2: {{step2}}');

      const result = await processContent(
        '![[step2.md]]\nFinal: {{final}}',
        {
          templateVariables: {
            step1: 'First',
            step2: 'Second',
            final: 'Done'
          }
        }
      );

      expect(result).toBe('Step 1: First\nStep 2: Second\nFinal: Done');
    });
  });

  describe('Streaming behavior', () => {
    test('should handle variables split across chunks', async () => {
      const stream = new TransclusionTransform({
        basePath: tempDir,
        templateVariables: {
          variable: 'REPLACED'
        }
      });

      const chunks = [];
      stream.on('data', chunk => chunks.push(chunk.toString()));

      // Simulate variable split across chunks
      stream.write('Start {{var');
      stream.write('iable}} End');
      stream.end();

      await new Promise(resolve => stream.on('end', resolve));
      
      expect(chunks.join('')).toBe('Start REPLACED End');
    });

    test('should preserve incomplete variables at stream end', async () => {
      const stream = new TransclusionTransform({
        basePath: tempDir,
        templateVariables: {
          complete: 'YES'
        }
      });

      const chunks = [];
      stream.on('data', chunk => chunks.push(chunk.toString()));

      stream.write('Complete: {{complete}}, Incomplete: {{incomp');
      stream.end();

      await new Promise(resolve => stream.on('end', resolve));
      
      expect(chunks.join('')).toBe('Complete: YES, Incomplete: {{incomp');
    });
  });

  describe('Special characters', () => {
    test('should handle variables with special characters in values', async () => {
      const result = await processContent(
        'Quote: {{quote}}, Newline: {{newline}}',
        {
          templateVariables: {
            quote: 'She said "Hello"',
            newline: 'Line1\nLine2'
          }
        }
      );

      expect(result).toBe('Quote: She said "Hello", Newline: Line1\nLine2');
    });

    test('should handle Unicode in variables', async () => {
      const result = await processContent(
        'Emoji: {{emoji}}, Unicode: {{unicode}}',
        {
          templateVariables: {
            emoji: '🚀',
            unicode: '你好'
          }
        }
      );

      expect(result).toBe('Emoji: 🚀, Unicode: 你好');
    });
  });
});