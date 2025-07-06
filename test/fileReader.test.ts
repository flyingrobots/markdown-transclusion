import { readFile, readFileSync, FileReaderError, FileReaderErrorCode } from '../src/fileReader';
import { MemoryFileCache } from '../src/fileCache';
import * as path from 'path';
import * as fs from 'fs';

const fixturesDir = path.join(__dirname, 'fixtures');

describe('readFile', () => {
  describe('basic file reading', () => {
    it('should read a simple file', async () => {
      const content = await readFile(path.join(fixturesDir, 'simple.md'));
      expect(content).toContain('# Simple File');
      expect(content).toContain('This is a simple test file');
    });

    it('should read file without extension', async () => {
      const content = await readFile(path.join(fixturesDir, 'no-extension'));
      expect(content).toBe('This file has no extension.');
    });

    it('should handle different encodings', async () => {
      const content = await readFile(path.join(fixturesDir, 'simple.md'), undefined, 'utf8');
      expect(content).toContain('# Simple File');
    });
  });

  describe('Unicode handling', () => {
    it('should read Unicode filenames', async () => {
      const content = await readFile(path.join(fixturesDir, 'unicode/文档.md'));
      expect(content).toContain('# 中文文档');
      expect(content).toContain('你好世界');
      expect(content).toContain('😀 🎉 ✨');
    });

    it('should handle BOM correctly', async () => {
      const content = await readFile(path.join(fixturesDir, 'with-bom.md'));
      expect(content.startsWith('# File with BOM')).toBe(true);
      expect(content).not.toContain('\uFEFF');
    });
  });

  describe('error handling', () => {
    it('should throw FileReaderError for missing files', async () => {
      await expect(
        readFile(path.join(fixturesDir, 'nonexistent.md'))
      ).rejects.toThrow(FileReaderError);

      try {
        await readFile(path.join(fixturesDir, 'nonexistent.md'));
      } catch (error) {
        expect(error).toBeInstanceOf(FileReaderError);
        expect((error as FileReaderError).code).toBe(FileReaderErrorCode.FILE_NOT_FOUND);
      }
    });

    it('should throw error for directories', async () => {
      await expect(
        readFile(fixturesDir)
      ).rejects.toThrow(FileReaderError);

      try {
        await readFile(fixturesDir);
      } catch (error) {
        expect(error).toBeInstanceOf(FileReaderError);
        expect((error as FileReaderError).code).toBe(FileReaderErrorCode.NOT_A_FILE);
      }
    });

    it('should throw error for binary files', async () => {
      await expect(
        readFile(path.join(fixturesDir, 'binary.dat'))
      ).rejects.toThrow(FileReaderError);

      try {
        await readFile(path.join(fixturesDir, 'binary.dat'));
      } catch (error) {
        expect(error).toBeInstanceOf(FileReaderError);
        expect((error as FileReaderError).code).toBe(FileReaderErrorCode.BINARY_FILE);
      }
    });
  });

  describe('caching', () => {
    it('should use cache when provided', async () => {
      const cache = new MemoryFileCache();
      const filePath = path.join(fixturesDir, 'simple.md');
      
      // First read - cache miss
      const content1 = await readFile(filePath, cache);
      expect(cache.stats().misses).toBe(1);
      expect(cache.stats().hits).toBe(0);
      
      // Second read - cache hit
      const content2 = await readFile(filePath, cache);
      expect(content1).toBe(content2);
      expect(cache.stats().misses).toBe(1);
      expect(cache.stats().hits).toBe(1);
    });

    it('should cache file content correctly', async () => {
      const cache = new MemoryFileCache();
      const filePath = path.join(fixturesDir, 'simple.md');
      
      await readFile(filePath, cache);
      
      const cached = cache.get(filePath);
      expect(cached).toBeDefined();
      expect(cached?.content).toContain('# Simple File');
    });
  });

  describe('edge cases', () => {
    it('should handle files with no trailing newline', async () => {
      const content = await readFile(path.join(fixturesDir, 'no-trailing-newline.md'));
      expect(content).toBe('This file has no trailing newline');
    });

    it('should handle empty files', async () => {
      // Create an empty file for testing
      const emptyPath = path.join(fixturesDir, 'empty-test.md');
      fs.writeFileSync(emptyPath, '');
      
      try {
        const content = await readFile(emptyPath);
        expect(content).toBe('');
      } finally {
        fs.unlinkSync(emptyPath);
      }
    });
  });
});

describe('readFileSync', () => {
  it('should read files synchronously', () => {
    const content = readFileSync(path.join(fixturesDir, 'simple.md'));
    expect(content).toContain('# Simple File');
  });

  it('should handle errors synchronously', () => {
    expect(() => {
      readFileSync(path.join(fixturesDir, 'nonexistent.md'));
    }).toThrow(FileReaderError);
  });

  it('should use cache when provided', () => {
    const cache = new MemoryFileCache();
    const filePath = path.join(fixturesDir, 'simple.md');
    
    // First read
    readFileSync(filePath, cache);
    expect(cache.stats().misses).toBe(1);
    
    // Second read - from cache
    readFileSync(filePath, cache);
    expect(cache.stats().hits).toBe(1);
  });

  it('should handle BOM in sync mode', () => {
    const content = readFileSync(path.join(fixturesDir, 'with-bom.md'));
    expect(content.startsWith('# File with BOM')).toBe(true);
    expect(content).not.toContain('\uFEFF');
  });

  it('should detect binary files in sync mode', () => {
    expect(() => {
      readFileSync(path.join(fixturesDir, 'binary.dat'));
    }).toThrow(FileReaderError);
  });
});