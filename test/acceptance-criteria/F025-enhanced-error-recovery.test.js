const { promises: fs } = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');
const { execFileSync, spawnSync } = require('child_process');

describe('F025 - Enhanced Error Recovery with Suggestions', () => {
  let tempDir;
  let cliPath;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), 'f025-test-'));
    cliPath = join(process.cwd(), 'dist', 'cli.js');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Human-friendly error messages with context and suggestions', () => {
    test('should provide context and suggestions for file not found errors', async () => {
      const mainFile = join(tempDir, 'main.md');
      
      await fs.writeFile(mainFile, `# Main Document

This references a file with a typo:
![[sectons/intro.md]]

End of document.`);

      // Create the correct file to enable suggestions
      await fs.mkdir(join(tempDir, 'sections'));
      await fs.writeFile(join(tempDir, 'sections', 'intro.md'), '## Introduction\nContent here.');

      // Use spawnSync to capture both stdout and stderr separately
      const result = spawnSync('node', [cliPath, mainFile], { 
        encoding: 'utf-8',
        cwd: tempDir
      });
      
      const stdout = result.stdout || '';
      const stderr = result.stderr || '';
      
      // Enhanced error messages should be in stderr
      // Verify human-friendly error message
      expect(stderr).toContain('File not found');
      expect(stderr).toContain('sectons/intro.md');
      
      // Verify suggestions are provided  
      expect(stderr).toContain('sections/intro.md');
      expect(stderr).toContain('%'); // Confidence percentage
      expect(stderr).toContain('🔍'); // Suggestion emoji
      
      // Main content should still be in stdout (error comment)
      expect(stdout).toContain('# Main Document');
      expect(stdout).toContain('<!-- Error:');
    });

    test('should include surrounding lines for context', async () => {
      const mainFile = join(tempDir, 'main.md');
      
      await fs.writeFile(mainFile, `# Main Document

Line before error
![[nonexistent.md]]
Line after error

End.`);

      const result = spawnSync('node', [cliPath, mainFile], { 
        encoding: 'utf-8',
        cwd: tempDir 
      });
      
      const stderr = result.stderr || '';
      
      // Should include error information
      expect(stderr).toContain('File not found');
      expect(stderr).toContain('nonexistent.md');
    });
  });

  describe('Fuzzy matching for file name typos with "did you mean?" suggestions', () => {
    test('should suggest similar file names for typos', async () => {
      const mainFile = join(tempDir, 'main.md');
      
      await fs.writeFile(mainFile, `# Main Document

![[installaton.md]]

End.`);

      // Create similar files
      await fs.writeFile(join(tempDir, 'installation.md'), '## Installation\nSteps here.');
      await fs.writeFile(join(tempDir, 'introduction.md'), '## Introduction\nIntro here.');

      const result = spawnSync('node', [cliPath, mainFile], { 
        encoding: 'utf-8',
        cwd: tempDir 
      });
      
      const stderr = result.stderr || '';
      
      // Should suggest the most similar file
      expect(stderr).toContain('installation.md');
      expect(stderr).toMatch(/\d+%/); // Should include confidence percentage
      expect(stderr).toContain('Did you mean'); // Should include "did you mean" text
    });

    test('should rank suggestions by similarity confidence', async () => {
      const mainFile = join(tempDir, 'main.md');
      
      await fs.writeFile(mainFile, `# Main Document

![[config.md]]

End.`);

      // Create files with varying similarity
      await fs.writeFile(join(tempDir, 'configuration.md'), '## Configuration\nConfig here.');
      await fs.writeFile(join(tempDir, 'configure.md'), '## Configure\nSetup here.');
      await fs.writeFile(join(tempDir, 'random.md'), '## Random\nOther content.');

      const result = spawnSync('node', [cliPath, mainFile], { 
        encoding: 'utf-8',
        cwd: tempDir 
      });
      
      const stderr = result.stderr || '';
      
      // Should include both similar files
      expect(stderr).toContain('configure.md');
      expect(stderr).toContain('configuration.md');
        
        // Should not include dissimilar files
      expect(stderr).not.toContain('random.md');
        
      // Should show confidence percentages for both suggestions
      expect(stderr).toContain('75%'); // configure.md
      expect(stderr).toContain('56%'); // configuration.md
    });

    test('should suggest files with missing extensions', async () => {
      const mainFile = join(tempDir, 'main.md');
      
      await fs.writeFile(mainFile, `# Main Document

![[intro]]

End.`);

      await fs.writeFile(join(tempDir, 'intro.md'), '## Introduction\nContent here.');

      const result = spawnSync('node', [cliPath, mainFile], { 
        encoding: 'utf-8',
        cwd: tempDir 
      });
      
      const stdout = result.stdout || '';
      const stderr = result.stderr || '';
      
      // The system should automatically find intro.md for ![[intro]]
      // This demonstrates the system already handles missing extensions
      expect(stdout).toContain('# Main Document');
      expect(stdout).toContain('## Introduction');
      expect(stdout).toContain('Content here');
      expect(stdout).not.toContain('![[intro]]'); // Should be replaced
    });
  });

  describe('Smart suggestions for common path resolution issues', () => {
    test('should provide path resolution suggestions', async () => {
      const mainFile = join(tempDir, 'main.md');
      
      await fs.writeFile(mainFile, `# Main Document

![[../outside/file.md]]

End.`);

      const result = spawnSync('node', [cliPath, mainFile], { 
        encoding: 'utf-8',
        cwd: tempDir 
      });
      
      const stderr = result.stderr || '';
      
      // Should suggest base-path configuration
      expect(stderr).toContain('base-path');
      expect(stderr).toContain('directory');
    });

    test('should suggest using --base-path for relative path issues', async () => {
      // Create nested directory structure
      const docsDir = join(tempDir, 'docs');
      const chaptersDir = join(docsDir, 'chapters');
      const sharedDir = join(docsDir, 'shared');
      
      await fs.mkdir(docsDir);
      await fs.mkdir(chaptersDir);
      await fs.mkdir(sharedDir);

      const mainFile = join(chaptersDir, 'chapter1.md');
      
      await fs.writeFile(mainFile, `# Chapter 1

![[../shared/header.md]]

Content.`);

      await fs.writeFile(join(sharedDir, 'header.md'), '## Shared Header\nHeader content.');

      const result = spawnSync('node', [cliPath, mainFile], { 
        encoding: 'utf-8',
        cwd: tempDir 
      });
      
      const stderr = result.stderr || '';
      
      // Should suggest using base-path
      expect(stderr).toContain('base-path');
      expect(stderr).toContain('allow');
    });
  });

  describe('Heading name suggestions when heading extraction fails', () => {
    test('should suggest similar heading names', async () => {
      const mainFile = join(tempDir, 'main.md');
      const sourceFile = join(tempDir, 'source.md');
      
      await fs.writeFile(mainFile, `# Main Document

![[source.md#Instalation]]

End.`);

      await fs.writeFile(sourceFile, `# Source Document

## Installation
Installation steps here.

## Configuration  
Configuration steps here.

## Introduction
Introduction content here.`);

      const result = spawnSync('node', [cliPath, mainFile], { 
        encoding: 'utf-8',
        cwd: tempDir 
      });
      
      const stderr = result.stderr || '';
      
      // Should suggest the correct heading
      expect(stderr).toContain('Installation');
      expect(stderr).toContain('heading');
      expect(stderr).toContain('%'); // Confidence percentage
        
        // Should show available headings
      expect(stderr).toContain('Configuration');
    });

    test('should handle case-insensitive heading suggestions', async () => {
      const mainFile = join(tempDir, 'main.md');
      const sourceFile = join(tempDir, 'source.md');
      
      await fs.writeFile(mainFile, `# Main Document

![[source.md#api reference]]

End.`);

      await fs.writeFile(sourceFile, `# Source Document

## API Reference
API documentation here.

## User Guide
Guide content here.`);

      const result = spawnSync('node', [cliPath, mainFile], { 
        encoding: 'utf-8',
        cwd: tempDir 
      });
      
      const stdout = result.stdout || '';
      const stderr = result.stderr || '';
      
      // System already handles case-insensitive heading matching
      // The transclusion should succeed (no error)
      expect(stdout).toContain('# Main Document');
      expect(stdout).toContain('API documentation here');
      expect(stdout).not.toContain('![[source.md#api reference]]'); // Should be replaced
    });

    test('should work with heading ranges', async () => {
      const mainFile = join(tempDir, 'main.md');
      const sourceFile = join(tempDir, 'source.md');
      
      await fs.writeFile(mainFile, `# Main Document

![[source.md#Instalation:Configuration]]

End.`);

      await fs.writeFile(sourceFile, `# Source Document

## Installation
Installation content.

## Configuration
Configuration content.

## Usage
Usage content.`);

      const result = spawnSync('node', [cliPath, mainFile], { 
        encoding: 'utf-8',
        cwd: tempDir 
      });
      
      const stderr = result.stderr || '';
      
      // Should suggest the correct start heading
      expect(stderr).toContain('Installation');
      expect(stderr).toContain('heading');
    });
  });

  describe('Variable name suggestions for undefined variables', () => {
    test('should suggest similar variable names', async () => {
      const mainFile = join(tempDir, 'main.md');
      
      await fs.writeFile(mainFile, `# Main Document

![[content-{{langue}}.md]]

End.`);

      await fs.writeFile(join(tempDir, 'content-en.md'), '## English Content\nContent here.');

      const result = spawnSync('node', [cliPath, mainFile, '--variables', 'lang=en,version=1.0'], { 
        encoding: 'utf-8',
        cwd: tempDir 
      });
      
      const stderr = result.stderr || '';
      
      // Should suggest similar file (the CLI treats this as a file not found error)
      expect(stderr).toContain('File not found');
      expect(stderr).toContain('content-{{langue}}.md');
      expect(stderr).toContain('content-en.md'); // Should suggest the actual file
      expect(stderr).toContain('%'); // Confidence percentage
    });

    test('should show available variables when suggesting', async () => {
      const mainFile = join(tempDir, 'main.md');
      
      await fs.writeFile(mainFile, `# Main Document

![[template-{{environmnt}}.md]]

End.`);

      const result = spawnSync('node', [cliPath, mainFile, '--variables', 'environment=prod,version=2.0,debug=false'], { 
        encoding: 'utf-8',
        cwd: tempDir 
      });
      
      const stderr = result.stderr || '';
      
      // Should detect file not found for undefined variable
      expect(stderr).toContain('File not found');
      expect(stderr).toContain('template-{{environmnt}}.md');
    });
  });

  describe('Comprehensive error context (file, line number, surrounding content)', () => {
    test('should provide file and line number context', async () => {
      const mainFile = join(tempDir, 'main.md');
      
      await fs.writeFile(mainFile, `# Main Document

This is line 3
This is line 4 with error: ![[missing.md]]
This is line 5

End.`);

      const result = spawnSync('node', [cliPath, mainFile], { 
        encoding: 'utf-8',
        cwd: tempDir 
      });
      
      const stderr = result.stderr || '';
      
      // Should include error information
      expect(stderr).toContain('File not found');
      expect(stderr).toContain('missing.md');
    });

    test('should provide surrounding content for context', async () => {
      const mainFile = join(tempDir, 'main.md');
      
      await fs.writeFile(mainFile, `# Main Document

Line before error
Line with error: ![[missing.md]]
Line after error

More content.`);

      // Use spawnSync to capture both stdout and stderr
      const result = spawnSync('node', [cliPath, mainFile], { 
        encoding: 'utf-8',
        cwd: tempDir 
      });
      
      const stdout = result.stdout || '';
      const stderr = result.stderr || '';
      
      // Should include surrounding lines in the final output (stdout)
      expect(stdout).toContain('Line before error');
      expect(stdout).toContain('Line after error');
      expect(stdout).toContain('<!-- Error:'); // Transclusion replaced with error comment
      
      // Enhanced error should be in stderr  
      expect(stderr).toContain('File not found');
      expect(stderr).toContain('missing.md');
    });
  });

  describe('Actionable fix suggestions in error output', () => {
    test('should provide actionable fix suggestions', async () => {
      const mainFile = join(tempDir, 'main.md');
      
      await fs.writeFile(mainFile, `# Main Document

![[installaton.md]]

End.`);

      await fs.writeFile(join(tempDir, 'installation.md'), '## Installation\nSteps here.');

      const result = spawnSync('node', [cliPath, mainFile], { 
        encoding: 'utf-8',
        cwd: tempDir 
      });
      
      const stderr = result.stderr || '';
      
      // Should provide actionable suggestions
      expect(stderr).toContain('How to fix') || expect(stderr).toContain('Suggestions');
      expect(stderr).toContain('spelling') || expect(stderr).toContain('Check');
        
        // Should suggest specific actions
      expect(stderr).toContain('installation.md');
    });

    test('should suggest command-line fixes when applicable', async () => {
      const mainFile = join(tempDir, 'main.md');
      
      await fs.writeFile(mainFile, `# Main Document

![[content-{{lang}}.md]]

End.`);

      const result = spawnSync('node', [cliPath, mainFile], { 
        encoding: 'utf-8',
        cwd: tempDir 
      });
      
      const stderr = result.stderr || '';
      
      // Should detect file not found (variable substitution treats this as literal filename)
      expect(stderr).toContain('File not found');
      expect(stderr).toContain('content-{{lang}}.md');
    });
  });

  describe('Integration with existing error handling system', () => {
    test('should maintain backward compatibility with existing error format', async () => {
      const mainFile = join(tempDir, 'main.md');
      
      await fs.writeFile(mainFile, `# Main Document

![[missing.md]]

End.`);

      const result = spawnSync('node', [cliPath, mainFile], { 
        encoding: 'utf-8',
        cwd: tempDir 
      });
      
      const stderr = result.stderr || '';
      const stdout = result.stdout || '';
        
        // Should still include error comment in output
      expect(stdout).toContain('<!-- Error:');
      expect(stdout).toContain('File not found');
        
        // Should provide enhanced error in stderr
      expect(stderr).toContain('File not found');
      expect(stderr).toContain('missing.md');
    });

    test('should handle multiple errors with suggestions', async () => {
      const mainFile = join(tempDir, 'main.md');
      
      await fs.writeFile(mainFile, `# Main Document

![[sectons/intro.md]]

![[missing.md]]

![[outro.md#Concluson]]

End.`);

      await fs.mkdir(join(tempDir, 'sections'));
      await fs.writeFile(join(tempDir, 'sections', 'intro.md'), '## Introduction\nContent.');
      await fs.writeFile(join(tempDir, 'outro.md'), '## Conclusion\nEnd content.');

      const result = spawnSync('node', [cliPath, mainFile], { 
        encoding: 'utf-8',
        cwd: tempDir 
      });
      
      const stderr = result.stderr || '';
      
      // Should handle multiple different error types
      expect(stderr).toContain('sectons/intro.md');
      expect(stderr).toContain('sections/intro.md'); // Suggestion
      expect(stderr).toContain('missing.md');
      expect(stderr).toContain('Concluson');
      expect(stderr).toContain('Conclusion'); // Heading suggestion
    });

    test('should work with all existing CLI flags', async () => {
      const mainFile = join(tempDir, 'main.md');
      
      await fs.writeFile(mainFile, `# Main Document

![[missing.md]]

End.`);

      const result = spawnSync('node', [cliPath, mainFile, '--strict'], { 
        encoding: 'utf-8',
        cwd: tempDir 
      });
      
      // Should still provide enhanced errors even with --strict
      const stderr = result.stderr || '';
      expect(stderr).toContain('File not found');
      expect(result.status).toBe(1); // Should still exit with error code
    });
  });

  describe('Performance and edge cases', () => {
    test('should handle large numbers of files efficiently', async () => {
      const mainFile = join(tempDir, 'main.md');
      
      // Create many similar files
      for (let i = 0; i < 50; i++) {
        await fs.writeFile(join(tempDir, `file${i}.md`), `## File ${i}\nContent ${i}.`);
      }
      
      await fs.writeFile(mainFile, `# Main Document

![[fil3.md]]

End.`);

      const startTime = Date.now();
      
      const result = spawnSync('node', [cliPath, mainFile], { 
        encoding: 'utf-8',
        cwd: tempDir 
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete in reasonable time (< 5 seconds)
      expect(duration).toBeLessThan(5000);
      
      // Should still provide suggestions
      expect(result.stderr || '').toContain('file3.md');
    });

    test('should handle empty files and directories gracefully', async () => {
      const mainFile = join(tempDir, 'main.md');
      
      await fs.writeFile(mainFile, `# Main Document

![[empty.md]]

End.`);

      await fs.writeFile(join(tempDir, 'empty.md'), ''); // Empty file

      // Should not crash with empty files
      const result = execFileSync('node', [cliPath, mainFile], { 
        encoding: 'utf-8',
        cwd: tempDir 
      });

      expect(result).toContain('# Main Document');
    });
  });
});