const { promises: fs } = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');
const { execFileSync } = require('child_process');

describe('F002 - Recursive Transclusion', () => {
  let tempDir;
  let cliPath;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), 'f002-test-'));
    cliPath = join(process.cwd(), 'dist', 'cli.js');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('recursively processes transclusions in embedded content', async () => {
    // Create nested transclusion chain: main -> chapter1 -> section1
    const mainFile = join(tempDir, 'main.md');
    const chapter1File = join(tempDir, 'chapter1.md');
    const section1File = join(tempDir, 'section1.md');

    await fs.writeFile(mainFile, `# Book\n\n![[chapter1.md]]\n\nEnd of book.`);
    await fs.writeFile(chapter1File, `## Chapter 1\n\n![[section1.md]]\n\nEnd of chapter.`);
    await fs.writeFile(section1File, `### Section 1\n\nDetailed content here.`);

    // Run transclusion
    const result = execFileSync('node', [cliPath, mainFile], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify all levels are included
    expect(result).toContain('# Book');
    expect(result).toContain('## Chapter 1');
    expect(result).toContain('### Section 1');
    expect(result).toContain('Detailed content here.');
    expect(result).toContain('End of chapter.');
    expect(result).toContain('End of book.');
    
    // Verify transclusion syntax is replaced
    expect(result).not.toContain('![[chapter1.md]]');
    expect(result).not.toContain('![[section1.md]]');
  });

  test('detects and prevents circular references', async () => {
    // Create circular reference: fileA -> fileB -> fileA
    const fileA = join(tempDir, 'fileA.md');
    const fileB = join(tempDir, 'fileB.md');

    await fs.writeFile(fileA, `# File A\n\n![[fileB.md]]\n\nEnd A.`);
    await fs.writeFile(fileB, `# File B\n\n![[fileA.md]]\n\nEnd B.`);

    // Run transclusion (should not fail, but produce error)
    const result = execFileSync('node', [cliPath, fileA], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify circular reference is detected
    expect(result).toContain('# File A');
    expect(result).toContain('# File B');
    expect(result).toContain('Circular reference detected');
    expect(result).toContain('fileA.md');
    expect(result).toContain('fileB.md');
  });

  test('maintains proper error reporting through recursion chain', async () => {
    // Create chain: main -> chapter -> missing-section
    const mainFile = join(tempDir, 'main.md');
    const chapterFile = join(tempDir, 'chapter.md');

    await fs.writeFile(mainFile, `# Main\n\n![[chapter.md]]\n\nEnd.`);
    await fs.writeFile(chapterFile, `## Chapter\n\n![[missing-section.md]]\n\nChapter end.`);

    // Run transclusion
    const result = execFileSync('node', [cliPath, mainFile], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify error is reported correctly
    expect(result).toContain('# Main');
    expect(result).toContain('## Chapter');
    expect(result).toContain('<!-- Error: File not found: missing-section.md -->');
    expect(result).toContain('Chapter end.');
    expect(result).toContain('End.');
  });

  test('respects maximum recursion depth', async () => {
    // Create deep nesting beyond default limit
    const files = [];
    for (let i = 0; i < 15; i++) {
      const fileName = `level${i}.md`;
      const filePath = join(tempDir, fileName);
      files.push({ name: fileName, path: filePath });
      
      if (i < 14) {
        await fs.writeFile(filePath, `# Level ${i}\n\n![[level${i + 1}.md]]\n\nContent ${i}.`);
      } else {
        await fs.writeFile(filePath, `# Final Level\n\nFinal content.`);
      }
    }

    // Run transclusion with default max depth (should limit recursion)
    const result = execFileSync('node', [cliPath, files[0].path], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Should contain some levels but not all due to depth limit
    expect(result).toContain('# Level 0');
    expect(result).toContain('Content 0');
    
    // Should contain max depth exceeded error
    expect(result).toContain('Maximum transclusion depth (10) exceeded');
  });

  test('processes multiple recursive transclusions in same file', async () => {
    const mainFile = join(tempDir, 'main.md');
    const partA = join(tempDir, 'partA.md');
    const partB = join(tempDir, 'partB.md');
    const sectionA1 = join(tempDir, 'sectionA1.md');
    const sectionB1 = join(tempDir, 'sectionB1.md');

    await fs.writeFile(mainFile, `# Document\n\n![[partA.md]]\n\n![[partB.md]]\n\nEnd.`);
    await fs.writeFile(partA, `## Part A\n\n![[sectionA1.md]]\n\nPart A end.`);
    await fs.writeFile(partB, `## Part B\n\n![[sectionB1.md]]\n\nPart B end.`);
    await fs.writeFile(sectionA1, `### Section A1\n\nA1 content.`);
    await fs.writeFile(sectionB1, `### Section B1\n\nB1 content.`);

    // Run transclusion
    const result = execFileSync('node', [cliPath, mainFile], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify all parts are included
    expect(result).toContain('# Document');
    expect(result).toContain('## Part A');
    expect(result).toContain('## Part B');
    expect(result).toContain('### Section A1');
    expect(result).toContain('### Section B1');
    expect(result).toContain('A1 content.');
    expect(result).toContain('B1 content.');
    expect(result).toContain('Part A end.');
    expect(result).toContain('Part B end.');
    expect(result).toContain('End.');
  });
});