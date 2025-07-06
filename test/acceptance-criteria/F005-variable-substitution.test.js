const { promises: fs } = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');
const { execFileSync } = require('child_process');

describe('F005 - Variable Substitution', () => {
  let tempDir;
  let cliPath;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), 'f005-test-'));
    cliPath = join(process.cwd(), 'dist', 'cli.js');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('supports {{variable}} syntax in transclusion paths', async () => {
    const mainFile = join(tempDir, 'main.md');
    const enFile = join(tempDir, 'content-en.md');
    const esFile = join(tempDir, 'content-es.md');

    await fs.writeFile(mainFile, `# Document\n\n![[content-{{lang}}.md]]\n\nEnd.`);
    await fs.writeFile(enFile, `English content here.`);
    await fs.writeFile(esFile, `Contenido en español aquí.`);

    // Test English
    const enResult = execFileSync('node', [cliPath, mainFile, '--variables', 'lang=en'], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    expect(enResult).toContain('# Document');
    expect(enResult).toContain('English content here.');
    expect(enResult).not.toContain('Contenido en español');
    expect(enResult).not.toContain('![[content-{{lang}}.md]]');

    // Test Spanish
    const esResult = execFileSync('node', [cliPath, mainFile, '--variables', 'lang=es'], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    expect(esResult).toContain('# Document');
    expect(esResult).toContain('Contenido en español aquí.');
    expect(esResult).not.toContain('English content here.');
    expect(esResult).not.toContain('![[content-{{lang}}.md]]');
  });

  test('variables resolved before file lookup', async () => {
    const mainFile = join(tempDir, 'template.md');
    const resolvedFile = join(tempDir, 'docs-v2-production.md');

    await fs.writeFile(mainFile, `# Template\n\n![[docs-{{version}}-{{env}}.md]]\n\nEnd.`);
    await fs.writeFile(resolvedFile, `Production v2 documentation.`);

    // Run with multiple variables
    const result = execFileSync('node', [cliPath, mainFile, '--variables', 'version=v2,env=production'], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify variables are resolved and file is found
    expect(result).toContain('# Template');
    expect(result).toContain('Production v2 documentation.');
    expect(result).not.toContain('{{version}}');
    expect(result).not.toContain('{{env}}');
    expect(result).not.toContain('![[docs-{{version}}-{{env}}.md]]');
  });

  test('multiple variables can be used in single reference', async () => {
    const mainFile = join(tempDir, 'main.md');
    const file1 = join(tempDir, 'section-intro-en-v1.md');
    const file2 = join(tempDir, 'section-advanced-es-v2.md');

    await fs.writeFile(mainFile, `# Multi-Variable Test

![[section-{{type}}-{{lang}}-{{version}}.md]]

![[section-{{type2}}-{{lang2}}-{{version2}}.md]]

End.`);

    await fs.writeFile(file1, `Introduction content in English v1.`);
    await fs.writeFile(file2, `Contenido avanzado en español v2.`);

    // Test first set of variables
    const result1 = execFileSync('node', [cliPath, mainFile, '--variables', 'type=intro,lang=en,version=v1,type2=advanced,lang2=es,version2=v2'], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    expect(result1).toContain('# Multi-Variable Test');
    expect(result1).toContain('Introduction content in English v1.');
    expect(result1).toContain('Contenido avanzado en español v2.');
    expect(result1).not.toContain('{{type}}');
    expect(result1).not.toContain('{{lang}}');
    expect(result1).not.toContain('{{version}}');
  });

  test('undefined variables left as-is in default mode', async () => {
    const mainFile = join(tempDir, 'main.md');

    await fs.writeFile(mainFile, `# Document\n\n![[content-{{undefined_var}}.md]]\n\nEnd.`);

    // Run without providing the variable
    const result = execFileSync('node', [cliPath, mainFile], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify undefined variable causes file not found (graceful degradation)
    expect(result).toContain('# Document');
    expect(result).toContain('File not found: content-{{undefined_var}}.md');
    expect(result).toContain('End.');
  });

  test('undefined variables cause error in strict mode', async () => {
    const mainFile = join(tempDir, 'main.md');

    await fs.writeFile(mainFile, `# Document\n\n![[content-{{undefined_var}}.md]]\n\nEnd.`);

    // Run in strict mode without providing the variable
    try {
      execFileSync('node', [cliPath, mainFile, '--strict'], { 
        encoding: 'utf-8',
        cwd: tempDir 
      });
      fail('Expected strict mode to exit with error for undefined variable');
    } catch (error) {
      expect(error.status).toBe(1);
    }
  });

  test('complex multilingual documentation workflow', async () => {
    // Create multilingual content structure
    const mainFile = join(tempDir, 'guide.md');
    const headerEn = join(tempDir, 'header-en.md');
    const headerEs = join(tempDir, 'header-es.md');
    const contentEn = join(tempDir, 'getting-started-en.md');
    const contentEs = join(tempDir, 'getting-started-es.md');
    const footerEn = join(tempDir, 'footer-en.md');
    const footerEs = join(tempDir, 'footer-es.md');

    await fs.writeFile(mainFile, `![[header-{{lang}}.md]]

![[getting-started-{{lang}}.md]]

![[footer-{{lang}}.md]]`);

    await fs.writeFile(headerEn, `# User Guide`);
    await fs.writeFile(headerEs, `# Guía del Usuario`);
    await fs.writeFile(contentEn, `## Getting Started\n\nWelcome to our application.`);
    await fs.writeFile(contentEs, `## Comenzando\n\nBienvenido a nuestra aplicación.`);
    await fs.writeFile(footerEn, `---\n© 2024 Company Name`);
    await fs.writeFile(footerEs, `---\n© 2024 Nombre de la Empresa`);

    // Generate English version
    const enResult = execFileSync('node', [cliPath, mainFile, '--variables', 'lang=en'], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    expect(enResult).toContain('# User Guide');
    expect(enResult).toContain('## Getting Started');
    expect(enResult).toContain('Welcome to our application.');
    expect(enResult).toContain('© 2024 Company Name');
    expect(enResult).not.toContain('{{lang}}');

    // Generate Spanish version
    const esResult = execFileSync('node', [cliPath, mainFile, '--variables', 'lang=es'], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    expect(esResult).toContain('# Guía del Usuario');
    expect(esResult).toContain('## Comenzando');
    expect(esResult).toContain('Bienvenido a nuestra aplicación.');
    expect(esResult).toContain('© 2024 Nombre de la Empresa');
    expect(esResult).not.toContain('{{lang}}');
  });

  test('variable substitution in nested transclusions', async () => {
    const mainFile = join(tempDir, 'main.md');
    const chapterFile = join(tempDir, 'chapter-{{env}}.md');
    const sectionFile = join(tempDir, 'section-{{env}}.md');

    // Resolve template file names for writing
    const chapterProd = join(tempDir, 'chapter-prod.md');
    const sectionProd = join(tempDir, 'section-prod.md');

    await fs.writeFile(mainFile, `# Main\n\n![[chapter-{{env}}.md]]\n\nEnd.`);
    await fs.writeFile(chapterProd, `## Chapter\n\n![[section-{{env}}.md]]\n\nChapter end.`);
    await fs.writeFile(sectionProd, `### Section\n\nProduction content.`);

    // Run with environment variable
    const result = execFileSync('node', [cliPath, mainFile, '--variables', 'env=prod'], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    // Verify variables are resolved in nested transclusions
    expect(result).toContain('# Main');
    expect(result).toContain('## Chapter');
    expect(result).toContain('### Section');
    expect(result).toContain('Production content.');
    expect(result).toContain('Chapter end.');
    expect(result).toContain('End.');
    expect(result).not.toContain('{{env}}');
  });

  test('special characters in variable values', async () => {
    const mainFile = join(tempDir, 'main.md');
    const contentFile = join(tempDir, 'content-special-chars.md');

    await fs.writeFile(mainFile, `# Document\n\n![[content-{{name}}.md]]\n\nEnd.`);
    await fs.writeFile(contentFile, `Content with special filename.`);

    // Use variable with special characters (that are valid in filenames)
    const result = execFileSync('node', [cliPath, mainFile, '--variables', 'name=special-chars'], { 
      encoding: 'utf-8',
      cwd: tempDir 
    });

    expect(result).toContain('# Document');
    expect(result).toContain('Content with special filename.');
    expect(result).not.toContain('{{name}}');
  });
});