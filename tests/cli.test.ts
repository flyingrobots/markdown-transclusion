import { spawn } from 'child_process';
import { createReadStream, createWriteStream, promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

describe('CLI Integration', () => {
  let tempDir: string;
  const cliPath = join(__dirname, '..', 'dist', 'cli.js');
  
  beforeEach(async () => {
    // Create unique temp directory
    tempDir = join(tmpdir(), `md-transclusion-test-${randomBytes(8).toString('hex')}`);
    await fs.mkdir(tempDir, { recursive: true });
  });
  
  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });
  
  /**
   * Run the CLI with given arguments
   */
  function runCli(args: string[], input?: string): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number | null;
  }> {
    return new Promise((resolve) => {
      const proc = spawn('node', [cliPath, ...args], {
        cwd: tempDir
      });
      
      let stdout = '';
      let stderr = '';
      
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      proc.on('close', (exitCode) => {
        resolve({ stdout, stderr, exitCode });
      });
      
      if (input) {
        proc.stdin.write(input);
        proc.stdin.end();
      }
    });
  }
  
  describe('POSIX Compliance', () => {
    it('should read from stdin when no file is specified', async () => {
      const input = '# Test\n![[section]]';
      const result = await runCli([], input);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('# Test');
      expect(result.stderr).toContain('WARN'); // Warning about missing file
    });
    
    it('should write to stdout by default', async () => {
      await fs.writeFile(join(tempDir, 'input.md'), '# Test Document');
      
      const result = await runCli(['input.md']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe('# Test Document');
      expect(result.stderr).toBe('');
    });
    
    it('should write errors to stderr', async () => {
      await fs.writeFile(join(tempDir, 'input.md'), '![[missing.md]]');
      
      const result = await runCli(['input.md']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('<!-- Error: File not found');
      expect(result.stderr).toContain('WARN');
      expect(result.stderr).toContain('missing.md');
    });
    
    it('should exit with code 1 on error in strict mode', async () => {
      await fs.writeFile(join(tempDir, 'input.md'), '![[missing.md]]');
      
      const result = await runCli(['input.md', '--strict']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('ERROR');
    });
    
    it('should support piping to other commands', async () => {
      // This test verifies output is suitable for piping
      await fs.writeFile(join(tempDir, 'input.md'), '# Title\nContent');
      
      const result = await runCli(['input.md']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe('# Title\nContent');
      expect(result.stderr).toBe('');
      // No extra newlines or formatting that would break pipes
    });
  });
  
  describe('Help and Version', () => {
    it('should show help with --help', async () => {
      const result = await runCli(['--help']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('markdown-transclusion');
      expect(result.stdout).toContain('USAGE:');
      expect(result.stderr).toBe('');
    });
    
    it('should show help with -h', async () => {
      const result = await runCli(['-h']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('markdown-transclusion');
      expect(result.stdout).toContain('USAGE:');
    });
    
    it('should show version with --version', async () => {
      const result = await runCli(['--version']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('1.0.0');
      expect(result.stderr).toBe('');
    });
    
    it('should show version with -v', async () => {
      const result = await runCli(['-v']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('1.0.0');
    });
  });
  
  describe('File Processing', () => {
    it('should process file with transclusions', async () => {
      await fs.writeFile(join(tempDir, 'main.md'), '# Main\n![[section]]');
      await fs.writeFile(join(tempDir, 'section.md'), '## Section Content');
      
      const result = await runCli(['main.md']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe('# Main\n## Section Content');
      expect(result.stderr).toBe('');
    });
    
    it('should respect base path', async () => {
      await fs.mkdir(join(tempDir, 'docs'));
      await fs.writeFile(join(tempDir, 'main.md'), '![[intro]]');
      await fs.writeFile(join(tempDir, 'docs', 'intro.md'), '# Introduction');
      
      const result = await runCli(['main.md', '--base-path', 'docs']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe('# Introduction');
    });
    
    it('should support variable substitution', async () => {
      await fs.writeFile(join(tempDir, 'template.md'), '![[content-{{lang}}]]');
      await fs.writeFile(join(tempDir, 'content-en.md'), 'English content');
      await fs.writeFile(join(tempDir, 'content-es.md'), 'Contenido español');
      
      const resultEn = await runCli(['template.md', '--variables', 'lang=en']);
      expect(resultEn.stdout).toBe('English content');
      
      const resultEs = await runCli(['template.md', '--variables', 'lang=es']);
      expect(resultEs.stdout).toBe('Contenido español');
    });
    
    it('should write to output file', async () => {
      await fs.writeFile(join(tempDir, 'input.md'), '# Test');
      
      const result = await runCli(['input.md', '--output', 'output.md']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe(''); // Nothing to stdout
      
      const output = await fs.readFile(join(tempDir, 'output.md'), 'utf-8');
      expect(output).toBe('# Test');
    });
  });
  
  describe('Validation Mode', () => {
    it('should validate without processing', async () => {
      await fs.writeFile(join(tempDir, 'main.md'), '![[exists]]\n![[missing]]');
      await fs.writeFile(join(tempDir, 'exists.md'), 'Content');
      
      const result = await runCli(['main.md', '--validate-only']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe(''); // No content output
      expect(result.stderr).toContain('WARN');
      expect(result.stderr).toContain('missing.md');
      expect(result.stderr).toContain('INFO');
      expect(result.stderr).toContain('Validation completed');
    });
    
    it('should fail validation in strict mode', async () => {
      await fs.writeFile(join(tempDir, 'main.md'), '![[missing]]');
      
      const result = await runCli(['main.md', '--validate-only', '--strict']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('ERROR');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle invalid arguments', async () => {
      const result = await runCli(['--invalid-flag']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('ERROR');
      expect(result.stderr).toContain('Unknown flag');
    });
    
    it('should handle missing input file', async () => {
      const result = await runCli(['nonexistent.md']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('ERROR');
      expect(result.stderr).toContain('Fatal error');
    });
    
    it('should handle circular references', async () => {
      await fs.writeFile(join(tempDir, 'a.md'), '![[b]]');
      await fs.writeFile(join(tempDir, 'b.md'), '![[a]]');
      
      const result = await runCli(['a.md']);
      
      expect(result.exitCode).toBe(0); // Non-strict mode
      expect(result.stdout).toContain('<!-- Error: Circular reference detected');
      expect(result.stdout).not.toContain('circular');
      expect(result.stderr).toContain('WARN');
    });
  });
  
  describe('Log Levels', () => {
    it('should respect log level setting', async () => {
      await fs.writeFile(join(tempDir, 'input.md'), '![[missing]]');
      
      // ERROR level - only errors
      const errorResult = await runCli(['input.md', '--log-level', 'ERROR']);
      expect(errorResult.stderr).toBe(''); // WARN is suppressed
      
      // WARN level - warnings and errors
      const warnResult = await runCli(['input.md', '--log-level', 'WARN']);
      expect(warnResult.stderr).toContain('WARN');
      
      // DEBUG level - everything
      const debugResult = await runCli(['input.md', '--log-level', 'DEBUG', '--validate-only']);
      expect(debugResult.stderr).toContain('INFO'); // Validation message
    });
  });
});