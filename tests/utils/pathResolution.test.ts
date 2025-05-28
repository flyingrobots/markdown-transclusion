import {
  generatePathsToTry,
  validateReferencePath,
  validateWithinBase,
  checkFileExists,
  findExistingFile,
  normalizePath,
  resolveToAbsolutePath
} from '../../src/utils/pathResolution';
import { SecurityErrorCode } from '../../src/security';
import * as path from 'path';

describe('pathResolution utilities', () => {
  const basePath = '/test/base';

  describe('generatePathsToTry', () => {
    it('should return single path for file with extension', () => {
      const paths = generatePathsToTry('file.md', ['.md', '.markdown']);
      expect(paths).toEqual(['file.md']);
    });

    it('should add extensions for file without extension', () => {
      const paths = generatePathsToTry('file', ['.md', '.markdown']);
      expect(paths).toEqual(['file', 'file.md', 'file.markdown']);
    });

    it('should handle empty extensions array', () => {
      const paths = generatePathsToTry('file', []);
      expect(paths).toEqual(['file']);
    });

    it('should handle file with extension already', () => {
      const paths = generatePathsToTry('file.test', ['.md']);
      expect(paths).toEqual(['file.test']); // .test is treated as extension
    });
    
    it('should handle file.name pattern without extension', () => {
      const paths = generatePathsToTry('file.name', []);
      expect(paths).toEqual(['file.name']); // .name is the extension
    });
  });

  describe('validateReferencePath', () => {
    it('should accept valid paths', () => {
      const result = validateReferencePath('valid/path');
      expect(result.ok).toBe(true);
    });

    it('should reject paths with ..', () => {
      const result = validateReferencePath('../escape');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_PATH');
        expect(result.error.errorCode).toBe(SecurityErrorCode.PATH_TRAVERSAL);
      }
    });

    it('should reject absolute paths', () => {
      const result = validateReferencePath('/absolute/path');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_PATH');
        expect(result.error.errorCode).toBe(SecurityErrorCode.ABSOLUTE_PATH);
      }
    });

    it('should reject null bytes', () => {
      const result = validateReferencePath('file\0name');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_PATH');
        expect(result.error.errorCode).toBe(SecurityErrorCode.NULL_BYTE);
      }
    });
  });

  describe('validateWithinBase', () => {
    it('should accept paths within base', () => {
      const result = validateWithinBase(
        '/test/base/file.md',
        '/test/base',
        'file.md'
      );
      expect(result.ok).toBe(true);
    });

    it('should reject paths outside base', () => {
      const result = validateWithinBase(
        '/test/other/file.md',
        '/test/base',
        '../other/file.md'
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('OUTSIDE_BASE');
        expect(result.error.errorCode).toBe(SecurityErrorCode.OUTSIDE_BASE);
      }
    });

    it('should accept nested paths within base', () => {
      const result = validateWithinBase(
        '/test/base/nested/deep/file.md',
        '/test/base',
        'nested/deep/file.md'
      );
      expect(result.ok).toBe(true);
    });
  });

  describe('checkFileExists', () => {
    it('should return true for existing files', () => {
      const fixturePath = path.join(__dirname, '../fixtures/simple.md');
      expect(checkFileExists(fixturePath)).toBe(true);
    });

    it('should return false for non-existent files', () => {
      expect(checkFileExists('/non/existent/file.md')).toBe(false);
    });

    it('should return false for directories', () => {
      const dirPath = path.join(__dirname, '../fixtures');
      expect(checkFileExists(dirPath)).toBe(false);
    });
  });

  describe('findExistingFile', () => {
    const fixturesBase = path.join(__dirname, '../fixtures');

    it('should find first existing file', () => {
      const paths = ['non-existent.md', 'simple.md', 'also-exists.md'];
      const result = findExistingFile(paths, fixturesBase);
      
      expect(result).not.toBeNull();
      expect(result?.exists).toBe(true);
      expect(result?.absolutePath).toContain('simple.md');
    });

    it('should return null if no files exist', () => {
      const paths = ['not-there.md', 'also-not.md'];
      const result = findExistingFile(paths, fixturesBase);
      
      expect(result).toBeNull();
    });

    it('should handle empty array', () => {
      const result = findExistingFile([], fixturesBase);
      expect(result).toBeNull();
    });
  });

  describe('normalizePath', () => {
    it('should normalize paths with . and ..', () => {
      expect(normalizePath('a/./b/../c')).toBe('a/c');
    });

    it('should handle multiple slashes', () => {
      expect(normalizePath('a//b///c')).toBe('a/b/c');
    });

    it('should preserve leading slash', () => {
      expect(normalizePath('/a/./b')).toBe('/a/b');
    });

    it('should handle empty path', () => {
      expect(normalizePath('')).toBe('.');
    });
  });

  describe('resolveToAbsolutePath', () => {
    it('should resolve relative to base path', () => {
      const result = resolveToAbsolutePath('file.md', '/base/path');
      expect(result).toBe('/base/path/file.md');
    });

    it('should handle nested paths', () => {
      const result = resolveToAbsolutePath('nested/file.md', '/base');
      expect(result).toBe('/base/nested/file.md');
    });

    it('should normalize the result', () => {
      const result = resolveToAbsolutePath('./file.md', '/base');
      expect(result).toBe('/base/file.md');
    });
  });
});