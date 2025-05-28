// tests/transclude.test.ts

import { processLine } from '../src/transclude';
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
    expect(result.output).toBe('Just a regular line.\n');
    expect(result.errors).toEqual([]);
  });

  it('should replace a single transclusion with file content', async () => {
    const result = await processLine('Start ![[simple]] end.', options);
    expect(result.output).toContain('Start ');
    expect(result.output).toContain('# Simple File');
    expect(result.output).toContain(' end.\n');
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
    expect(result.output).toContain('<!-- Missing: missing-file -->');
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].code).toBe('RESOLVE_ERROR');
  });

  it('should insert HTML comment if readFile fails', async () => {
    const result = await processLine('![[binary.dat]]', options);
    expect(result.output).toContain('<!-- Error: ![[binary.dat]] -->');
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].code).toBe('READ_ERROR');
  });

  it('should trim trailing newline from included content', async () => {
    const result = await processLine('![[simple]]', options);
    expect(result.output.endsWith('\n')).toBe(true);
    const parts = result.output.split('\n');
    expect(parts.length).toBeGreaterThan(1);
  });
});
