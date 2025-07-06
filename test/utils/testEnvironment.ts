import { MockFileSystem } from '../mocks/MockFileSystem';
import { MockFileCache } from '../mocks/MockFileCache';
import { MockLogger } from '../mocks/MockLogger';
import { MockClock } from '../mocks/MockClock';
import type { TransclusionOptions } from '../../src/types';

/**
 * Test environment configuration
 */
export interface TestEnvironment {
  fileSystem: MockFileSystem;
  fileCache: MockFileCache;
  logger: MockLogger;
  clock?: MockClock;
  basePath: string;
  options: TransclusionOptions;
}

/**
 * Fluent API for building test environments
 */
export class TestEnvironmentBuilder {
  private fileSystem: MockFileSystem;
  private fileCache: MockFileCache;
  private logger: MockLogger;
  private clock?: MockClock;
  private basePath: string = '/test';
  private options: Partial<TransclusionOptions> = {};
  
  constructor() {
    this.fileSystem = new MockFileSystem();
    this.fileCache = new MockFileCache();
    this.logger = MockLogger.createSpy();
  }
  
  /**
   * Set the base path
   */
  withBasePath(basePath: string): this {
    this.basePath = basePath;
    return this;
  }
  
  /**
   * Add files to the file system
   */
  withFiles(files: Record<string, string>): this {
    this.fileSystem.addFiles(files);
    return this;
  }
  
  /**
   * Use a preset file system
   */
  withPreset(preset: 'simple' | 'nested' | 'circular' | 'multilingual'): this {
    this.fileSystem = MockFileSystem.createWithPreset(preset);
    return this;
  }
  
  /**
   * Configure transclusion options
   */
  withOptions(options: Partial<TransclusionOptions>): this {
    this.options = { ...this.options, ...options };
    return this;
  }
  
  /**
   * Enable strict mode
   */
  withStrictMode(): this {
    this.options.strict = true;
    return this;
  }
  
  /**
   * Set variables
   */
  withVariables(variables: Record<string, string>): this {
    this.options.variables = variables;
    return this;
  }
  
  /**
   * Use a custom file cache
   */
  withFileCache(cache: MockFileCache): this {
    this.fileCache = cache;
    return this;
  }
  
  /**
   * Use a custom logger
   */
  withLogger(logger: MockLogger): this {
    this.logger = logger;
    return this;
  }
  
  /**
   * Enable mocked time
   */
  withMockedTime(initialTime: number = 0): this {
    this.clock = new MockClock(initialTime);
    this.clock.install();
    return this;
  }
  
  /**
   * Build the test environment
   */
  build(): TestEnvironment {
    const options: TransclusionOptions = {
      basePath: this.basePath,
      cache: this.fileCache,
      ...this.options
    };
    
    return {
      fileSystem: this.fileSystem,
      fileCache: this.fileCache,
      logger: this.logger,
      clock: this.clock,
      basePath: this.basePath,
      options
    };
  }
  
  /**
   * Clean up the environment
   */
  static cleanup(env: TestEnvironment): void {
    env.fileSystem.clear();
    env.fileCache.clear();
    env.logger.clear();
    if (env.clock) {
      env.clock.uninstall();
    }
  }
}

/**
 * Create a test environment with fluent API
 */
export function setupTestEnv(): TestEnvironmentBuilder {
  return new TestEnvironmentBuilder();
}

/**
 * Common test scenarios
 */
export const TestScenarios = {
  /**
   * Simple transclusion scenario
   */
  simple(): TestEnvironment {
    return setupTestEnv()
      .withBasePath('/test')
      .withFiles({
        '/test/main.md': '# Main\n![[section]]',
        '/test/section.md': '## Section Content'
      })
      .build();
  },
  
  /**
   * Nested transclusion scenario
   */
  nested(): TestEnvironment {
    return setupTestEnv()
      .withBasePath('/test')
      .withPreset('nested')
      .build();
  },
  
  /**
   * Circular reference scenario
   */
  circular(): TestEnvironment {
    return setupTestEnv()
      .withBasePath('/test')
      .withFiles({
        '/test/a.md': 'File A\n![[b]]',
        '/test/b.md': 'File B\n![[a]]'
      })
      .build();
  },
  
  /**
   * Multilingual scenario
   */
  multilingual(lang: string = 'en'): TestEnvironment {
    return setupTestEnv()
      .withBasePath('/test')
      .withPreset('multilingual')
      .withVariables({ lang })
      .build();
  },
  
  /**
   * Error scenario with missing files
   */
  withErrors(): TestEnvironment {
    return setupTestEnv()
      .withBasePath('/test')
      .withFiles({
        '/test/main.md': '![[missing]]'
      })
      .withStrictMode()
      .build();
  }
};