import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { runCli } from '../../src/cliCore';
import { Readable } from 'stream';

describe.skip('Dry Run Integration Tests', () => {
  let tempDir: string;
  let mockStdin: Readable;
  let mockStdout: any; // NodeJS.WriteStream is complex, using any for test
  let mockStderr: any; // NodeJS.WriteStream is complex, using any for test
  let mockExit: jest.Mock;
  let stdoutData: string[];
  let stderrData: string[];

  beforeEach(async () => {
    // Create temp directory for test files
    tempDir = await fs.mkdtemp(join(tmpdir(), 'markdown-transclusion-test-'));
    
    stdoutData = [];
    stderrData = [];

    mockStdin = new Readable({
      read() {}
    });

    // Create minimal WriteStream mocks
    mockStdout = {
      write: jest.fn((chunk: any, encoding?: any, callback?: any) => {
        stdoutData.push(chunk.toString());
        if (typeof encoding === 'function') {
          encoding();
          return true;
        }
        if (callback) callback();
        return true;
      })
    };
    
    mockStderr = {
      write: jest.fn((chunk: any, encoding?: any, callback?: any) => {
        stderrData.push(chunk.toString());
        if (typeof encoding === 'function') {
          encoding();
          return true;
        }
        if (callback) callback();
        return true;
      })
    };

    mockExit = jest.fn();
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should perform dry run with actual files', async () => {
    // Create test files
    const mainFile = join(tempDir, 'main.md');
    const includeFile = join(tempDir, 'include.md');

    await fs.writeFile(mainFile, `# Main Document
    
This is the main content.

![[include.md]]

End of main document.`);

    await fs.writeFile(includeFile, `## Included Section

This content is included from another file.

- List item 1
- List item 2`);

    await runCli({
      argv: ['node', 'cli.js', mainFile, '--dry-run', '--base-path', tempDir],
      stdin: mockStdin,
      stdout: mockStdout,
      stderr: mockStderr,
      exit: mockExit
    });

    const output = stdoutData.join('');
    
    // Check dry run header
    expect(output).toContain('🔍 DRY RUN MODE - No files will be modified');
    expect(output).toContain(`Processing: ${mainFile}`);
    expect(output).toContain(`├── Reading: ${includeFile}`);
    
    // Check processed content is displayed
    expect(output).toContain('=== PROCESSED CONTENT ===');
    expect(output).toContain('# Main Document');
    expect(output).toContain('## Included Section');
    expect(output).toContain('This content is included from another file.');
    expect(output).toContain('- List item 1');
    
    // Check summary
    expect(output).toContain('=== SUMMARY ===');
    expect(output).toContain('📄 Files processed: 2');
    expect(output).toContain('🔗 Transclusions resolved: 1');
    expect(output).toContain('❌ Errors: 0');
    expect(output).toContain('✓ Dry run completed successfully');
    
    // Verify no actual output file was created
    const files = await fs.readdir(tempDir);
    expect(files.sort()).toEqual(['include.md', 'main.md']); // Only original files
  });

  it('should handle dry run with missing file errors', async () => {
    const mainFile = join(tempDir, 'main.md');

    await fs.writeFile(mainFile, `# Main Document

![[missing-file.md]]

![[another-missing.md]]

End of document.`);

    await runCli({
      argv: ['node', 'cli.js', mainFile, '--dry-run', '--base-path', tempDir],
      stdin: mockStdin,
      stdout: mockStdout,
      stderr: mockStderr,
      exit: mockExit
    });

    const output = stdoutData.join('');
    const errorOutput = stderrData.join('');
    
    // Check dry run still shows header
    expect(output).toContain('🔍 DRY RUN MODE - No files will be modified');
    
    // Check error summary
    expect(output).toContain('❌ Errors: 2');
    expect(output).toContain('⚠️  Dry run completed with errors');
    expect(output).toContain('Fix issues before actual processing');
    
    // Check error comments are in processed content
    expect(output).toContain('<!-- Error: File not found: missing-file.md -->');
    expect(output).toContain('<!-- Error: File not found: another-missing.md -->');
    
    // Check warnings are logged to stderr
    expect(errorOutput).toContain('File not found: missing-file.md');
    expect(errorOutput).toContain('File not found: another-missing.md');
  });

  it('should handle dry run with heading extraction', async () => {
    const mainFile = join(tempDir, 'main.md');
    const includeFile = join(tempDir, 'sections.md');

    await fs.writeFile(mainFile, `# Documentation

![[sections.md#Getting Started]]

![[sections.md#Advanced Usage]]`);

    await fs.writeFile(includeFile, `# Sections File

## Getting Started

This is the getting started section.

### Prerequisites
- Node.js
- npm

## Advanced Usage

This is the advanced usage section.

### Configuration
- Set environment variables
- Configure settings

## Not Included

This section won't be included.`);

    await runCli({
      argv: ['node', 'cli.js', mainFile, '--dry-run', '--base-path', tempDir],
      stdin: mockStdin,
      stdout: mockStdout,
      stderr: mockStderr,
      exit: mockExit
    });

    const output = stdoutData.join('');
    
    // Check that specific headings are extracted
    expect(output).toContain('## Getting Started');
    expect(output).toContain('This is the getting started section.');
    expect(output).toContain('### Prerequisites');
    expect(output).toContain('## Advanced Usage');
    expect(output).toContain('This is the advanced usage section.');
    expect(output).toContain('### Configuration');
    
    // Check that excluded section is not included
    expect(output).not.toContain('## Not Included');
    expect(output).not.toContain("This section won't be included.");
    
    // Check statistics - 1 unique file was processed for transclusion
    expect(output).toContain('🔗 Transclusions resolved: 1');
  });

  it('should handle dry run with variables', async () => {
    const mainFile = join(tempDir, 'template.md');
    const enFile = join(tempDir, 'content-en.md');
    const esFile = join(tempDir, 'content-es.md');

    await fs.writeFile(mainFile, `# Documentation

![[content-{{lang}}.md]]

End of template.`);

    await fs.writeFile(enFile, `This is English content.`);
    await fs.writeFile(esFile, `Este es contenido en español.`);

    // Test with English
    await runCli({
      argv: ['node', 'cli.js', mainFile, '--dry-run', '--base-path', tempDir, '--variables', 'lang=en'],
      stdin: mockStdin,
      stdout: mockStdout,
      stderr: mockStderr,
      exit: mockExit
    });

    const output = stdoutData.join('');
    expect(output).toContain('This is English content.');
    expect(output).not.toContain('Este es contenido en español.');
  });

  it('should preserve exact transclusion count statistics', async () => {
    const mainFile = join(tempDir, 'main.md');
    const file1 = join(tempDir, 'file1.md');
    const file2 = join(tempDir, 'file2.md');
    const file3 = join(tempDir, 'file3.md');

    await fs.writeFile(mainFile, `# Main

![[file1.md]]
![[file2.md]]
![[file3.md]]`);

    await fs.writeFile(file1, 'Content 1');
    await fs.writeFile(file2, 'Content 2');
    await fs.writeFile(file3, 'Content 3');

    await runCli({
      argv: ['node', 'cli.js', mainFile, '--dry-run', '--base-path', tempDir],
      stdin: mockStdin,
      stdout: mockStdout,
      stderr: mockStderr,
      exit: mockExit
    });

    const output = stdoutData.join('');
    expect(output).toContain('📄 Files processed: 4'); // main + 3 includes
    expect(output).toContain('🔗 Transclusions resolved: 3');
    expect(output).toContain(`├── Reading: ${file1}`);
    expect(output).toContain(`├── Reading: ${file2}`);
    expect(output).toContain(`├── Reading: ${file3}`);
  });

  it('should not create any output files in dry run mode', async () => {
    const mainFile = join(tempDir, 'main.md');
    const includeFile = join(tempDir, 'include.md');
    const outputFile = join(tempDir, 'output.md');

    await fs.writeFile(mainFile, `![[include.md]]`);
    await fs.writeFile(includeFile, 'Included content');

    await runCli({
      argv: ['node', 'cli.js', mainFile, '--dry-run', '--base-path', tempDir, '--output', outputFile],
      stdin: mockStdin,
      stdout: mockStdout,
      stderr: mockStderr,
      exit: mockExit
    });

    // Verify output file was not created
    const outputExists = await fs.access(outputFile).then(() => true).catch(() => false);
    expect(outputExists).toBe(false);

    // But should show the correct command in dry run output
    const output = stdoutData.join('');
    expect(output).toContain(`Ready for actual processing with: markdown-transclusion ${mainFile} --output ${outputFile}`);
  });
});