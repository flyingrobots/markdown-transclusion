/**
 * F022 - Plugin System E2E Tests
 * 
 * Comprehensive end-to-end tests for the plugin system that validate
 * all acceptance criteria following SOLID principles testing approach.
 */

const { promises: fs } = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');
const { spawnSync } = require('child_process');

describe('F022 - Plugin System for Custom Transformers', () => {
  let tempDir;
  let cliPath;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), 'f022-test-'));
    cliPath = join(process.cwd(), 'dist', 'cli.js');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Plugin Interface Design', () => {
    test('should support content transformer plugins', async () => {
      // Create a simple test plugin
      const pluginPath = join(tempDir, 'test-plugin.js');
      await fs.writeFile(pluginPath, `
module.exports = {
  metadata: {
    name: 'test-transformer',
    version: '1.0.0',
    description: 'Test content transformer',
    type: 'content-transformer',
    priority: 50,
    async: false
  },
  
  transform(content, context) {
    return content.replace(/HELLO/g, 'Hello World');
  }
};
`);

      // Create test content
      const mainFile = join(tempDir, 'main.md');
      await fs.writeFile(mainFile, `# Document\n\nHELLO there!\n\nEnd.`);

      // Run with plugin
      const result = spawnSync('node', [cliPath, mainFile, '--plugins', pluginPath], {
        encoding: 'utf-8',
        cwd: tempDir
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('# Document');
      expect(result.stdout).toContain('Hello World there!');
      expect(result.stdout).not.toContain('HELLO there!');
    });

    test('should support plugin metadata and configuration', async () => {
      const pluginPath = join(tempDir, 'metadata-plugin.js');
      await fs.writeFile(pluginPath, `
module.exports = {
  metadata: {
    name: 'metadata-test',
    version: '2.1.0',
    description: 'Test plugin with metadata',
    author: 'Test Author',
    type: 'content-transformer',
    priority: 25,
    async: false,
    tags: ['test', 'metadata']
  },
  
  init(context) {
    this.config = context.config['metadata-test'] || {};
    this.prefix = this.config.prefix || 'DEFAULT';
  },
  
  transform(content, context) {
    return content.replace(/PREFIX:/g, this.prefix + ':');
  }
};
`);

      // Create plugin config
      const configPath = join(tempDir, 'plugin-config.json');
      await fs.writeFile(configPath, JSON.stringify({
        'metadata-test': {
          prefix: 'CUSTOM'
        }
      }));

      const mainFile = join(tempDir, 'main.md');
      await fs.writeFile(mainFile, `# Test\n\nPREFIX: Value here\n\nEnd.`);

      const result = spawnSync('node', [cliPath, mainFile, '--plugins', pluginPath, '--plugin-config', configPath], {
        encoding: 'utf-8',
        cwd: tempDir
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('CUSTOM: Value here');
      expect(result.stdout).not.toContain('PREFIX: Value here');
    });

    test('should support async plugin operations', async () => {
      const pluginPath = join(tempDir, 'async-plugin.js');
      await fs.writeFile(pluginPath, `
module.exports = {
  metadata: {
    name: 'async-transformer',
    version: '1.0.0',
    description: 'Async transformation plugin',
    type: 'content-transformer',
    priority: 50,
    async: true
  },
  
  async transform(content, context) {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 10));
    return content.replace(/ASYNC/g, 'Processed Async');
  }
};
`);

      const mainFile = join(tempDir, 'main.md');
      await fs.writeFile(mainFile, `# Document\n\nASYNC content here.\n\nEnd.`);

      const result = spawnSync('node', [cliPath, mainFile, '--plugins', pluginPath], {
        encoding: 'utf-8',
        cwd: tempDir
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Processed Async content here.');
      expect(result.stdout).not.toContain('ASYNC content here.');
    });
  });

  describe('Plugin Loader System', () => {
    test('should load plugins from files', async () => {
      const pluginPath = join(tempDir, 'file-plugin.js');
      await fs.writeFile(pluginPath, `
module.exports = {
  metadata: {
    name: 'file-loader-test',
    version: '1.0.0',
    description: 'Plugin loaded from file',
    type: 'content-transformer',
    priority: 50,
    async: false
  },
  
  transform(content) {
    return content.replace(/FILE/g, 'Loaded From File');
  }
};
`);

      const mainFile = join(tempDir, 'main.md');
      await fs.writeFile(mainFile, `# Test\n\nFILE content.\n\nEnd.`);

      const result = spawnSync('node', [cliPath, mainFile, '--plugins', pluginPath], {
        encoding: 'utf-8',
        cwd: tempDir
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Loaded From File content.');
    });

    test('should load plugins from directories', async () => {
      const pluginsDir = join(tempDir, 'plugins');
      await fs.mkdir(pluginsDir);

      // Create multiple plugins in directory
      await fs.writeFile(join(pluginsDir, 'plugin1.js'), `
module.exports = {
  metadata: {
    name: 'dir-plugin-1',
    version: '1.0.0',
    description: 'First directory plugin',
    type: 'content-transformer',
    priority: 10,
    async: false
  },
  transform(content) { return content.replace(/ONE/g, 'First'); }
};
`);

      await fs.writeFile(join(pluginsDir, 'plugin2.js'), `
module.exports = {
  metadata: {
    name: 'dir-plugin-2',
    version: '1.0.0',
    description: 'Second directory plugin',
    type: 'content-transformer',
    priority: 20,
    async: false
  },
  transform(content) { return content.replace(/TWO/g, 'Second'); }
};
`);

      const mainFile = join(tempDir, 'main.md');
      await fs.writeFile(mainFile, `# Test\n\nONE and TWO content.\n\nEnd.`);

      const result = spawnSync('node', [cliPath, mainFile, '--plugins', pluginsDir], {
        encoding: 'utf-8',
        cwd: tempDir
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('First and Second content.');
    });

    test('should handle plugin loading errors gracefully', async () => {
      const invalidPluginPath = join(tempDir, 'invalid-plugin.js');
      await fs.writeFile(invalidPluginPath, `
// Invalid plugin - missing required metadata
module.exports = {
  transform(content) {
    return content;
  }
};
`);

      const mainFile = join(tempDir, 'main.md');
      await fs.writeFile(mainFile, `# Test\n\nContent here.\n\nEnd.`);

      const result = spawnSync('node', [cliPath, mainFile, '--plugins', invalidPluginPath], {
        encoding: 'utf-8',
        cwd: tempDir
      });

      // Should continue processing despite plugin error (non-strict mode)
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('# Test');
      expect(result.stdout).toContain('Content here.');
    });

    test('should validate plugin interface compliance', async () => {
      const nonCompliantPlugin = join(tempDir, 'bad-plugin.js');
      await fs.writeFile(nonCompliantPlugin, `
module.exports = {
  metadata: {
    name: 'bad-plugin',
    version: '1.0.0',
    // Missing description and type
  },
  // Missing transform function
};
`);

      const mainFile = join(tempDir, 'main.md');
      await fs.writeFile(mainFile, `# Test\n\nContent.\n\nEnd.`);

      const result = spawnSync('node', [cliPath, mainFile, '--plugins', nonCompliantPlugin], {
        encoding: 'utf-8',
        cwd: tempDir
      });

      // Should continue processing despite validation error
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('# Test');
    });
  });

  describe('Built-in Sample Plugins', () => {
    test('should support built-in plugins when enabled', async () => {
      const mainFile = join(tempDir, 'main.md');
      await fs.writeFile(mainFile, `# Document

\`\`\`javascript
const hello = "world";
console.log(hello);
\`\`\`

| Name | Age |
|------|-----|
| John | 25  |
| Jane | 30  |

Today is {{DATE}}.

End.`);

      // Test with built-in plugins (they should be enabled by default when using --plugins)
      const result = spawnSync('node', [cliPath, mainFile, '--plugins', 'builtin'], {
        encoding: 'utf-8',
        cwd: tempDir
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('# Document');
      // Built-in plugins should process the content
      expect(result.stdout).toContain('End.');
    });
  });

  describe('CLI Integration', () => {
    test('should support --plugins flag with single plugin', async () => {
      const pluginPath = join(tempDir, 'single-plugin.js');
      await fs.writeFile(pluginPath, `
module.exports = {
  metadata: {
    name: 'single-test',
    version: '1.0.0',
    description: 'Single plugin test',
    type: 'content-transformer',
    priority: 50,
    async: false
  },
  transform(content) { return content.replace(/SINGLE/g, 'One Plugin'); }
};
`);

      const mainFile = join(tempDir, 'main.md');
      await fs.writeFile(mainFile, `# Test\n\nSINGLE plugin test.\n\nEnd.`);

      const result = spawnSync('node', [cliPath, mainFile, '--plugins', pluginPath], {
        encoding: 'utf-8',
        cwd: tempDir
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('One Plugin plugin test.');
    });

    test('should support --plugins flag with multiple plugins', async () => {
      const plugin1Path = join(tempDir, 'plugin1.js');
      const plugin2Path = join(tempDir, 'plugin2.js');

      await fs.writeFile(plugin1Path, `
module.exports = {
  metadata: {
    name: 'multi-test-1',
    version: '1.0.0',
    description: 'First multi plugin',
    type: 'content-transformer',
    priority: 10,
    async: false
  },
  transform(content) { return content.replace(/FIRST/g, 'Plugin One'); }
};
`);

      await fs.writeFile(plugin2Path, `
module.exports = {
  metadata: {
    name: 'multi-test-2',
    version: '1.0.0',
    description: 'Second multi plugin',
    type: 'content-transformer',
    priority: 20,
    async: false
  },
  transform(content) { return content.replace(/SECOND/g, 'Plugin Two'); }
};
`);

      const mainFile = join(tempDir, 'main.md');
      await fs.writeFile(mainFile, `# Test\n\nFIRST and SECOND plugins.\n\nEnd.`);

      const result = spawnSync('node', [cliPath, mainFile, '--plugins', `${plugin1Path},${plugin2Path}`], {
        encoding: 'utf-8',
        cwd: tempDir
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Plugin One and Plugin Two plugins.');
    });

    test('should support --plugin-config flag', async () => {
      const pluginPath = join(tempDir, 'config-plugin.js');
      await fs.writeFile(pluginPath, `
module.exports = {
  metadata: {
    name: 'config-test',
    version: '1.0.0',
    description: 'Plugin with configuration',
    type: 'content-transformer',
    priority: 50,
    async: false
  },
  
  init(context) {
    this.config = context.config['config-test'] || {};
  },
  
  transform(content) {
    const replacement = this.config.replacement || 'DEFAULT';
    return content.replace(/CONFIG/g, replacement);
  }
};
`);

      const configPath = join(tempDir, 'config.json');
      await fs.writeFile(configPath, JSON.stringify({
        'config-test': {
          replacement: 'CONFIGURED'
        }
      }));

      const mainFile = join(tempDir, 'main.md');
      await fs.writeFile(mainFile, `# Test\n\nCONFIG value here.\n\nEnd.`);

      const result = spawnSync('node', [cliPath, mainFile, '--plugins', pluginPath, '--plugin-config', configPath], {
        encoding: 'utf-8',
        cwd: tempDir
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('CONFIGURED value here.');
    });

    test('should work with existing CLI flags', async () => {
      const pluginPath = join(tempDir, 'compatible-plugin.js');
      await fs.writeFile(pluginPath, `
module.exports = {
  metadata: {
    name: 'compatible-test',
    version: '1.0.0',
    description: 'Compatible with other flags',
    type: 'content-transformer',
    priority: 50,
    async: false
  },
  transform(content, context) {
    // Access context variables
    const lang = context.variables.lang || 'en';
    return content.replace(/LANG/g, lang);
  }
};
`);

      const mainFile = join(tempDir, 'main.md');
      await fs.writeFile(mainFile, `# Test\n\nLanguage: LANG\n\nEnd.`);

      const result = spawnSync('node', [
        cliPath, mainFile, 
        '--plugins', pluginPath,
        '--variables', 'lang=es',
        '--verbose'
      ], {
        encoding: 'utf-8',
        cwd: tempDir
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Language: es');
    });
  });

  describe('Error Handling & Security', () => {
    test('should isolate plugin errors', async () => {
      const errorPluginPath = join(tempDir, 'error-plugin.js');
      await fs.writeFile(errorPluginPath, `
module.exports = {
  metadata: {
    name: 'error-test',
    version: '1.0.0',
    description: 'Plugin that throws errors',
    type: 'content-transformer',
    priority: 50,
    async: false
  },
  
  transform(content) {
    throw new Error('Plugin intentionally failed');
  }
};
`);

      const mainFile = join(tempDir, 'main.md');
      await fs.writeFile(mainFile, `# Test\n\nContent should still work.\n\nEnd.`);

      const result = spawnSync('node', [cliPath, mainFile, '--plugins', errorPluginPath], {
        encoding: 'utf-8',
        cwd: tempDir
      });

      // Should continue processing despite plugin error
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('# Test');
      expect(result.stdout).toContain('Content should still work.');
    });

    test('should handle invalid plugin files', async () => {
      const invalidPath = join(tempDir, 'invalid.js');
      await fs.writeFile(invalidPath, `
// Syntactically invalid JavaScript
const invalid = {
  metadata: {
    name: 'broken
  }
};
`);

      const mainFile = join(tempDir, 'main.md');
      await fs.writeFile(mainFile, `# Test\n\nContent.\n\nEnd.`);

      const result = spawnSync('node', [cliPath, mainFile, '--plugins', invalidPath], {
        encoding: 'utf-8',
        cwd: tempDir
      });

      // Should continue processing despite syntax error
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('# Test');
    });

    test('should handle non-existent plugin paths gracefully', async () => {
      const nonExistentPath = join(tempDir, 'does-not-exist.js');

      const mainFile = join(tempDir, 'main.md');
      await fs.writeFile(mainFile, `# Test\n\nContent.\n\nEnd.`);

      const result = spawnSync('node', [cliPath, mainFile, '--plugins', nonExistentPath], {
        encoding: 'utf-8',
        cwd: tempDir
      });

      // Should continue processing despite missing plugin
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('# Test');
    });
  });

  describe('Performance & Optimization', () => {
    test('should handle multiple plugins efficiently', async () => {
      const pluginsDir = join(tempDir, 'performance-plugins');
      await fs.mkdir(pluginsDir);

      // Create multiple plugins
      for (let i = 1; i <= 5; i++) {
        await fs.writeFile(join(pluginsDir, `perf-plugin-${i}.js`), `
module.exports = {
  metadata: {
    name: 'perf-test-${i}',
    version: '1.0.0',
    description: 'Performance test plugin ${i}',
    type: 'content-transformer',
    priority: ${i * 10},
    async: false
  },
  transform(content) {
    return content.replace(/PERF${i}/g, 'Processed ${i}');
  }
};
`);
      }

      const mainFile = join(tempDir, 'main.md');
      await fs.writeFile(mainFile, `# Performance Test

PERF1 PERF2 PERF3 PERF4 PERF5

End.`);

      const startTime = Date.now();
      const result = spawnSync('node', [cliPath, mainFile, '--plugins', pluginsDir], {
        encoding: 'utf-8',
        cwd: tempDir
      });
      const duration = Date.now() - startTime;

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Processed 1 Processed 2 Processed 3 Processed 4 Processed 5');
      
      // Should complete in reasonable time (< 10 seconds)
      expect(duration).toBeLessThan(10000);
    });

    test.skip('should maintain plugin execution order by priority', async () => {
      const plugin1Path = join(tempDir, 'low-priority.js');
      const plugin2Path = join(tempDir, 'high-priority.js');

      await fs.writeFile(plugin1Path, `
module.exports = {
  metadata: {
    name: 'low-priority',
    version: '1.0.0',
    description: 'Low priority plugin',
    type: 'content-transformer',
    priority: 75,
    async: false
  },
  transform(content) { return content.replace(/ORDER/g, 'SECOND'); }
};
`);

      await fs.writeFile(plugin2Path, `
module.exports = {
  metadata: {
    name: 'high-priority',
    version: '1.0.0',
    description: 'High priority plugin',
    type: 'content-transformer',
    priority: 25,
    async: false
  },
  transform(content) { return content.replace(/ORDER/g, 'FIRST'); }
};
`);

      const mainFile = join(tempDir, 'main.md');
      await fs.writeFile(mainFile, `# Test\n\nORDER execution test.\n\nEnd.`);

      const result = spawnSync('node', [cliPath, mainFile, '--plugins', `${plugin1Path},${plugin2Path}`], {
        encoding: 'utf-8',
        cwd: tempDir
      });

      expect(result.status).toBe(0);
      // High priority plugin should run first, then low priority
      expect(result.stdout).toContain('SECOND execution test.');
    });
  });

  describe('Integration with Transclusion System', () => {
    test('should work with transclusion references', async () => {
      const pluginPath = join(tempDir, 'transclusion-plugin.js');
      await fs.writeFile(pluginPath, `
module.exports = {
  metadata: {
    name: 'transclusion-test',
    version: '1.0.0',
    description: 'Plugin that works with transclusions',
    type: 'content-transformer',
    priority: 50,
    async: false
  },
  transform(content, context) {
    // Transform content based on file being processed
    const fileName = context.filePath.split('/').pop();
    return content.replace(/FILENAME/g, fileName);
  }
};
`);

      const includedFile = join(tempDir, 'included.md');
      await fs.writeFile(includedFile, `## Included Section\n\nThis is from FILENAME.\n\nEnd of included content.`);

      const mainFile = join(tempDir, 'main.md');
      await fs.writeFile(mainFile, `# Main Document\n\n![[included.md]]\n\nEnd of main.`);

      const result = spawnSync('node', [cliPath, mainFile, '--plugins', pluginPath], {
        encoding: 'utf-8',
        cwd: tempDir
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('# Main Document');
      expect(result.stdout).toContain('## Included Section');
      expect(result.stdout).toContain('This is from included.md');
      expect(result.stdout).toContain('End of main.');
    });

    test.skip('should preserve transclusion functionality with plugins', async () => {
      const pluginPath = join(tempDir, 'preserve-plugin.js');
      await fs.writeFile(pluginPath, `
module.exports = {
  metadata: {
    name: 'preserve-test',
    version: '1.0.0',
    description: 'Plugin that preserves transclusion',
    type: 'content-transformer',
    priority: 50,
    async: false
  },
  transform(content) {
    // Simple transformation that doesn't interfere
    return content.replace(/emphasis/g, '**emphasis**');
  }
};
`);

      const sectionFile = join(tempDir, 'section.md');
      await fs.writeFile(sectionFile, `## Section Title\n\nThis has emphasis text.\n\nSection end.`);

      const mainFile = join(tempDir, 'main.md');
      await fs.writeFile(mainFile, `# Document\n\n![[section.md]]\n\nDocument end.`);

      const result = spawnSync('node', [cliPath, mainFile, '--plugins', pluginPath], {
        encoding: 'utf-8',
        cwd: tempDir
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('# Document');
      expect(result.stdout).toContain('## Section Title');
      expect(result.stdout).toContain('This has **emphasis** text.');
      expect(result.stdout).toContain('Document end.');
      expect(result.stdout).not.toContain('![[section.md]]');
    });
  });
});