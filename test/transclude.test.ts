// tests/transclude.test.ts

import { processLine, transclude, transcludeFile } from '../src/transclude';
import { MemoryFileCache } from '../src/fileCache';
import path from 'path';

describe('processLine', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');

  const options = {
    basePath: fixturesDir,
    variables: {},
    cache: new MemoryFileCache(),
    strict: false
  };

  it('should return line unchanged if no transclusion present', async () => {
    const result = await processLine('Just a regular line.', options);
    expect(result.output).toBe('Just a regular line.');
    expect(result.errors).toEqual([]);
  });

  it('should replace a single transclusion with file content', async () => {
    const result = await processLine('Start ![[simple]] end.', options);
    expect(result.output).toContain('Start ');
    expect(result.output).toContain('# Simple File');
    expect(result.output).toContain(' end.');
    expect(result.errors).toEqual([]);
  });

  it('should replace multiple transclusions on same line', async () => {
    const result = await processLine('![[simple]] + ![[no-extension]]', options);
    expect(result.output).toContain('# Simple File');
    expect(result.output).toContain('This file has no extension.');
    expect(result.errors).toEqual([]);
  });

  it('should insert HTML comment if file is missing', async () => {
    const result = await processLine('![[missing-file]]', options);
    expect(result.output).toContain('<!-- Error: File not found: missing-file -->');
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].code).toBe('FILE_NOT_FOUND');
  });

  it('should insert HTML comment if readFile fails', async () => {
    const result = await processLine('![[binary.dat]]', options);
    expect(result.output).toContain('<!-- Error: Binary files are not supported');
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].code).toBe('READ_ERROR');
  });

  it('should trim trailing newline from included content', async () => {
    const result = await processLine('![[simple]]', options);
    expect(result.output.endsWith('\n')).toBe(false);
    // The content should be trimmed
    expect(result.output).not.toMatch(/\s+$/);
  });
});

describe('transclude', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');
  
  const options = {
    basePath: fixturesDir,
    variables: {},
    cache: new MemoryFileCache()
  };

  it('should process a simple string without transclusions', async () => {
    const input = 'Just some regular text.\nAnother line.';
    const result = await transclude(input, options);
    
    expect(result.content).toBe(input);
    expect(result.errors).toEqual([]);
    expect(result.processedFiles).toEqual([]);
  });

  it('should process multiple lines with transclusions', async () => {
    const input = `# My Document
![[simple]]
Some text
![[no-extension]]
End`;
    
    const result = await transclude(input, options);
    
    expect(result.content).toContain('# My Document');
    expect(result.content).toContain('# Simple File');
    expect(result.content).toContain('This file has no extension.');
    expect(result.content).toContain('Some text');
    expect(result.content).toContain('End');
    expect(result.errors).toEqual([]);
    expect(result.processedFiles.length).toBeGreaterThan(0);
  });

  it('should handle errors gracefully', async () => {
    const input = 'Before\n![[missing-file]]\nAfter';
    const result = await transclude(input, options);
    
    expect(result.content).toContain('Before');
    expect(result.content).toContain('<!-- Error: File not found: missing-file -->');
    expect(result.content).toContain('After');
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].code).toBe('FILE_NOT_FOUND');
  });

  it('should use default options when none provided', async () => {
    const input = 'No transclusions here';
    const result = await transclude(input);
    
    expect(result.content).toBe(input);
    expect(result.errors).toEqual([]);
  });

  it('should track processed files', async () => {
    const input = '![[simple]]';
    const result = await transclude(input, options);
    
    expect(result.processedFiles).toContain(
      path.join(fixturesDir, 'simple.md')
    );
  });
});

describe('transcludeFile', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');
  
  it('should process a file with transclusions', async () => {
    const filePath = path.join(fixturesDir, 'simple.md');
    const result = await transcludeFile(filePath);
    
    expect(result.content).toContain('# Simple File');
    expect(result.content).toContain('This is a simple test file');
    expect(result.errors).toEqual([]);
    expect(result.processedFiles).toContain(filePath);
  });

  it('should use file directory as basePath when not specified', async () => {
    const filePath = path.join(fixturesDir, 'sections', 'document.md');
    const result = await transcludeFile(filePath);
    
    // The document.md file doesn't have transclusions, but it should still process
    expect(result.content).toContain('# Document Title');
    expect(result.errors).toEqual([]);
  });

  it('should handle file read errors', async () => {
    const filePath = path.join(fixturesDir, 'non-existent.md');
    
    await expect(transcludeFile(filePath)).rejects.toThrow();
  });

  it('should respect provided options', async () => {
    const filePath = path.join(fixturesDir, 'simple.md');
    const cache = new MemoryFileCache();
    const result = await transcludeFile(filePath, { cache });
    
    expect(result.content).toContain('# Simple File');
    expect(result.processedFiles).toContain(filePath);
  });
});
