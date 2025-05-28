import {
  tokenizePath,
  substituteTokens,
  substituteVariables,
  PathToken
} from '../../src/utils/pathTokens';

describe('pathTokens', () => {
  describe('tokenizePath', () => {
    it('should tokenize simple text', () => {
      const tokens = tokenizePath('simple/path/file.md');
      expect(tokens).toEqual([
        { type: 'text', value: 'simple/path/file.md' }
      ]);
    });

    it('should tokenize single variable', () => {
      const tokens = tokenizePath('file-{{lang}}.md');
      expect(tokens).toEqual([
        { type: 'text', value: 'file-' },
        { type: 'variable', name: 'lang', original: '{{lang}}' },
        { type: 'text', value: '.md' }
      ]);
    });

    it('should tokenize multiple variables', () => {
      const tokens = tokenizePath('{{dir}}/{{name}}-{{version}}');
      expect(tokens).toEqual([
        { type: 'variable', name: 'dir', original: '{{dir}}' },
        { type: 'text', value: '/' },
        { type: 'variable', name: 'name', original: '{{name}}' },
        { type: 'text', value: '-' },
        { type: 'variable', name: 'version', original: '{{version}}' }
      ]);
    });

    it('should handle adjacent variables', () => {
      const tokens = tokenizePath('{{prefix}}{{suffix}}');
      expect(tokens).toEqual([
        { type: 'variable', name: 'prefix', original: '{{prefix}}' },
        { type: 'variable', name: 'suffix', original: '{{suffix}}' }
      ]);
    });

    it('should handle empty string', () => {
      const tokens = tokenizePath('');
      expect(tokens).toEqual([]);
    });

    it('should handle variables with underscores and dashes', () => {
      const tokens = tokenizePath('{{my-var_name}}');
      expect(tokens).toEqual([
        { type: 'variable', name: 'my-var_name', original: '{{my-var_name}}' }
      ]);
    });
  });

  describe('substituteTokens', () => {
    it('should substitute simple variables', () => {
      const tokens: PathToken[] = [
        { type: 'text', value: 'file-' },
        { type: 'variable', name: 'lang', original: '{{lang}}' },
        { type: 'text', value: '.md' }
      ];
      
      const result = substituteTokens(tokens, {
        variables: { lang: 'en' }
      });
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('file-en.md');
      }
    });

    it('should handle missing variables in non-strict mode', () => {
      const tokens: PathToken[] = [
        { type: 'variable', name: 'missing', original: '{{missing}}' }
      ];
      
      const result = substituteTokens(tokens, {
        variables: {},
        strict: false
      });
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('{{missing}}');
      }
    });

    it('should error on missing variables in strict mode', () => {
      const tokens: PathToken[] = [
        { type: 'variable', name: 'missing', original: '{{missing}}' }
      ];
      
      const result = substituteTokens(tokens, {
        variables: {},
        strict: true
      });
      
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UNDEFINED_VARIABLE');
        expect(result.error.variable).toBe('missing');
      }
    });

    it('should handle recursive substitution', () => {
      const tokens = tokenizePath('{{var1}}');
      
      const result = substituteTokens(tokens, {
        variables: {
          var1: 'prefix-{{var2}}',
          var2: 'value'
        }
      });
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('prefix-value');
      }
    });

    it('should detect circular references', () => {
      const tokens = tokenizePath('{{var1}}');
      
      const result = substituteTokens(tokens, {
        variables: {
          var1: '{{var2}}',
          var2: '{{var1}}'
        }
      });
      
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('CIRCULAR_REFERENCE');
      }
    });

    it('should respect max depth', () => {
      const tokens = tokenizePath('{{var1}}');
      
      const result = substituteTokens(tokens, {
        variables: {
          var1: '{{var2}}',
          var2: '{{var3}}',
          var3: 'value'
        },
        maxDepth: 2
      });
      
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('MAX_DEPTH_EXCEEDED');
      }
    });

    it('should handle deeply nested variables', () => {
      const tokens = tokenizePath('{{level1}}');
      
      const result = substituteTokens(tokens, {
        variables: {
          level1: 'a-{{level2}}',
          level2: 'b-{{level3}}',
          level3: 'c-{{level4}}',
          level4: 'final'
        },
        maxDepth: 10
      });
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('a-b-c-final');
      }
    });
  });

  describe('substituteVariables (compatibility)', () => {
    it('should work like the original function', () => {
      const result = substituteVariables(
        'file-{{lang}}.md',
        { lang: 'en' }
      );
      expect(result).toBe('file-en.md');
    });

    it('should throw in strict mode for undefined vars', () => {
      expect(() => {
        substituteVariables('{{missing}}', {}, true);
      }).toThrow('Undefined variable: missing');
    });

    it('should return original on error in non-strict mode', () => {
      // Create a circular reference scenario
      const result = substituteVariables(
        '{{var1}}',
        { var1: '{{var1}}' },
        false
      );
      // In non-strict mode, returns original path on error
      expect(result).toBe('{{var1}}');
    });
  });
});