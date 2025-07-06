import { parseCliArgs, getHelpText, getVersionText, CliArgsErrorCode } from '../../src/utils/cliArgs';
import { LogLevel } from '../../src/utils/logger';

describe('CLI Argument Parsing', () => {
  describe('parseCliArgs', () => {
    it('should parse input file as first positional argument', () => {
      const result = parseCliArgs(['node', 'cli.js', 'input.md']);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.input).toBe('input.md');
      }
    });
    
    it('should parse long flags with values', () => {
      const result = parseCliArgs([
        'node', 'cli.js',
        '--output', 'out.md',
        '--base-path', '/docs',
        '--extensions', 'md,markdown,txt',
        '--max-depth', '5',
        '--variables', 'lang=es,version=2'
      ]);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.output).toBe('out.md');
        expect(result.value.basePath).toBe('/docs');
        expect(result.value.extensions).toEqual(['md', 'markdown', 'txt']);
        expect(result.value.maxDepth).toBe(5);
        expect(result.value.variables).toEqual({ lang: 'es', version: '2' });
      }
    });
    
    it('should parse short flags', () => {
      const result = parseCliArgs([
        'node', 'cli.js',
        '-o', 'out.md',
        '-b', '/docs',
        '-s'
      ]);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.output).toBe('out.md');
        expect(result.value.basePath).toBe('/docs');
        expect(result.value.strict).toBe(true);
      }
    });
    
    it('should parse output control flags', () => {
      // Test verbose flag
      let result = parseCliArgs(['node', 'cli.js', '--verbose']);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.verbose).toBe(true);
        expect(result.value.porcelain).toBeUndefined();
        expect(result.value.progress).toBeUndefined();
      }
      
      // Test porcelain flag
      result = parseCliArgs(['node', 'cli.js', '--porcelain']);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.porcelain).toBe(true);
        expect(result.value.verbose).toBeUndefined();
        expect(result.value.progress).toBeUndefined();
      }
      
      // Test progress flag
      result = parseCliArgs(['node', 'cli.js', '--progress']);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.progress).toBe(true);
        expect(result.value.verbose).toBeUndefined();
        expect(result.value.porcelain).toBeUndefined();
      }
    });
    
    it('should reject conflicting output mode flags', () => {
      // Test verbose + porcelain
      let result = parseCliArgs(['node', 'cli.js', '--verbose', '--porcelain']);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(CliArgsErrorCode.CONFLICTING_FLAGS);
        expect(result.error.message).toContain('Cannot use multiple output modes');
      }
      
      // Test verbose + progress
      result = parseCliArgs(['node', 'cli.js', '--verbose', '--progress']);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(CliArgsErrorCode.CONFLICTING_FLAGS);
        expect(result.error.message).toContain('Cannot use multiple output modes');
      }
      
      // Test all three
      result = parseCliArgs(['node', 'cli.js', '--verbose', '--porcelain', '--progress']);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(CliArgsErrorCode.CONFLICTING_FLAGS);
        expect(result.error.message).toContain('Cannot use multiple output modes');
      }
    });
    
    it('should parse combined short flags', () => {
      const result = parseCliArgs(['node', 'cli.js', '-hs']);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.help).toBe(true);
        expect(result.value.strict).toBe(true);
      }
    });
    
    it('should parse log levels', () => {
      const levels = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
      const expected = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
      
      levels.forEach((level, i) => {
        const result = parseCliArgs(['node', 'cli.js', '--log-level', level]);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.logLevel).toBe(expected[i]);
        }
      });
    });
    
    it('should handle case-insensitive log levels', () => {
      const result = parseCliArgs(['node', 'cli.js', '--log-level', 'debug']);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.logLevel).toBe(LogLevel.DEBUG);
      }
    });
    
    it('should parse validate-only flag', () => {
      const result = parseCliArgs(['node', 'cli.js', '--validate-only']);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.validateOnly).toBe(true);
      }
    });
    
    it('should parse dry-run flag', () => {
      const result = parseCliArgs(['node', 'cli.js', '--dry-run']);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.dryRun).toBe(true);
      }
    });
    
    it('should error on unknown long flag', () => {
      const result = parseCliArgs(['node', 'cli.js', '--unknown-flag']);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(CliArgsErrorCode.INVALID_FLAG);
        expect(result.error.message).toContain('Unknown flag: --unknown-flag');
      }
    });
    
    it('should error on unknown short flag', () => {
      const result = parseCliArgs(['node', 'cli.js', '-x']);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(CliArgsErrorCode.INVALID_FLAG);
        expect(result.error.message).toContain('Unknown flag: -x');
      }
    });
    
    it('should error on missing value for required flag', () => {
      const result = parseCliArgs(['node', 'cli.js', '--output']);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(CliArgsErrorCode.MISSING_VALUE);
        expect(result.error.message).toContain('Flag --output requires a value');
      }
    });
    
    it('should error on invalid max-depth value', () => {
      const result = parseCliArgs(['node', 'cli.js', '--max-depth', 'abc']);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(CliArgsErrorCode.INVALID_VALUE);
        expect(result.error.message).toContain('Invalid max-depth value: abc');
      }
    });
    
    it('should error on negative max-depth value', () => {
      const result = parseCliArgs(['node', 'cli.js', '--max-depth', '-5']);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(CliArgsErrorCode.INVALID_VALUE);
        expect(result.error.message).toContain('Invalid max-depth value: -5');
      }
    });
    
    it('should error on invalid log level', () => {
      const result = parseCliArgs(['node', 'cli.js', '--log-level', 'VERBOSE']);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(CliArgsErrorCode.INVALID_VALUE);
        expect(result.error.message).toContain('Invalid log level: VERBOSE');
      }
    });
    
    it('should error on invalid variable format', () => {
      const result = parseCliArgs(['node', 'cli.js', '--variables', 'invalid']);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(CliArgsErrorCode.INVALID_VALUE);
        expect(result.error.message).toContain('Invalid variable format: invalid');
      }
    });
    
    it('should error on conflicting validate-only and output', () => {
      const result = parseCliArgs(['node', 'cli.js', '--validate-only', '--output', 'out.md']);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(CliArgsErrorCode.CONFLICTING_FLAGS);
        expect(result.error.message).toContain('Cannot use --output with --validate-only');
      }
    });
    
    it('should error on conflicting help and version', () => {
      const result = parseCliArgs(['node', 'cli.js', '--help', '--version']);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(CliArgsErrorCode.CONFLICTING_FLAGS);
        expect(result.error.message).toContain('Cannot use --help with --version');
      }
    });
    
    it('should handle variables with equals signs in values', () => {
      const result = parseCliArgs(['node', 'cli.js', '--variables', 'url=https://example.com?foo=bar']);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.variables).toEqual({ url: 'https://example.com?foo=bar' });
      }
    });
    
    it('should handle empty input', () => {
      const result = parseCliArgs(['node', 'cli.js']);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.input).toBeUndefined();
      }
    });
    
    it('should accept alternative flag names', () => {
      const result = parseCliArgs([
        'node', 'cli.js',
        '--out', 'output.md',
        '--base', '/docs',
        '--ext', 'md,txt',
        '--depth', '3',
        '--vars', 'x=1',
        '--log', 'DEBUG'
      ]);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.output).toBe('output.md');
        expect(result.value.basePath).toBe('/docs');
        expect(result.value.extensions).toEqual(['md', 'txt']);
        expect(result.value.maxDepth).toBe(3);
        expect(result.value.variables).toEqual({ x: '1' });
        expect(result.value.logLevel).toBe(LogLevel.DEBUG);
      }
    });
    
    it('should accept --validate as alias for --validate-only', () => {
      const result = parseCliArgs(['node', 'cli.js', '--validate']);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.validateOnly).toBe(true);
      }
    });
    
    it('should parse --strip-frontmatter flag', () => {
      const result = parseCliArgs(['node', 'cli.js', '--strip-frontmatter']);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.stripFrontmatter).toBe(true);
      }
    });
    
    it('should parse combination with --strip-frontmatter', () => {
      const result = parseCliArgs([
        'node', 'cli.js', 
        'input.md',
        '--strip-frontmatter',
        '--output', 'out.md',
        '--strict'
      ]);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.input).toBe('input.md');
        expect(result.value.stripFrontmatter).toBe(true);
        expect(result.value.output).toBe('out.md');
        expect(result.value.strict).toBe(true);
      }
    });
  });
  
  describe('getHelpText', () => {
    it('should include usage information', () => {
      const help = getHelpText();
      expect(help).toContain('markdown-transclusion');
      expect(help).toContain('USAGE:');
      expect(help).toContain('OPTIONS:');
      expect(help).toContain('EXAMPLES:');
    });
    
    it('should include all flags', () => {
      const help = getHelpText();
      expect(help).toContain('--help');
      expect(help).toContain('--version');
      expect(help).toContain('--output');
      expect(help).toContain('--base-path');
      expect(help).toContain('--verbose');
      expect(help).toContain('--porcelain');
      expect(help).toContain('--progress');
      expect(help).toContain('--extensions');
      expect(help).toContain('--max-depth');
      expect(help).toContain('--variables');
      expect(help).toContain('--strict');
      expect(help).toContain('--validate-only');
      expect(help).toContain('--strip-frontmatter');
      expect(help).toContain('--log-level');
    });
    
    it('should include output modes section', () => {
      const help = getHelpText();
      expect(help).toContain('OUTPUT MODES:');
      expect(help).toContain('Default mode follows Unix "silence is golden" principle');
      expect(help).toContain('--verbose shows detailed processing information to stderr');
      expect(help).toContain('--porcelain outputs machine-readable format to stderr');
      expect(help).toContain('--progress displays real-time progress bars to stderr');
      expect(help).toContain('Content always goes to stdout, metadata/progress to stderr');
    });
  });
  
  describe('getVersionText', () => {
    it('should return version string', () => {
      const version = getVersionText();
      expect(version).toContain('markdown-transclusion');
      expect(version).toMatch(/\d+\.\d+\.\d+/); // Semantic version pattern
    });
  });
});