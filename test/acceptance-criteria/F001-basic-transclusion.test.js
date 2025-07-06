const { promises: fs } = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');
const { execFileSync } = require('child_process');

describe('F001 - Basic Transclusion Resolution', () => {
  let tempDir;
  let cliPath;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), 'f001-test-'));
    cliPath = join(process.cwd(), 'dist', 'cli.js');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('resolves ![[filename]] to file contents', async () => {
    // Create test files
    const mainFile = join(tempDir, 'main.md');
    const includeFile = join(tempDir, 'content.md');

    await fs.writeFile(mainFile, `# Main Document\n\n![[content.md]]\n\nEnd of main.`);
    await fs.writeFile(includeFile, `This is included content.\n\nWith multiple lines.`);

    // Run transclusion
    const result = execFileSync('node', [cliPath, mainFile], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify content is included
    expect(result).toContain('# Main Document');
    expect(result).toContain('This is included content.');
    expect(result).toContain('With multiple lines.');
    expect(result).toContain('End of main.');
    expect(result).not.toContain('![[content.md]]');
  });

  test('supports relative paths from base directory', async () => {
    // Create nested directory structure
    const sectionsDir = join(tempDir, 'sections');
    await fs.mkdir(sectionsDir);

    const mainFile = join(tempDir, 'main.md');
    const sectionFile = join(sectionsDir, 'intro.md');

    await fs.writeFile(mainFile, `# Documentation\n\n![[sections/intro.md]]\n\nEnd.`);
    await fs.writeFile(sectionFile, `## Introduction\n\nWelcome to the docs.`);

    // Run transclusion
    const result = execFileSync('node', [cliPath, mainFile], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify nested file is included
    expect(result).toContain('# Documentation');
    expect(result).toContain('## Introduction');
    expect(result).toContain('Welcome to the docs.');
    expect(result).not.toContain('![[sections/intro.md]]');
  });

  test('handles missing files gracefully with error comments', async () => {
    const mainFile = join(tempDir, 'main.md');

    await fs.writeFile(mainFile, `# Document\n\n![[missing-file.md]]\n\nContinues here.`);

    // Run transclusion (should not fail)
    const result = execFileSync('node', [cliPath, mainFile], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify error comment is inserted
    expect(result).toContain('# Document');
    expect(result).toContain('<!-- Error: File not found: missing-file.md -->');
    expect(result).toContain('Continues here.');
    expect(result).not.toContain('![[missing-file.md]]');
  });

  test('preserves original line structure for non-transclusion content', async () => {
    const mainFile = join(tempDir, 'main.md');

    await fs.writeFile(mainFile, `# Title

First paragraph.

Second paragraph with **bold** text.

- List item 1
- List item 2

Final paragraph.`);

    // Run transclusion (no transclusions, just pass-through)
    const result = execFileSync('node', [cliPath, mainFile], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify exact content preservation
    expect(result).toContain('# Title');
    expect(result).toContain('First paragraph.');
    expect(result).toContain('Second paragraph with **bold** text.');
    expect(result).toContain('- List item 1');
    expect(result).toContain('- List item 2');
    expect(result).toContain('Final paragraph.');
  });

  test('file extension inference for .md files', async () => {
    const mainFile = join(tempDir, 'main.md');
    const includeFile = join(tempDir, 'content.md');

    await fs.writeFile(mainFile, `# Main\n\n![[content]]\n\nEnd.`);
    await fs.writeFile(includeFile, `Included without .md extension.`);

    // Run transclusion
    const result = execFileSync('node', [cliPath, mainFile], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify .md extension is inferred
    expect(result).toContain('Included without .md extension.');
    expect(result).not.toContain('![[content]]');
  });
});