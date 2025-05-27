import { resolvePath, fileExists, getDirectory, joinPath } from '../src/resolver';
import { SecurityErrorCode } from '../src/security';
import * as path from 'path';

const fixturesDir = path.join(__dirname, 'fixtures');

describe('resolvePath', () => {
  describe('basic resolution', () => {
    it('should resolve file with .md extension', () => {
      const result = resolvePath('simple', fixturesDir);
      
      expect(result.exists).toBe(true);
      expect(result.absolutePath).toBe(path.join(fixturesDir, 'simple.md'));
      expect(result.originalReference).toBe('simple');
      expect(result.error).toBeUndefined();
    });

    it('should resolve file with explicit .md extension', () => {
      const result = resolvePath('simple.md', fixturesDir);
      
      expect(result.exists).toBe(true);
      expect(result.absolutePath).toBe(path.join(fixturesDir, 'simple.md'));
    });

    it('should resolve file with .markdown extension', () => {
      const result = resolvePath('has-extension', fixturesDir);
      
      expect(result.exists).toBe(true);
      expect(result.absolutePath).toBe(path.join(fixturesDir, 'has-extension.markdown'));
    });

    it('should resolve file with explicit .markdown extension', () => {
      const result = resolvePath('has-extension.markdown', fixturesDir);
      
      expect(result.exists).toBe(true);
      expect(result.absolutePath).toBe(path.join(fixturesDir, 'has-extension.markdown'));
    });

    it('should resolve file without extension', () => {
      const result = resolvePath('no-extension', fixturesDir);
      
      expect(result.exists).toBe(true);
      expect(result.absolutePath).toBe(path.join(fixturesDir, 'no-extension'));
    });
  });

  describe('nested paths', () => {
    it('should resolve nested file paths', () => {
      const result = resolvePath('sections/intro', fixturesDir);
      
      expect(result.exists).toBe(true);
      expect(result.absolutePath).toBe(path.join(fixturesDir, 'sections/intro.md'));
    });

    it('should resolve deeply nested paths', () => {
      const result = resolvePath('sections/intro/overview', fixturesDir);
      
      expect(result.exists).toBe(true);
      expect(result.absolutePath).toBe(path.join(fixturesDir, 'sections/intro/overview.md'));
    });

    it('should handle paths with dots', () => {
      const result = resolvePath('./simple', fixturesDir);
      
      expect(result.exists).toBe(true);
      expect(result.absolutePath).toBe(path.join(fixturesDir, 'simple.md'));
    });
  });

  describe('custom extensions', () => {
    it('should use custom extensions list', () => {
      const result = resolvePath('has-extension', fixturesDir, ['.markdown']);
      
      expect(result.exists).toBe(true);
      expect(result.absolutePath).toBe(path.join(fixturesDir, 'has-extension.markdown'));
    });

    it('should try extensions in order', () => {
      const result = resolvePath('simple', fixturesDir, ['.txt', '.md']);
      
      expect(result.exists).toBe(true);
      expect(result.absolutePath).toBe(path.join(fixturesDir, 'simple.md'));
    });

    it('should work with empty extensions list', () => {
      const result = resolvePath('no-extension', fixturesDir, []);
      
      expect(result.exists).toBe(true);
      expect(result.absolutePath).toBe(path.join(fixturesDir, 'no-extension'));
    });
  });

  describe('missing files', () => {
    it('should handle missing files', () => {
      const result = resolvePath('nonexistent', fixturesDir);
      
      expect(result.exists).toBe(false);
      expect(result.absolutePath).toBe(path.join(fixturesDir, 'nonexistent'));
      expect(result.error).toContain('File not found');
    });

    it('should handle missing nested files', () => {
      const result = resolvePath('sections/missing', fixturesDir);
      
      expect(result.exists).toBe(false);
      expect(result.error).toContain('File not found');
    });
  });

  describe('security integration', () => {
    it('should reject path traversal attempts', () => {
      const result = resolvePath('../../../etc/passwd', fixturesDir);
      
      expect(result.exists).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.errorCode).toBe(SecurityErrorCode.PATH_TRAVERSAL);
      expect(result.absolutePath).toBe('');
    });

    it('should reject absolute paths', () => {
      const result = resolvePath('/etc/passwd', fixturesDir);
      
      expect(result.exists).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.errorCode).toBe(SecurityErrorCode.ABSOLUTE_PATH);
      expect(result.absolutePath).toBe('');
    });

    it('should reject paths that escape base directory', () => {
      const result = resolvePath('../../README.md', fixturesDir);
      
      expect(result.exists).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.errorCode).toBe(SecurityErrorCode.PATH_TRAVERSAL);
      expect(result.absolutePath).toBe('');
    });

    it('should handle paths that normalize to safe paths', () => {
      const result = resolvePath('sections/../simple', fixturesDir);
      
      expect(result.exists).toBe(true);
      expect(result.absolutePath).toBe(path.join(fixturesDir, 'simple.md'));
    });
  });

  describe('edge cases', () => {
    it('should handle empty reference', () => {
      const result = resolvePath('', fixturesDir);
      
      expect(result.exists).toBe(false);
    });

    it('should handle reference with only extension', () => {
      const result = resolvePath('.md', fixturesDir);
      
      expect(result.exists).toBe(false);
    });

    it('should handle paths with multiple dots', () => {
      const result = resolvePath('file.test.md', fixturesDir);
      
      expect(result.exists).toBe(false);
      expect(result.error).toContain('File not found');
    });

    it('should preserve original reference in result', () => {
      const ref = 'sections/intro';
      const result = resolvePath(ref, fixturesDir);
      
      expect(result.originalReference).toBe(ref);
    });
  });
});

describe('fileExists', () => {
  it('should return true for existing files', () => {
    const filePath = path.join(fixturesDir, 'simple.md');
    expect(fileExists(filePath)).toBe(true);
  });

  it('should return false for non-existent files', () => {
    const filePath = path.join(fixturesDir, 'does-not-exist.md');
    expect(fileExists(filePath)).toBe(false);
  });

  it('should return false for directories', () => {
    expect(fileExists(fixturesDir)).toBe(false);
  });

  it('should handle invalid paths gracefully', () => {
    expect(fileExists('/definitely/not/a/real/path')).toBe(false);
  });
});

describe('getDirectory', () => {
  it('should return directory from file path', () => {
    expect(getDirectory('/path/to/file.md')).toBe('/path/to');
    expect(getDirectory('file.md')).toBe('.');
    expect(getDirectory('path/to/file.md')).toBe('path/to');
  });
});

describe('joinPath', () => {
  it('should join path segments', () => {
    expect(joinPath('path', 'to', 'file.md')).toBe(path.join('path', 'to', 'file.md'));
    expect(joinPath('/base', 'sub', 'file.md')).toBe(path.join('/base', 'sub', 'file.md'));
  });

  it('should handle empty segments', () => {
    expect(joinPath('')).toBe('.');
    expect(joinPath('', 'file.md')).toBe('file.md');
  });
});