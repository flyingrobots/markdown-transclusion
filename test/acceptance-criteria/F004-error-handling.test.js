const { promises: fs } = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');
const { execFileSync } = require('child_process');

describe('F004 - Error Handling & Debugging', () => {
  let tempDir;
  let cliPath;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), 'f004-test-'));
    cliPath = join(process.cwd(), 'dist', 'cli.js');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('clear error messages for missing files', async () => {
    const mainFile = join(tempDir, 'main.md');
    await fs.writeFile(mainFile, `# Document\n\n![[missing-file.md]]\n\n![[another-missing.md]]\n\nEnd.`);

    // Run transclusion (should continue processing despite errors)
    const result = execFileSync('node', [cliPath, mainFile], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify clear error comments are inserted
    expect(result).toContain('# Document');
    expect(result).toContain('<!-- Error: File not found: missing-file.md -->');
    expect(result).toContain('<!-- Error: File not found: another-missing.md -->');
    expect(result).toContain('End.');
    
    // Verify original transclusion syntax is replaced
    expect(result).not.toContain('![[missing-file.md]]');
    expect(result).not.toContain('![[another-missing.md]]');
  });

  test('circular reference detection with path trace', async () => {
    // Create circular reference: A -> B -> C -> A
    const fileA = join(tempDir, 'fileA.md');
    const fileB = join(tempDir, 'fileB.md');
    const fileC = join(tempDir, 'fileC.md');

    await fs.writeFile(fileA, `# File A\n\n![[fileB.md]]\n\nEnd A.`);
    await fs.writeFile(fileB, `# File B\n\n![[fileC.md]]\n\nEnd B.`);
    await fs.writeFile(fileC, `# File C\n\n![[fileA.md]]\n\nEnd C.`);

    // Run transclusion
    const result = execFileSync('node', [cliPath, fileA], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify circular reference is detected with path trace
    expect(result).toContain('# File A');
    expect(result).toContain('# File B');
    expect(result).toContain('# File C');
    expect(result).toContain('Circular reference detected');
    expect(result).toContain('fileA.md');
    expect(result).toContain('fileB.md');
    expect(result).toContain('fileC.md');
  });

  test('optional verbose logging for debugging', async () => {
    const mainFile = join(tempDir, 'main.md');
    const includeFile = join(tempDir, 'include.md');

    await fs.writeFile(mainFile, `# Main\n\n![[include.md]]\n\n![[missing.md]]\n\nEnd.`);
    await fs.writeFile(includeFile, `Included content.`);

    // Run with debug logging
    const result = execFileSync('node', [cliPath, mainFile, '--log-level', 'DEBUG'], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Main content should be in stdout
    expect(result).toContain('# Main');
    expect(result).toContain('Included content.');
    expect(result).toContain('End.');
  });

  test('graceful degradation continues processing on errors', async () => {
    const mainFile = join(tempDir, 'main.md');
    const validFile = join(tempDir, 'valid.md');

    await fs.writeFile(mainFile, `# Document

![[valid.md]]

![[missing1.md]]

Some content between errors.

![[missing2.md]]

![[valid.md]]

Final content.`);
    await fs.writeFile(validFile, `Valid included content.`);

    // Run transclusion
    const result = execFileSync('node', [cliPath, mainFile], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify processing continues despite multiple errors
    expect(result).toContain('# Document');
    expect(result).toContain('Valid included content.'); // Should appear twice
    expect(result).toContain('Some content between errors.');
    expect(result).toContain('Final content.');
    
    // Verify errors are handled gracefully
    expect(result).toContain('<!-- Error: File not found: missing1.md -->');
    expect(result).toContain('<!-- Error: File not found: missing2.md -->');
    
    // Count occurrences of valid content (should be included twice)
    const validContentOccurrences = (result.match(/Valid included content\./g) || []).length;
    expect(validContentOccurrences).toBe(2);
  });

  test('strict mode fails fast on errors', async () => {
    const mainFile = join(tempDir, 'main.md');
    await fs.writeFile(mainFile, `# Document\n\n![[missing.md]]\n\nEnd.`);

    // Run with strict mode (should exit with error code)
    try {
      execFileSync('node', [cliPath, mainFile, '--strict'], { 
        encoding: 'utf-8',
        cwd: tempDir 
      });
      // Should not reach here - strict mode should exit with error
      fail('Expected strict mode to exit with error');
    } catch (error) {
      // Verify it exits with error code
      expect(error.status).toBe(1);
    }
  });

  test('error accumulation with multiple error types', async () => {
    // Create scenario with multiple types of errors
    const mainFile = join(tempDir, 'main.md');
    const circularA = join(tempDir, 'circularA.md');
    const circularB = join(tempDir, 'circularB.md');

    await fs.writeFile(mainFile, `# Document

![[missing.md]]

![[circularA.md]]

![[another-missing.md]]

End.`);
    await fs.writeFile(circularA, `# Circular A\n\n![[circularB.md]]`);
    await fs.writeFile(circularB, `# Circular B\n\n![[circularA.md]]`);

    // Run transclusion
    const result = execFileSync('node', [cliPath, mainFile], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify multiple error types are handled
    expect(result).toContain('# Document');
    expect(result).toContain('File not found: missing.md');
    expect(result).toContain('File not found: another-missing.md');
    expect(result).toContain('Circular reference detected');
    expect(result).toContain('# Circular A');
    expect(result).toContain('# Circular B');
    expect(result).toContain('End.');
  });

  test('error recovery in nested transclusions', async () => {
    // Create nested structure with errors at different levels
    const mainFile = join(tempDir, 'main.md');
    const chapterFile = join(tempDir, 'chapter.md');
    const validSection = join(tempDir, 'valid-section.md');

    await fs.writeFile(mainFile, `# Book

![[missing-intro.md]]

![[chapter.md]]

![[missing-conclusion.md]]

End of book.`);

    await fs.writeFile(chapterFile, `## Chapter

![[missing-section.md]]

Chapter content.

![[valid-section.md]]

End of chapter.`);

    await fs.writeFile(validSection, `### Valid Section

This section exists.`);

    // Run transclusion
    const result = execFileSync('node', [cliPath, mainFile], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify error recovery at all levels
    expect(result).toContain('# Book');
    expect(result).toContain('## Chapter');
    expect(result).toContain('### Valid Section');
    expect(result).toContain('This section exists.');
    expect(result).toContain('Chapter content.');
    expect(result).toContain('End of chapter.');
    expect(result).toContain('End of book.');
    
    // Verify errors are reported at correct levels
    expect(result).toContain('File not found: missing-intro.md');
    expect(result).toContain('File not found: missing-section.md');
    expect(result).toContain('File not found: missing-conclusion.md');
  });
});