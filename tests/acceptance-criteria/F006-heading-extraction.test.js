const { promises: fs } = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');
const { execFileSync } = require('child_process');

describe('F006 - Heading-Specific Transclusion', () => {
  let tempDir;
  let cliPath;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), 'f006-test-'));
    cliPath = join(process.cwd(), 'dist', 'cli.js');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('support ![[file#heading]] syntax', async () => {
    const mainFile = join(tempDir, 'main.md');
    const sourceFile = join(tempDir, 'source.md');

    await fs.writeFile(mainFile, `# Main Document\n\n![[source.md#Installation]]\n\nEnd.`);
    await fs.writeFile(sourceFile, `# Source Document

## Overview
This is the overview section.

## Installation
Run npm install to get started.

### Prerequisites
You need Node.js installed.

## Usage
This is how you use it.`);

    // Run transclusion
    const result = execFileSync('node', [cliPath, mainFile], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify only Installation section is included
    expect(result).toContain('# Main Document');
    expect(result).toContain('## Installation');
    expect(result).toContain('Run npm install to get started.');
    expect(result).toContain('### Prerequisites');
    expect(result).toContain('You need Node.js installed.');
    expect(result).toContain('End.');
    
    // Verify other sections are NOT included
    expect(result).not.toContain('## Overview');
    expect(result).not.toContain('This is the overview section.');
    expect(result).not.toContain('## Usage');
    expect(result).not.toContain('This is how you use it.');
    expect(result).not.toContain('![[source.md#Installation]]');
  });

  test('match headings case-insensitively', async () => {
    const mainFile = join(tempDir, 'main.md');
    const sourceFile = join(tempDir, 'source.md');

    await fs.writeFile(mainFile, `# Main\n\n![[source.md#api reference]]\n\nEnd.`);
    await fs.writeFile(sourceFile, `# Source

## API Reference
This is the API documentation.

### Authentication
Login details here.

## Other Section
Other content.`);

    // Run transclusion (lowercase reference should match mixed case heading)
    const result = execFileSync('node', [cliPath, mainFile], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify case-insensitive matching works
    expect(result).toContain('# Main');
    expect(result).toContain('## API Reference');
    expect(result).toContain('This is the API documentation.');
    expect(result).toContain('### Authentication');
    expect(result).toContain('Login details here.');
    expect(result).not.toContain('## Other Section');
    expect(result).not.toContain('![[source.md#api reference]]');
  });

  test('extract content from heading until next heading of same or higher level', async () => {
    const mainFile = join(tempDir, 'main.md');
    const sourceFile = join(tempDir, 'source.md');

    await fs.writeFile(mainFile, `# Main\n\n![[source.md#Section B]]\n\nEnd.`);
    await fs.writeFile(sourceFile, `# Document

## Section A
Content A here.

## Section B
Content B here.

### Subsection B1
Subsection content.

#### Deep subsection
Very deep content.

### Subsection B2
More subsection content.

## Section C
Content C here.

# Top Level Section
Should not be included.`);

    // Run transclusion
    const result = execFileSync('node', [cliPath, mainFile], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify Section B and all its subsections are included
    expect(result).toContain('# Main');
    expect(result).toContain('## Section B');
    expect(result).toContain('Content B here.');
    expect(result).toContain('### Subsection B1');
    expect(result).toContain('Subsection content.');
    expect(result).toContain('#### Deep subsection');
    expect(result).toContain('Very deep content.');
    expect(result).toContain('### Subsection B2');
    expect(result).toContain('More subsection content.');
    
    // Verify content after same-level heading is NOT included
    expect(result).not.toContain('## Section A');
    expect(result).not.toContain('Content A here.');
    expect(result).not.toContain('## Section C');
    expect(result).not.toContain('Content C here.');
    expect(result).not.toContain('# Top Level Section');
    expect(result).not.toContain('Should not be included.');
  });

  test('handle headings with special characters and spaces', async () => {
    const mainFile = join(tempDir, 'main.md');
    const sourceFile = join(tempDir, 'source.md');

    await fs.writeFile(mainFile, `# Main\n\n![[source.md#API & Configuration Settings]]\n\nEnd.`);
    await fs.writeFile(sourceFile, `# Source

## Getting Started
Basic info here.

## API & Configuration Settings
Configuration details with special characters.

### Default Settings (Advanced)
Advanced configuration options.

## Troubleshooting FAQ's
FAQ content.`);

    // Run transclusion
    const result = execFileSync('node', [cliPath, mainFile], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify heading with special characters is matched
    expect(result).toContain('# Main');
    expect(result).toContain('## API & Configuration Settings');
    expect(result).toContain('Configuration details with special characters.');
    expect(result).toContain('### Default Settings (Advanced)');
    expect(result).toContain('Advanced configuration options.');
    
    // Verify other sections are excluded
    expect(result).not.toContain('## Getting Started');
    expect(result).not.toContain('Basic info here.');
    expect(result).not.toContain('## Troubleshooting FAQ\'s');
    expect(result).not.toContain('FAQ content.');
  });

  test('error gracefully when heading not found', async () => {
    const mainFile = join(tempDir, 'main.md');
    const sourceFile = join(tempDir, 'source.md');

    await fs.writeFile(mainFile, `# Main\n\n![[source.md#NonExistent Heading]]\n\nEnd.`);
    await fs.writeFile(sourceFile, `# Source

## Real Heading
This heading exists.

## Another Heading
This one also exists.`);

    // Run transclusion
    const result = execFileSync('node', [cliPath, mainFile], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify graceful error handling
    expect(result).toContain('# Main');
    expect(result).toContain('<!-- Error: Heading "NonExistent Heading" not found in');
    expect(result).toContain('End.');
    expect(result).not.toContain('![[source.md#NonExistent Heading]]');
  });

  test('support all heading levels (h1-h6)', async () => {
    const mainFile = join(tempDir, 'main.md');
    const sourceFile = join(tempDir, 'source.md');

    await fs.writeFile(mainFile, `# Main

![[source.md#Level 2 Heading]]

![[source.md#Level 4 Heading]]

End.`);

    await fs.writeFile(sourceFile, `# Level 1 Heading
Level 1 content.

## Level 2 Heading
Level 2 content.

### Level 3 Heading
Level 3 content.

#### Level 4 Heading
Level 4 content.

##### Level 5 Heading
Level 5 content.

###### Level 6 Heading
Level 6 content.

#### Another Level 4
This should not be in Level 4 extraction.`);

    // Run transclusion
    const result = execFileSync('node', [cliPath, mainFile], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify different heading levels work
    expect(result).toContain('# Main');
    
    // Level 2 heading and its subsections
    expect(result).toContain('## Level 2 Heading');
    expect(result).toContain('Level 2 content.');
    expect(result).toContain('### Level 3 Heading');
    expect(result).toContain('Level 3 content.');
    
    // Level 4 heading and its subsections
    expect(result).toContain('#### Level 4 Heading');
    expect(result).toContain('Level 4 content.');
    expect(result).toContain('##### Level 5 Heading');
    expect(result).toContain('Level 5 content.');
    expect(result).toContain('###### Level 6 Heading');
    expect(result).toContain('Level 6 content.');
    
    // Should not include content from sibling headings
    expect(result).not.toContain('# Level 1 Heading');
    expect(result).not.toContain('Level 1 content.');
    // Note: "#### Another Level 4" IS included as it's a subsection of "## Level 2 Heading"
    expect(result).toContain('#### Another Level 4');
    expect(result).toContain('This should not be in Level 4 extraction.');
  });

  test('multiple heading extractions from same file', async () => {
    const mainFile = join(tempDir, 'main.md');
    const sourceFile = join(tempDir, 'source.md');

    await fs.writeFile(mainFile, `# Documentation

## Introduction
![[source.md#Overview]]

## Setup
![[source.md#Installation]]

End.`);

    await fs.writeFile(sourceFile, `# Source Document

## Overview
This project helps with documentation.

## Installation
Run these commands to install.

## Usage
How to use the tool.

## Contributing
How to contribute.`);

    // Run transclusion
    const result = execFileSync('node', [cliPath, mainFile], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify multiple extractions from same file
    expect(result).toContain('# Documentation');
    expect(result).toContain('## Introduction');
    expect(result).toContain('## Overview');
    expect(result).toContain('This project helps with documentation.');
    expect(result).toContain('## Setup');
    expect(result).toContain('## Installation');
    expect(result).toContain('Run these commands to install.');
    
    // Verify unused sections are not included
    expect(result).not.toContain('## Usage');
    expect(result).not.toContain('How to use the tool.');
    expect(result).not.toContain('## Contributing');
    expect(result).not.toContain('How to contribute.');
  });

  test('heading extraction with recursive transclusions', async () => {
    const mainFile = join(tempDir, 'main.md');
    const chapterFile = join(tempDir, 'chapter.md');
    const detailsFile = join(tempDir, 'details.md');

    await fs.writeFile(mainFile, `# Book\n\n![[chapter.md#Introduction]]\n\nEnd.`);
    await fs.writeFile(chapterFile, `# Chapter

## Introduction
This is the intro.

![[details.md#Technical Details]]

End of intro.

## Conclusion
This is the conclusion.`);

    await fs.writeFile(detailsFile, `# Details

## Technical Details
Technical information here.

### Advanced Topics
Advanced content.

## Other Details
Other information.`);

    // Run transclusion
    const result = execFileSync('node', [cliPath, mainFile], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify nested heading extraction works
    expect(result).toContain('# Book');
    expect(result).toContain('## Introduction');
    expect(result).toContain('This is the intro.');
    expect(result).toContain('## Technical Details');
    expect(result).toContain('Technical information here.');
    expect(result).toContain('### Advanced Topics');
    expect(result).toContain('Advanced content.');
    expect(result).toContain('End of intro.');
    
    // Verify excluded content
    expect(result).not.toContain('## Conclusion');
    expect(result).not.toContain('This is the conclusion.');
    expect(result).not.toContain('## Other Details');
    expect(result).not.toContain('Other information.');
  });
});