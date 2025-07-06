const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const { spawnSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('Template Variable Substitution', () => {
  let tempDir;
  const cliPath = path.join(__dirname, '../../dist/cli.js');

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'template-vars-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Basic variable substitution', () => {
    test('should replace variables in main content', async () => {
      const inputFile = path.join(tempDir, 'input.md');
      await fs.writeFile(inputFile, 'Hello {{name}}, welcome to {{place}}!');

      const result = spawnSync('node', [
        cliPath, 
        inputFile, 
        '--template-variables', 
        '{"name": "Alice", "place": "Wonderland"}'
      ], { encoding: 'utf-8' });

      expect(result.status).toBe(0);
      expect(result.stdout).toBe('Hello Alice, welcome to Wonderland!');
    });

    test('should replace variables in transcluded content', async () => {
      const includedFile = path.join(tempDir, 'greeting.md');
      await fs.writeFile(includedFile, 'Hello {{user}}!');
      
      const mainFile = path.join(tempDir, 'main.md');
      await fs.writeFile(mainFile, 'Greeting: ![[greeting.md]]');

      const result = spawnSync('node', [
        cliPath,
        mainFile,
        '--template-variables',
        '{"user": "Bob"}'
      ], { encoding: 'utf-8', cwd: tempDir });

      expect(result.status).toBe(0);
      expect(result.stdout).toBe('Greeting: Hello Bob!');
    });
  });

  describe('Different data types', () => {
    test('should handle string values', async () => {
      const inputFile = path.join(tempDir, 'strings.md');
      await fs.writeFile(inputFile, 'Message: {{message}}');

      const result = spawnSync('node', [
        cliPath,
        inputFile,
        '--template-variables',
        '{"message": "Hello World"}'
      ], { encoding: 'utf-8' });

      expect(result.stdout).toBe('Message: Hello World');
    });

    test('should handle number values', async () => {
      const inputFile = path.join(tempDir, 'numbers.md');
      await fs.writeFile(inputFile, 'Count: {{count}}, Price: {{price}}');

      const result = spawnSync('node', [
        cliPath,
        inputFile,
        '--template-variables',
        '{"count": 42, "price": 19.99}'
      ], { encoding: 'utf-8' });

      expect(result.stdout).toBe('Count: 42, Price: 19.99');
    });

    test('should handle boolean values', async () => {
      const inputFile = path.join(tempDir, 'booleans.md');
      await fs.writeFile(inputFile, 'Active: {{isActive}}, Complete: {{isComplete}}');

      const result = spawnSync('node', [
        cliPath,
        inputFile,
        '--template-variables',
        '{"isActive": true, "isComplete": false}'
      ], { encoding: 'utf-8' });

      expect(result.stdout).toBe('Active: true, Complete: false');
    });

    test('should handle null and undefined values', async () => {
      const inputFile = path.join(tempDir, 'nullish.md');
      await fs.writeFile(inputFile, 'Null: {{nullValue}}, Undefined: {{undefinedValue}}');

      const result = spawnSync('node', [
        cliPath,
        inputFile,
        '--template-variables',
        '{"nullValue": null}'
      ], { encoding: 'utf-8' });

      expect(result.stdout).toBe('Null: null, Undefined: {{undefinedValue}}');
    });

    test('should handle Date values as ISO strings', async () => {
      const inputFile = path.join(tempDir, 'dates.md');
      await fs.writeFile(inputFile, 'Created: {{createdAt}}');
      
      // Create a specific date for consistent testing
      const testDate = new Date('2024-01-15T10:30:00.000Z');

      const result = spawnSync('node', [
        cliPath,
        inputFile,
        '--template-variables',
        `{"createdAt": "${testDate.toISOString()}"}`
      ], { encoding: 'utf-8' });

      expect(result.stdout).toBe('Created: 2024-01-15T10:30:00.000Z');
    });
  });

  describe('Edge cases', () => {
    test('should handle empty string values', async () => {
      const inputFile = path.join(tempDir, 'empty.md');
      await fs.writeFile(inputFile, 'Before{{empty}}After');

      const result = spawnSync('node', [
        cliPath,
        inputFile,
        '--template-variables',
        '{"empty": ""}'
      ], { encoding: 'utf-8' });

      expect(result.stdout).toBe('BeforeAfter');
    });

    test('should handle special number values', async () => {
      const inputFile = path.join(tempDir, 'special-numbers.md');
      await fs.writeFile(inputFile, 'Zero: {{zero}}, Negative: {{negative}}');

      const result = spawnSync('node', [
        cliPath,
        inputFile,
        '--template-variables',
        '{"zero": 0, "negative": -42}'
      ], { encoding: 'utf-8' });

      expect(result.stdout).toBe('Zero: 0, Negative: -42');
    });

    test('should preserve non-matching variables', async () => {
      const inputFile = path.join(tempDir, 'partial.md');
      await fs.writeFile(inputFile, '{{known}} and {{unknown}}');

      const result = spawnSync('node', [
        cliPath,
        inputFile,
        '--template-variables',
        '{"known": "replaced"}'
      ], { encoding: 'utf-8' });

      expect(result.stdout).toBe('replaced and {{unknown}}');
    });

    test('should handle variables at chunk boundaries', async () => {
      // Create a large file that will be processed in chunks
      const inputFile = path.join(tempDir, 'large.md');
      const largeContent = 'A'.repeat(8000) + '{{var}}' + 'B'.repeat(8000);
      await fs.writeFile(inputFile, largeContent);

      const result = spawnSync('node', [
        cliPath,
        inputFile,
        '--template-variables',
        '{"var": "REPLACED"}'
      ], { encoding: 'utf-8' });

      expect(result.stdout).toContain('REPLACED');
      expect(result.stdout).not.toContain('{{var}}');
    });
  });

  describe('Multiple variables', () => {
    test('should replace multiple variables in one line', async () => {
      const inputFile = path.join(tempDir, 'multiple.md');
      await fs.writeFile(inputFile, '{{greeting}} {{name}}, you have {{count}} messages');

      const result = spawnSync('node', [
        cliPath,
        inputFile,
        '--template-variables',
        '{"greeting": "Hello", "name": "User", "count": 5}'
      ], { encoding: 'utf-8' });

      expect(result.stdout).toBe('Hello User, you have 5 messages');
    });

    test('should handle adjacent variables', async () => {
      const inputFile = path.join(tempDir, 'adjacent.md');
      await fs.writeFile(inputFile, '{{first}}{{second}}{{third}}');

      const result = spawnSync('node', [
        cliPath,
        inputFile,
        '--template-variables',
        '{"first": "A", "second": "B", "third": "C"}'
      ], { encoding: 'utf-8' });

      expect(result.stdout).toBe('ABC');
    });
  });

  describe('Complex scenarios', () => {
    test('should handle nested transclusions with variables', async () => {
      const deepFile = path.join(tempDir, 'deep.md');
      await fs.writeFile(deepFile, 'Deep: {{deepVar}}');
      
      const middleFile = path.join(tempDir, 'middle.md');
      await fs.writeFile(middleFile, 'Middle: {{middleVar}}\n![[deep.md]]');
      
      const mainFile = path.join(tempDir, 'main.md');
      await fs.writeFile(mainFile, 'Main: {{mainVar}}\n![[middle.md]]');

      const result = spawnSync('node', [
        cliPath,
        mainFile,
        '--template-variables',
        '{"mainVar": "1", "middleVar": "2", "deepVar": "3"}'
      ], { encoding: 'utf-8', cwd: tempDir });

      expect(result.status).toBe(0);
      expect(result.stdout).toBe('Main: 1\nMiddle: 2\nDeep: 3');
    });

    test('should work with other CLI options', async () => {
      const file1 = path.join(tempDir, 'file1.md');
      await fs.writeFile(file1, '---\ntitle: Test\n---\nContent: {{content}}');
      
      const file2 = path.join(tempDir, 'file2.md');
      await fs.writeFile(file2, '![[file1.md]]');

      const result = spawnSync('node', [
        cliPath,
        file2,
        '--strip-frontmatter',
        '--template-variables',
        '{"content": "Hello"}'
      ], { encoding: 'utf-8', cwd: tempDir });

      expect(result.status).toBe(0);
      // The frontmatter stripping only applies to transcluded content
      // The transclusion inserts the content without frontmatter
      expect(result.stdout).toContain('Content: Hello');
    });
  });

  describe('Error handling', () => {
    test('should handle invalid JSON gracefully', async () => {
      const inputFile = path.join(tempDir, 'input.md');
      await fs.writeFile(inputFile, 'Hello {{name}}');

      const result = spawnSync('node', [
        cliPath,
        inputFile,
        '--template-variables',
        'invalid json'
      ], { encoding: 'utf-8' });

      // Invalid JSON that doesn't match key=value format will cause an error
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Invalid variable format');
    });

    test('should handle malformed variable syntax', async () => {
      const inputFile = path.join(tempDir, 'malformed.md');
      await fs.writeFile(inputFile, 'Good: {{good}}, Bad: {{bad');

      const result = spawnSync('node', [
        cliPath,
        inputFile,
        '--template-variables',
        '{"good": "OK", "bad": "NOTOK"}'
      ], { encoding: 'utf-8' });

      expect(result.stdout).toBe('Good: OK, Bad: {{bad');
    });
  });
});