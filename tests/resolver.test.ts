import { resolvePath, fileExists, getDirectory, joinPath, substituteVariables } from '../src/resolver';
import { SecurityErrorCode } from '../src/security';
import * as path from 'path';

const fixturesDir = path.join(__dirname, 'fixtures');

describe('resolvePath', () => {
  describe('basic resolution', () => {
    it('should resolve file with .md extension', () => {
      const result = resolvePath('simple', { basePath: fixturesDir });
      
      expect(result.exists).toBe(true);
      expect(result.absolutePath).toBe(path.join(fixturesDir, 'simple.md'));
      expect(result.originalReference).toBe('simple');
      expect(result.error).toBeUndefined();
    });

    it('should resolve file with explicit .md extension', () => {
      const result = resolvePath('simple.md', { basePath: fixturesDir });
      
      expect(result.exists).toBe(true);
      expect(result.absolutePath).toBe(path.join(fixturesDir, 'simple.md'));
    });

    it('should resolve file with .markdown extension', () => {
      const result = resolvePath('has-extension', { basePath: fixturesDir });
      
      expect(result.exists).toBe(true);
      expect(result.absolutePath).toBe(path.join(fixturesDir, 'has-extension.markdown'));
    });

    it('should resolve file with explicit .markdown extension', () => {
      const result = resolvePath('has-extension.markdown', { basePath: fixturesDir });
      
      expect(result.exists).toBe(true);
      expect(result.absolutePath).toBe(path.join(fixturesDir, 'has-extension.markdown'));
    });

    it('should resolve file without extension', () => {
      const result = resolvePath('no-extension', { basePath: fixturesDir });
      
      expect(result.exists).toBe(true);
      expect(result.absolutePath).toBe(path.join(fixturesDir, 'no-extension'));
    });
  });

  describe('nested paths', () => {
    it('should resolve nested file paths', () => {
      const result = resolvePath('sections/intro', { basePath: fixturesDir });
      
      expect(result.exists).toBe(true);
      expect(result.absolutePath).toBe(path.join(fixturesDir, 'sections/intro.md'));
    });

    it('should resolve deeply nested paths', () => {
      const result = resolvePath('sections/intro/overview', { basePath: fixturesDir });
      
      expect(result.exists).toBe(true);
      expect(result.absolutePath).toBe(path.join(fixturesDir, 'sections/intro/overview.md'));
    });

    it('should handle paths with dots', () => {
      const result = resolvePath('./simple', { basePath: fixturesDir });
      
      expect(result.exists).toBe(true);
      expect(result.absolutePath).toBe(path.join(fixturesDir, 'simple.md'));
    });
  });

  describe('custom extensions', () => {
    it('should use custom extensions list', () => {
      const result = resolvePath('has-extension', { basePath: fixturesDir, extensions: ['.markdown'] });
      
      expect(result.exists).toBe(true);
      expect(result.absolutePath).toBe(path.join(fixturesDir, 'has-extension.markdown'));
    });

    it('should try extensions in order', () => {
      const result = resolvePath('simple', { basePath: fixturesDir, extensions: ['.txt', '.md'] });
      
      expect(result.exists).toBe(true);
      expect(result.absolutePath).toBe(path.join(fixturesDir, 'simple.md'));
    });

    it('should work with empty extensions list', () => {
      const result = resolvePath('no-extension', { basePath: fixturesDir, extensions: [] });
      
      expect(result.exists).toBe(true);
      expect(result.absolutePath).toBe(path.join(fixturesDir, 'no-extension'));
    });
  });

  describe('missing files', () => {
    it('should handle missing files', () => {
      const result = resolvePath('nonexistent', { basePath: fixturesDir });
      
      expect(result.exists).toBe(false);
      expect(result.absolutePath).toBe(path.join(fixturesDir, 'nonexistent'));
      expect(result.error).toContain('File not found');
    });

    it('should handle missing nested files', () => {
      const result = resolvePath('sections/missing', { basePath: fixturesDir });
      
      expect(result.exists).toBe(false);
      expect(result.error).toContain('File not found');
    });
  });

  describe('security integration', () => {
    it('should reject path traversal attempts that escape base directory', () => {
      const result = resolvePath('../../../etc/passwd', { basePath: fixturesDir });
      
      expect(result.exists).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.errorCode).toBe(SecurityErrorCode.OUTSIDE_BASE);
      expect(result.absolutePath).toBe('');
    });

    it('should reject absolute paths', () => {
      const result = resolvePath('/etc/passwd', { basePath: fixturesDir });
      
      expect(result.exists).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.errorCode).toBe(SecurityErrorCode.ABSOLUTE_PATH);
      expect(result.absolutePath).toBe('');
    });

    it('should reject paths that escape base directory', () => {
      const result = resolvePath('../../README.md', { basePath: fixturesDir });
      
      expect(result.exists).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.errorCode).toBe(SecurityErrorCode.OUTSIDE_BASE);
      expect(result.absolutePath).toBe('');
    });

    it('should handle paths that normalize to safe paths', () => {
      const result = resolvePath('sections/../simple', { basePath: fixturesDir });
      
      expect(result.exists).toBe(true);
      expect(result.absolutePath).toBe(path.join(fixturesDir, 'simple.md'));
    });
  });

  describe('edge cases', () => {
    it('should handle empty reference', () => {
      const result = resolvePath('', { basePath: fixturesDir });
      
      expect(result.exists).toBe(false);
    });

    it('should handle reference with only extension', () => {
      const result = resolvePath('.md', { basePath: fixturesDir });
      
      expect(result.exists).toBe(false);
    });

    it('should handle paths with multiple dots', () => {
      const result = resolvePath('file.test.md', { basePath: fixturesDir });
      
      expect(result.exists).toBe(false);
      expect(result.error).toContain('File not found');
    });

    it('should preserve original reference in result', () => {
      const ref = 'sections/intro';
      const result = resolvePath(ref, { basePath: fixturesDir });
      
      expect(result.originalReference).toBe(ref);
    });
  });

  describe('variable substitution', () => {
    it('should substitute single variable', () => {
      const result = resolvePath('content-{{lang}}', { 
        basePath: fixturesDir,
        variables: { lang: 'en' }
      });
      
      expect(result.exists).toBe(true);
      expect(result.absolutePath).toBe(path.join(fixturesDir, 'content-en.md'));
      expect(result.originalReference).toBe('content-{{lang}}');
    });

    it('should substitute multiple variables', () => {
      const result = resolvePath('doc-{{version}}-{{lang}}', { 
        basePath: fixturesDir,
        variables: { version: 'v1', lang: 'en' }
      });
      
      expect(result.exists).toBe(true);
      expect(result.absolutePath).toBe(path.join(fixturesDir, 'doc-v1-en.md'));
    });

    it('should handle undefined variables in non-strict mode', () => {
      const result = resolvePath('content-{{lang}}', { 
        basePath: fixturesDir,
        variables: {},
        strict: false
      });
      
      expect(result.exists).toBe(false);
      expect(result.error).toContain('File not found: content-{{lang}}');
    });

    it('should throw on undefined variables in strict mode', () => {
      const result = resolvePath('content-{{lang}}', { 
        basePath: fixturesDir,
        variables: {},
        strict: true
      });
      
      expect(result.exists).toBe(false);
      expect(result.error).toContain('Undefined variable: lang');
    });

    it('should handle variables with special characters', () => {
      const result = resolvePath('content-{{lang-code}}', { 
        basePath: fixturesDir,
        variables: { 'lang-code': 'en' }
      });
      
      // This would need a fixture named content-en.md to pass
      expect(result.originalReference).toBe('content-{{lang-code}}');
    });

    it('should substitute variables before security checks', () => {
      const result = resolvePath('{{dir}}/file', { 
        basePath: fixturesDir,
        variables: { dir: '../..' }
      });
      
      expect(result.exists).toBe(false);
      expect(result.errorCode).toBe(SecurityErrorCode.OUTSIDE_BASE);
    });
  });
});

