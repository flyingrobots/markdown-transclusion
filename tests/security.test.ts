import { validatePath, isWithinBasePath, sanitizePath, SecurityError, SecurityErrorCode } from '../src/security';
import * as path from 'path';

// Helper to test security errors
function expectSecurityError(fn: () => void, expectedCode: SecurityErrorCode): void {
  try {
    fn();
    fail('Expected SecurityError to be thrown');
  } catch (e) {
    expect(e).toBeInstanceOf(SecurityError);
    expect((e as SecurityError).code).toBe(expectedCode);
  }
}

describe('validatePath', () => {
  describe('valid paths', () => {
    it('should accept simple relative paths', () => {
      expect(validatePath('file.md')).toBe(true);
      expect(validatePath('path/to/file.md')).toBe(true);
      expect(validatePath('./file.md')).toBe(true);
      expect(validatePath('./path/to/file.md')).toBe(true);
    });

    it('should accept paths with dots in filenames', () => {
      expect(validatePath('file.test.md')).toBe(true);
      expect(validatePath('v1.2.3/changelog.md')).toBe(true);
    });

    it('should accept paths with special characters', () => {
      expect(validatePath('file-with-dash.md')).toBe(true);
      expect(validatePath('file_with_underscore.md')).toBe(true);
      expect(validatePath('file with spaces.md')).toBe(true);
      expect(validatePath('文档/中文.md')).toBe(true);
    });

    it('should accept nested paths', () => {
      expect(validatePath('a/b/c/d/e/file.md')).toBe(true);
      expect(validatePath('deeply/nested/path/to/file.md')).toBe(true);
    });
  });

  describe('path traversal attempts', () => {
    it('should reject paths starting with ..', () => {
      expectSecurityError(() => validatePath('../file.md'), SecurityErrorCode.PATH_TRAVERSAL);
      expectSecurityError(() => validatePath('../../file.md'), SecurityErrorCode.PATH_TRAVERSAL);
      expectSecurityError(() => validatePath('../../../etc/passwd'), SecurityErrorCode.PATH_TRAVERSAL);
    });

    it('should reject paths with .. in the middle', () => {
      expectSecurityError(() => validatePath('path/../../../etc/passwd'), SecurityErrorCode.PATH_TRAVERSAL);
      expectSecurityError(() => validatePath('some/path/../../../secret'), SecurityErrorCode.PATH_TRAVERSAL);
    });

    it('should reject paths with backslash traversal', () => {
      expectSecurityError(() => validatePath('..\\file.md'), SecurityErrorCode.PATH_TRAVERSAL);
      expectSecurityError(() => validatePath('path\\..\\..\\file.md'), SecurityErrorCode.PATH_TRAVERSAL);
    });

    it('should reject URL-encoded traversal attempts', () => {
      expectSecurityError(() => validatePath('%2e%2e%2ffile.md'), SecurityErrorCode.PATH_TRAVERSAL);
      expectSecurityError(() => validatePath('%2e%2e/file.md'), SecurityErrorCode.PATH_TRAVERSAL);
      expectSecurityError(() => validatePath('..%2ffile.md'), SecurityErrorCode.PATH_TRAVERSAL);
      expectSecurityError(() => validatePath('%2e%2e%5cfile.md'), SecurityErrorCode.PATH_TRAVERSAL);
    });

    it('should reject double-encoded traversal attempts', () => {
      expectSecurityError(() => validatePath('%252e%252e%252ffile.md'), SecurityErrorCode.PATH_TRAVERSAL);
      expectSecurityError(() => validatePath('%252e%252e%255cfile.md'), SecurityErrorCode.PATH_TRAVERSAL);
    });

    it('should reject mixed case encoded attempts', () => {
      expectSecurityError(() => validatePath('%2E%2E%2Ffile.md'), SecurityErrorCode.PATH_TRAVERSAL);
      expectSecurityError(() => validatePath('%2e%2E/file.md'), SecurityErrorCode.PATH_TRAVERSAL);
    });
  });

  describe('absolute paths', () => {
    it('should reject Unix absolute paths', () => {
      expectSecurityError(() => validatePath('/etc/passwd'), SecurityErrorCode.ABSOLUTE_PATH);
      expectSecurityError(() => validatePath('/usr/bin/node'), SecurityErrorCode.ABSOLUTE_PATH);
      expectSecurityError(() => validatePath('/home/user/file.md'), SecurityErrorCode.ABSOLUTE_PATH);
    });

    it('should reject Windows absolute paths', () => {
      expectSecurityError(() => validatePath('C:\\Windows\\System32'), SecurityErrorCode.ABSOLUTE_PATH);
      expectSecurityError(() => validatePath('D:\\file.md'), SecurityErrorCode.ABSOLUTE_PATH);
      expectSecurityError(() => validatePath('c:/windows/system32'), SecurityErrorCode.ABSOLUTE_PATH);
    });

    it('should reject UNC paths', () => {
      expectSecurityError(() => validatePath('\\\\server\\share\\file.md'), SecurityErrorCode.ABSOLUTE_PATH);
      expectSecurityError(() => validatePath('//server/share/file.md'), SecurityErrorCode.ABSOLUTE_PATH);
    });
  });

  describe('null bytes', () => {
    it('should reject paths with null bytes', () => {
      expectSecurityError(() => validatePath('file\0.md'), SecurityErrorCode.NULL_BYTE);
      expectSecurityError(() => validatePath('path/to/file\0/test.md'), SecurityErrorCode.NULL_BYTE);
      expectSecurityError(() => validatePath('\0etc/passwd'), SecurityErrorCode.NULL_BYTE);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(validatePath('')).toBe(true);
    });

    it('should handle single dot', () => {
      expect(validatePath('.')).toBe(true);
      expect(validatePath('./.')).toBe(true);
    });

    it('should handle paths that normalize to safe paths', () => {
      expect(validatePath('path/./file.md')).toBe(true);
      expect(validatePath('./path/./to/./file.md')).toBe(true);
      expect(validatePath('path/subpath/../file.md')).toBe(true); // normalizes to path/file.md
    });
  });
});

