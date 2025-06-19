const { promises: fs } = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');
const { execFileSync } = require('child_process');

describe('F003 - Path Resolution', () => {
  let tempDir;
  let cliPath;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), 'f003-test-'));
    cliPath = join(process.cwd(), 'dist', 'cli.js');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('supports relative paths: ![[../shared/header]]', async () => {
    // Create directory structure within the base: docs/chapter1/intro.md, docs/shared/header.md
    const docsDir = join(tempDir, 'docs');
    const chapter1Dir = join(docsDir, 'chapter1');
    const sharedDir = join(docsDir, 'shared');
    
    await fs.mkdir(docsDir);
    await fs.mkdir(chapter1Dir);
    await fs.mkdir(sharedDir);

    const introFile = join(chapter1Dir, 'intro.md');
    const headerFile = join(sharedDir, 'header.md');

    await fs.writeFile(introFile, `# Chapter 1 Introduction\n\n![[../shared/header.md]]\n\nChapter content.`);
    await fs.writeFile(headerFile, `## Shared Header\n\nThis is shared across chapters.`);

    // Run transclusion with docs as base path (allows relative navigation within docs)
    const result = execFileSync('node', [cliPath, introFile, '--base-path', docsDir], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify relative path resolution works
    expect(result).toContain('# Chapter 1 Introduction');
    expect(result).toContain('## Shared Header');
    expect(result).toContain('This is shared across chapters.');
    expect(result).toContain('Chapter content.');
    expect(result).not.toContain('![[../shared/header.md]]');
  });

  test('supports nested paths: ![[sections/intro/overview]]', async () => {
    // Create nested directory structure
    const sectionsDir = join(tempDir, 'sections');
    const introDir = join(sectionsDir, 'intro');
    await fs.mkdir(sectionsDir);
    await fs.mkdir(introDir);

    const mainFile = join(tempDir, 'main.md');
    const overviewFile = join(introDir, 'overview.md');

    await fs.writeFile(mainFile, `# Main Document\n\n![[sections/intro/overview.md]]\n\nEnd.`);
    await fs.writeFile(overviewFile, `## Overview\n\nDetailed overview content.`);

    // Run transclusion
    const result = execFileSync('node', [cliPath, mainFile], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify nested path resolution
    expect(result).toContain('# Main Document');
    expect(result).toContain('## Overview');
    expect(result).toContain('Detailed overview content.');
    expect(result).not.toContain('![[sections/intro/overview.md]]');
  });

  test('configurable base path for resolution', async () => {
    // Create content in subdirectory
    const contentDir = join(tempDir, 'content');
    await fs.mkdir(contentDir);

    const mainFile = join(tempDir, 'main.md');
    const includeFile = join(contentDir, 'include.md');

    await fs.writeFile(mainFile, `# Main\n\n![[include.md]]\n\nEnd.`);
    await fs.writeFile(includeFile, `Included from content directory.`);

    // Run transclusion with custom base path
    const result = execFileSync('node', [cliPath, mainFile, '--base-path', contentDir], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify base path configuration works
    expect(result).toContain('# Main');
    expect(result).toContain('Included from content directory.');
    expect(result).not.toContain('![[include.md]]');
  });

  test('file extension inference (.md assumed if not specified)', async () => {
    const mainFile = join(tempDir, 'main.md');
    const includeFile = join(tempDir, 'content.md');
    const markdownFile = join(tempDir, 'document.markdown');

    await fs.writeFile(mainFile, `# Main\n\n![[content]]\n\n![[document]]\n\nEnd.`);
    await fs.writeFile(includeFile, `Content from .md file.`);
    await fs.writeFile(markdownFile, `Content from .markdown file.`);

    // Run transclusion (should try .md first, then .markdown)
    const result = execFileSync('node', [cliPath, mainFile], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify extension inference works
    expect(result).toContain('# Main');
    expect(result).toContain('Content from .md file.');
    expect(result).toContain('Content from .markdown file.');
    expect(result).not.toContain('![[content]]');
    expect(result).not.toContain('![[document]]');
  });

  test('custom file extensions configuration', async () => {
    const mainFile = join(tempDir, 'main.md');
    const textFile = join(tempDir, 'content.txt');

    await fs.writeFile(mainFile, `# Main\n\n![[content]]\n\nEnd.`);
    await fs.writeFile(textFile, `Content from .txt file.`);

    // Run transclusion with custom extensions
    const result = execFileSync('node', [cliPath, mainFile, '--extensions', 'txt,md'], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify custom extensions work
    expect(result).toContain('# Main');
    expect(result).toContain('Content from .txt file.');
    expect(result).not.toContain('![[content]]');
  });

  test('path traversal protection prevents access outside base directory', async () => {
    // Create file outside base directory
    const outsideFile = join(tmpdir(), 'outside.md');
    await fs.writeFile(outsideFile, 'This should not be accessible.');

    const mainFile = join(tempDir, 'main.md');
    const relativePath = '../'.repeat(10) + 'outside.md';
    await fs.writeFile(mainFile, `# Main\n\n![[${relativePath}]]\n\nEnd.`);

    // Run transclusion (should fail securely)
    const result = execFileSync('node', [cliPath, mainFile], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify path traversal is blocked
    expect(result).toContain('# Main');
    expect(result).toContain('Error:');
    expect(result).not.toContain('This should not be accessible.');

    // Cleanup
    await fs.unlink(outsideFile).catch(() => {}); // Ignore if already deleted
  });

  test('paths resolved relative to parent file in nested transclusions', async () => {
    // Create structure: main.md, chapters/ch1.md, chapters/sections/sec1.md
    const chaptersDir = join(tempDir, 'chapters');
    const sectionsDir = join(chaptersDir, 'sections');
    await fs.mkdir(chaptersDir);
    await fs.mkdir(sectionsDir);

    const mainFile = join(tempDir, 'main.md');
    const chapterFile = join(chaptersDir, 'ch1.md');
    const sectionFile = join(sectionsDir, 'sec1.md');

    await fs.writeFile(mainFile, `# Book\n\n![[chapters/ch1.md]]\n\nEnd.`);
    await fs.writeFile(chapterFile, `## Chapter 1\n\n![[sections/sec1.md]]\n\nChapter end.`);
    await fs.writeFile(sectionFile, `### Section 1\n\nSection content.`);

    // Run transclusion
    const result = execFileSync('node', [cliPath, mainFile], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify nested path resolution relative to parent files
    expect(result).toContain('# Book');
    expect(result).toContain('## Chapter 1');
    expect(result).toContain('### Section 1');
    expect(result).toContain('Section content.');
    expect(result).toContain('Chapter end.');
    expect(result).toContain('End.');
  });
});