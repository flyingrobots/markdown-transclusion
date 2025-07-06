const { promises: fs } = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');
const { execFileSync } = require('child_process');

describe.skip('F014 - Frontmatter Stripping', () => {
  let tempDir;
  let cliPath;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), 'f014-test-'));
    cliPath = join(process.cwd(), 'dist', 'cli.js');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('detects YAML frontmatter (delimited by ---)', async () => {
    const mainFile = join(tempDir, 'main.md');
    const includeFile = join(tempDir, 'include.md');

    await fs.writeFile(mainFile, `---
title: Main Document
author: Test Author
---

# Main Content

![[include.md]]

End of main.`);

    await fs.writeFile(includeFile, `---
title: Included File
description: Test file
tags: [test, include]
---

## Included Section

This is included content.`);

    // Run with frontmatter stripping enabled
    const result = execFileSync('node', [cliPath, mainFile, '--strip-frontmatter'], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify frontmatter is stripped from both files
    expect(result).toContain('# Main Content');
    expect(result).toContain('## Included Section');
    expect(result).toContain('This is included content.');
    expect(result).toContain('End of main.');
    
    // Verify frontmatter is completely removed
    expect(result).not.toContain('title: Main Document');
    expect(result).not.toContain('author: Test Author');
    expect(result).not.toContain('title: Included File');
    expect(result).not.toContain('description: Test file');
    expect(result).not.toContain('tags: [test, include]');
    expect(result).not.toContain('---');
  });

  test('detects TOML frontmatter (delimited by +++)', async () => {
    const mainFile = join(tempDir, 'main.md');
    const includeFile = join(tempDir, 'include.md');

    await fs.writeFile(mainFile, `+++
title = "Main Document"
author = "Test Author"
date = "2024-01-01"
+++

# Main Content

![[include.md]]

End.`);

    await fs.writeFile(includeFile, `+++
title = "Included File"
weight = 10
draft = false
+++

## Included Section

Content here.`);

    // Run with frontmatter stripping enabled
    const result = execFileSync('node', [cliPath, mainFile, '--strip-frontmatter'], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify TOML frontmatter is stripped
    expect(result).toContain('# Main Content');
    expect(result).toContain('## Included Section');
    expect(result).toContain('Content here.');
    expect(result).toContain('End.');
    
    // Verify TOML frontmatter is removed
    expect(result).not.toContain('title = "Main Document"');
    expect(result).not.toContain('author = "Test Author"');
    expect(result).not.toContain('title = "Included File"');
    expect(result).not.toContain('weight = 10');
    expect(result).not.toContain('+++');
  });

  test('strips frontmatter from transcluded files when stripFrontmatter option is enabled', async () => {
    const mainFile = join(tempDir, 'main.md');
    const file1 = join(tempDir, 'file1.md');
    const file2 = join(tempDir, 'file2.md');

    await fs.writeFile(mainFile, `# Main Document

![[file1.md]]

![[file2.md]]

End.`);

    await fs.writeFile(file1, `---
type: section
order: 1
---

## First Section
Content from first file.`);

    await fs.writeFile(file2, `---
type: section
order: 2
---

## Second Section
Content from second file.`);

    // Run with frontmatter stripping
    const result = execFileSync('node', [cliPath, mainFile, '--strip-frontmatter'], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify content is included but frontmatter is stripped
    expect(result).toContain('# Main Document');
    expect(result).toContain('## First Section');
    expect(result).toContain('Content from first file.');
    expect(result).toContain('## Second Section');
    expect(result).toContain('Content from second file.');
    
    // Verify frontmatter is removed from transcluded files
    expect(result).not.toContain('type: section');
    expect(result).not.toContain('order: 1');
    expect(result).not.toContain('order: 2');
    expect(result).not.toContain('---');
  });

  test('strips frontmatter from the outer document when stripFrontmatter option is enabled', async () => {
    const mainFile = join(tempDir, 'main.md');

    await fs.writeFile(mainFile, `---
title: "My Document"
layout: default
permalink: /docs/
---

# Document Title

This is the main content without any transclusions.

## Section

More content here.`);

    // Run with frontmatter stripping
    const result = execFileSync('node', [cliPath, mainFile, '--strip-frontmatter'], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify frontmatter is stripped from main document
    expect(result).toContain('# Document Title');
    expect(result).toContain('This is the main content without any transclusions.');
    expect(result).toContain('## Section');
    expect(result).toContain('More content here.');
    
    // Verify frontmatter is removed
    expect(result).not.toContain('title: "My Document"');
    expect(result).not.toContain('layout: default');
    expect(result).not.toContain('permalink: /docs/');
    expect(result).not.toContain('---');
  });

  test('preserves content integrity after frontmatter removal', async () => {
    const mainFile = join(tempDir, 'main.md');
    const includeFile = join(tempDir, 'include.md');

    await fs.writeFile(mainFile, `---
title: Test
---

# Main Document

First paragraph.

![[include.md]]

Last paragraph.`);

    await fs.writeFile(includeFile, `---
metadata: value
---

## Included Content

- List item 1
- List item 2

\`\`\`javascript
console.log('code block');
\`\`\`

**Bold text** and *italic text*.`);

    // Run with frontmatter stripping
    const result = execFileSync('node', [cliPath, mainFile, '--strip-frontmatter'], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify content structure is preserved
    expect(result).toContain('# Main Document');
    expect(result).toContain('First paragraph.');
    expect(result).toContain('## Included Content');
    expect(result).toContain('- List item 1');
    expect(result).toContain('- List item 2');
    expect(result).toContain('console.log(\'code block\');');
    expect(result).toContain('**Bold text** and *italic text*.');
    expect(result).toContain('Last paragraph.');
    
    // Verify frontmatter is removed
    expect(result).not.toContain('title: Test');
    expect(result).not.toContain('metadata: value');
  });

  test('CLI flag --strip-frontmatter enables this behavior', async () => {
    const mainFile = join(tempDir, 'main.md');

    await fs.writeFile(mainFile, `---
title: Test Document
---

# Content

This is the content.`);

    // Run WITHOUT frontmatter stripping (default behavior)
    const resultDefault = execFileSync('node', [cliPath, mainFile], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify frontmatter is preserved by default
    expect(resultDefault).toContain('---');
    expect(resultDefault).toContain('title: Test Document');
    expect(resultDefault).toContain('# Content');

    // Run WITH frontmatter stripping flag
    const resultStripped = execFileSync('node', [cliPath, mainFile, '--strip-frontmatter'], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify frontmatter is stripped with flag
    expect(resultStripped).toContain('# Content');
    expect(resultStripped).not.toContain('---');
    expect(resultStripped).not.toContain('title: Test Document');
  });

  test('handles edge cases: empty frontmatter, malformed frontmatter, missing closing delimiters', async () => {
    const mainFile = join(tempDir, 'main.md');
    const emptyFm = join(tempDir, 'empty.md');
    const malformedFm = join(tempDir, 'malformed.md');
    const missingClose = join(tempDir, 'missing-close.md');

    await fs.writeFile(mainFile, `# Main

![[empty.md]]

![[malformed.md]]

![[missing-close.md]]

End.`);

    // Empty frontmatter
    await fs.writeFile(emptyFm, `---
---

## Empty Frontmatter
Content with empty frontmatter.`);

    // Malformed frontmatter (should be left intact)
    await fs.writeFile(malformedFm, `---
malformed yaml: [unclosed
---

## Malformed
Content with malformed frontmatter.`);

    // Missing closing delimiter (should be left intact)
    await fs.writeFile(missingClose, `---
title: Missing Close

## Missing Close
Content with missing close delimiter.`);

    // Run with frontmatter stripping
    const result = execFileSync('node', [cliPath, mainFile, '--strip-frontmatter'], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify edge cases are handled correctly
    expect(result).toContain('# Main');
    expect(result).toContain('## Empty Frontmatter');
    expect(result).toContain('Content with empty frontmatter.');
    expect(result).toContain('## Malformed');
    expect(result).toContain('Content with malformed frontmatter.');
    expect(result).toContain('## Missing Close');
    expect(result).toContain('Content with missing close delimiter.');
    
    // Empty frontmatter should be stripped
    // Malformed YAML content within valid frontmatter delimiters should be stripped
    expect(result).not.toContain('malformed yaml: [unclosed');
    // Missing closing delimiter means it's not valid frontmatter, so it should be preserved
    expect(result).toContain('title: Missing Close');
  });

  test('mixed YAML and TOML frontmatter in different files', async () => {
    const mainFile = join(tempDir, 'main.md');
    const yamlFile = join(tempDir, 'yaml.md');
    const tomlFile = join(tempDir, 'toml.md');

    await fs.writeFile(mainFile, `+++
title = "Main with TOML"
+++

# Main Document

![[yaml.md]]

![[toml.md]]

End.`);

    await fs.writeFile(yamlFile, `---
title: YAML File
type: section
---

## YAML Section
Content from YAML file.`);

    await fs.writeFile(tomlFile, `+++
title = "TOML File"
weight = 5
+++

## TOML Section
Content from TOML file.`);

    // Run with frontmatter stripping
    const result = execFileSync('node', [cliPath, mainFile, '--strip-frontmatter'], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify both YAML and TOML frontmatter are stripped
    expect(result).toContain('# Main Document');
    expect(result).toContain('## YAML Section');
    expect(result).toContain('Content from YAML file.');
    expect(result).toContain('## TOML Section');
    expect(result).toContain('Content from TOML file.');
    
    // Verify all frontmatter is removed
    expect(result).not.toContain('title = "Main with TOML"');
    expect(result).not.toContain('title: YAML File');
    expect(result).not.toContain('title = "TOML File"');
    expect(result).not.toContain('type: section');
    expect(result).not.toContain('weight = 5');
    expect(result).not.toContain('---');
    expect(result).not.toContain('+++');
  });
});