describe('substituteVariables', () => {
  it('should substitute single variable', () => {
    const result = substituteVariables('file-{{lang}}.md', { lang: 'en' });
    expect(result).toBe('file-en.md');
  });

  it('should substitute multiple variables', () => {
    const result = substituteVariables('{{type}}-{{version}}-{{lang}}.md', {
      type: 'doc',
      version: 'v1',
      lang: 'es'
    });
    expect(result).toBe('doc-v1-es.md');
  });

  it('should handle missing variables in non-strict mode', () => {
    const result = substituteVariables('file-{{lang}}.md', {});
    expect(result).toBe('file-{{lang}}.md');
  });

  it('should throw on missing variables in strict mode', () => {
    expect(() => {
      substituteVariables('file-{{lang}}.md', {}, true);
    }).toThrow('Undefined variable: lang');
  });

  it('should handle variables with dashes and underscores', () => {
    const result = substituteVariables('{{var-name}}_{{var_name2}}.md', {
      'var-name': 'foo',
      'var_name2': 'bar'
    });
    expect(result).toBe('foo_bar.md');
  });

  it('should not substitute partial matches', () => {
    const result = substituteVariables('{{{lang}}} {{lang}}}', { lang: 'en' });
    expect(result).toBe('{en} en}');
  });

  it('should handle empty string', () => {
    const result = substituteVariables('', { lang: 'en' });
    expect(result).toBe('');
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