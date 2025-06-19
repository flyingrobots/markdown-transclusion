const { promises: fs } = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');
const { execFileSync } = require('child_process');

describe('F019 - Dry Run Mode', () => {
  let tempDir;
  let cliPath;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), 'f019-test-'));
    cliPath = join(process.cwd(), 'dist', 'cli.js');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('support --dry-run CLI flag that prevents file output', async () => {
    const mainFile = join(tempDir, 'main.md');
    const includeFile = join(tempDir, 'include.md');
    const outputFile = join(tempDir, 'output.md');

    await fs.writeFile(mainFile, `# Main Document\n\n![[include.md]]\n\nEnd.`);
    await fs.writeFile(includeFile, `Included content.`);

    // Run with --dry-run and --output flags
    const result = execFileSync('node', [cliPath, mainFile, '--dry-run', '--output', outputFile], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify dry run header is shown
    expect(result).toContain('🔍 DRY RUN MODE - No files will be modified');

    // Verify output file was NOT created despite --output flag
    const outputExists = await fs.access(outputFile).then(() => true).catch(() => false);
    expect(outputExists).toBe(false);

    // Verify only original files exist
    const files = await fs.readdir(tempDir);
    expect(files.sort()).toEqual(['include.md', 'main.md']);
  });

  test('display processed content to stdout for preview', async () => {
    const mainFile = join(tempDir, 'main.md');
    const includeFile = join(tempDir, 'include.md');

    await fs.writeFile(mainFile, `# Main Document

Introduction paragraph.

![[include.md]]

Conclusion paragraph.`);

    await fs.writeFile(includeFile, `## Included Section

This is the included content with **formatting**.

- List item 1
- List item 2`);

    // Run dry run
    const result = execFileSync('node', [cliPath, mainFile, '--dry-run'], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify processed content is displayed
    expect(result).toContain('=== PROCESSED CONTENT ===');
    expect(result).toContain('# Main Document');
    expect(result).toContain('Introduction paragraph.');
    expect(result).toContain('## Included Section');
    expect(result).toContain('This is the included content with **formatting**.');
    expect(result).toContain('- List item 1');
    expect(result).toContain('- List item 2');
    expect(result).toContain('Conclusion paragraph.');
    
    // Verify transclusion syntax is replaced
    expect(result).not.toContain('![[include.md]]');
  });

  test('show detailed information about transclusion operations performed', async () => {
    const mainFile = join(tempDir, 'main.md');
    const file1 = join(tempDir, 'section1.md');
    const file2 = join(tempDir, 'section2.md');

    await fs.writeFile(mainFile, `# Document\n\n![[section1.md]]\n\n![[section2.md]]\n\nEnd.`);
    await fs.writeFile(file1, `## Section 1\nContent 1.`);
    await fs.writeFile(file2, `## Section 2\nContent 2.`);

    // Run dry run
    const result = execFileSync('node', [cliPath, mainFile, '--dry-run'], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify detailed operation information
    expect(result).toContain(`Processing: ${mainFile}`);
    expect(result).toContain('├── Reading:');
    expect(result).toContain('section1.md');
    expect(result).toContain('section2.md');
    
    // Verify summary section
    expect(result).toContain('=== SUMMARY ===');
    expect(result).toContain('📄 Files processed: 3'); // main + 2 includes
    expect(result).toContain('🔗 Transclusions resolved: 2');
    expect(result).toContain('❌ Errors: 0');
  });

  test('report all files that would be read during processing', async () => {
    // Create nested transclusion structure
    const mainFile = join(tempDir, 'main.md');
    const chapterFile = join(tempDir, 'chapter.md');
    const sectionFile = join(tempDir, 'section.md');

    await fs.writeFile(mainFile, `# Book\n\n![[chapter.md]]\n\nEnd.`);
    await fs.writeFile(chapterFile, `## Chapter\n\n![[section.md]]\n\nChapter end.`);
    await fs.writeFile(sectionFile, `### Section\nSection content.`);

    // Run dry run
    const result = execFileSync('node', [cliPath, mainFile, '--dry-run'], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify all files are reported
    expect(result).toContain(`Processing: ${mainFile}`);
    expect(result).toContain('├── Reading:');
    expect(result).toContain('chapter.md');
    expect(result).toContain('section.md');
    expect(result).toContain('📄 Files processed: 3');
  });

  test('validate all transclusion references without processing content', async () => {
    const mainFile = join(tempDir, 'main.md');
    const validFile = join(tempDir, 'valid.md');

    await fs.writeFile(mainFile, `# Document

![[valid.md]]

![[missing1.md]]

![[missing2.md]]

End.`);

    await fs.writeFile(validFile, `Valid content.`);

    // Run dry run (should validate all references)
    const result = execFileSync('node', [cliPath, mainFile, '--dry-run'], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify validation occurs
    expect(result).toContain('🔍 DRY RUN MODE - No files will be modified');
    expect(result).toContain('├── Reading:');
    expect(result).toContain('valid.md');
    expect(result).toContain('Valid content.');
    
    // Verify errors are reported in summary
    expect(result).toContain('❌ Errors: 2');
    expect(result).toContain('⚠️  Dry run completed with errors');
    expect(result).toContain('Fix issues before actual processing');
    
    // Verify error comments in processed content
    expect(result).toContain('<!-- Error: File not found: missing1.md -->');
    expect(result).toContain('<!-- Error: File not found: missing2.md -->');
  });

  test('generate summary statistics about the processing operation', async () => {
    const mainFile = join(tempDir, 'main.md');
    const validFile = join(tempDir, 'valid.md');

    await fs.writeFile(mainFile, `# Document

![[valid.md]]

![[valid.md]]

![[missing.md]]

End.`);

    await fs.writeFile(validFile, `Valid content.`);

    // Run dry run
    const result = execFileSync('node', [cliPath, mainFile, '--dry-run'], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify comprehensive statistics
    expect(result).toContain('=== SUMMARY ===');
    expect(result).toContain('📄 Files processed: 2'); // main + valid (counted once)
    expect(result).toContain('🔗 Transclusions resolved: 1'); // valid file processed once
    expect(result).toContain('⚠️  Warnings: 0');
    expect(result).toContain('❌ Errors: 1'); // missing.md
    
    // Verify status message
    expect(result).toContain('⚠️  Dry run completed with errors');
  });

  test('compatible with all existing flags and options', async () => {
    const mainFile = join(tempDir, 'main.md');
    const contentFile = join(tempDir, 'content-en.md');

    await fs.writeFile(mainFile, `---
title: Test
---

# Document

![[content-{{lang}}.md]]

End.`);

    await fs.writeFile(contentFile, `---
type: content
---

## Content
English content here.`);

    // Run dry run with multiple flags
    const result = execFileSync('node', [
      cliPath, mainFile, 
      '--dry-run', 
      '--variables', 'lang=en',
      '--strip-frontmatter',
      '--base-path', tempDir
    ], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify all options work together
    expect(result).toContain('🔍 DRY RUN MODE - No files will be modified');
    expect(result).toContain('# Document'); // Frontmatter stripped
    expect(result).toContain('## Content'); // Variable substitution worked
    expect(result).toContain('English content here.'); // Content included
    
    // Verify frontmatter was stripped in dry run
    expect(result).not.toContain('title: Test');
    expect(result).not.toContain('type: content');
    expect(result).not.toContain('---');
  });

  test('provide clear indication that no files were modified', async () => {
    const mainFile = join(tempDir, 'main.md');
    const includeFile = join(tempDir, 'include.md');

    await fs.writeFile(mainFile, `# Main\n\n![[include.md]]\n\nEnd.`);
    await fs.writeFile(includeFile, `Included content.`);

    // Run dry run
    const result = execFileSync('node', [cliPath, mainFile, '--dry-run'], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify clear messaging
    expect(result).toContain('🔍 DRY RUN MODE - No files will be modified');
    expect(result).toContain('✓ Dry run completed successfully');
    expect(result).toContain('Ready for actual processing with: markdown-transclusion');
    
    // Verify no files were modified (check timestamps don't change)
    const statsBefore = await fs.stat(mainFile);
    const statsIncludeBefore = await fs.stat(includeFile);
    
    // Wait a moment and run again
    await new Promise(resolve => setTimeout(resolve, 10));
    
    execFileSync('node', [cliPath, mainFile, '--dry-run'], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });
    
    const statsAfter = await fs.stat(mainFile);
    const statsIncludeAfter = await fs.stat(includeFile);
    
    // Verify file modification times haven't changed
    expect(statsAfter.mtime.getTime()).toBe(statsBefore.mtime.getTime());
    expect(statsIncludeAfter.mtime.getTime()).toBe(statsIncludeBefore.mtime.getTime());
  });

  test('dry run with heading extraction shows complete processing', async () => {
    const mainFile = join(tempDir, 'main.md');
    const sourceFile = join(tempDir, 'source.md');

    await fs.writeFile(mainFile, `# Main\n\n![[source.md#Section B]]\n\nEnd.`);
    await fs.writeFile(sourceFile, `# Source

## Section A
Content A.

## Section B
Content B.

### Subsection B1
Subsection content.

## Section C
Content C.`);

    // Run dry run
    const result = execFileSync('node', [cliPath, mainFile, '--dry-run'], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify heading extraction works in dry run
    expect(result).toContain('# Main');
    expect(result).toContain('## Section B');
    expect(result).toContain('Content B.');
    expect(result).toContain('### Subsection B1');
    expect(result).toContain('Subsection content.');
    
    // Verify other sections are excluded
    expect(result).not.toContain('## Section A');
    expect(result).not.toContain('Content A.');
    expect(result).not.toContain('## Section C');
    expect(result).not.toContain('Content C.');
    
    // Verify processing info
    expect(result).toContain('├── Reading:');
    expect(result).toContain('source.md');
    expect(result).toContain('✓ Dry run completed successfully');
  });
});