describe('isWithinBasePath', () => {
  const basePath = '/home/user/project';

  it('should accept paths within base directory', () => {
    expect(isWithinBasePath('/home/user/project/file.md', basePath)).toBe(true);
    expect(isWithinBasePath('/home/user/project/subdir/file.md', basePath)).toBe(true);
    expect(isWithinBasePath('/home/user/project', basePath)).toBe(true);
  });

  it('should reject paths outside base directory', () => {
    expect(isWithinBasePath('/home/user/other/file.md', basePath)).toBe(false);
    expect(isWithinBasePath('/etc/passwd', basePath)).toBe(false);
    expect(isWithinBasePath('/home/user', basePath)).toBe(false);
    expect(isWithinBasePath('/home/user/project-other/file.md', basePath)).toBe(false);
  });

  it('should handle different path separators', () => {
    const windowsBase = 'C:\\Users\\user\\project';
    const windowsPath = 'C:\\Users\\user\\project\\file.md';
    
    // Node.js path module handles platform differences
    if (process.platform === 'win32') {
      expect(isWithinBasePath(windowsPath, windowsBase)).toBe(true);
    }
  });

  it('should handle relative paths by resolving them', () => {
    const cwd = process.cwd();
    const resolved = path.join(cwd, 'file.md');
    expect(isWithinBasePath(resolved, cwd)).toBe(true);
  });

  it('should prevent traversal even with absolute paths', () => {
    expect(isWithinBasePath('/home/user/project/../other/file.md', basePath)).toBe(false);
    expect(isWithinBasePath('/home/user/project/../../etc/passwd', basePath)).toBe(false);
  });
});

describe('sanitizePath', () => {
  it('should remove null bytes', () => {
    expect(sanitizePath('file\0.md')).toBe('file.md');
    expect(sanitizePath('\0\0test\0.md\0')).toBe('test.md');
  });

  it('should remove control characters', () => {
    expect(sanitizePath('file\x01\x02.md')).toBe('file.md');
    expect(sanitizePath('\x1ftest\x7f.md')).toBe('test.md');
  });

  it('should normalize path separators', () => {
    expect(sanitizePath('path//to///file.md')).toBe(`path${path.sep}to${path.sep}file.md`);
    expect(sanitizePath('path\\\\to\\\\\\file.md')).toBe(`path${path.sep}to${path.sep}file.md`);
    expect(sanitizePath('path\\/to/\\file.md')).toBe(`path${path.sep}to${path.sep}file.md`);
  });

  it('should handle normal paths without changes', () => {
    expect(sanitizePath('normal/path/file.md')).toBe(`normal${path.sep}path${path.sep}file.md`);
    expect(sanitizePath('file.md')).toBe('file.md');
  });

  it('should preserve Unicode characters', () => {
    expect(sanitizePath('文档/中文.md')).toBe(`文档${path.sep}中文.md`);
    expect(sanitizePath('café/naïve.md')).toBe(`café${path.sep}naïve.md`);
  });
});