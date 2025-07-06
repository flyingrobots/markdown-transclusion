import { setupTestEnv, TestScenarios, TestEnvironmentBuilder } from '../utils/testEnvironment';
import { setupTransclusionMatchers } from '../utils/snapshotTesting';
import { MockClock, MockFileSystem } from '../mocks';

// Setup custom matchers
setupTransclusionMatchers();

describe('Mock Infrastructure Usage Examples', () => {
  describe('Using TestEnvironmentBuilder', () => {
    it('should create test environment with files', () => {
      // Setup environment with fluent API
      const env = setupTestEnv()
        .withBasePath('/docs')
        .withFiles({
          '/docs/main.md': '# Main\n![[section]]',
          '/docs/section.md': '## Section Content'
        })
        .build();
      
      // Check files are accessible
      expect(env.fileSystem.exists('/docs/main.md')).toBe(true);
      expect(env.fileSystem.exists('/docs/section.md')).toBe(true);
      
      // Check file system access log
      env.fileSystem.readFileSync('/docs/main.md');
      expect(env.fileSystem.getAccessLog()).toContain('/docs/main.md');
      
      // Cleanup
      TestEnvironmentBuilder.cleanup(env);
    });
    
    it('should handle missing files', () => {
      const env = setupTestEnv()
        .withBasePath('/docs')
        .withFiles({
          '/docs/main.md': '![[missing]]'
        })
        .build();
      
      // Try to read missing file
      expect(() => {
        env.fileSystem.readFileSync('/docs/missing.md');
      }).toThrow('File not found');
      
      TestEnvironmentBuilder.cleanup(env);
    });
  });
  
  describe('Using Test Scenarios', () => {
    it('should handle nested transclusions', () => {
      const env = TestScenarios.nested();
      
      // Mock file system has preset nested files
      const level1 = env.fileSystem.readFileSync('/base/level1.md');
      expect(level1).toContain('![[level2]]');
      
      const level2 = env.fileSystem.readFileSync('/base/level2.md');
      expect(level2).toContain('![[level3]]');
      
      TestEnvironmentBuilder.cleanup(env);
    });
    
    it('should handle multilingual content', () => {
      const envEn = TestScenarios.multilingual('en');
      const envEs = TestScenarios.multilingual('es');
      
      // Check language-specific files exist
      expect(envEn.fileSystem.exists('/base/content-en.md')).toBe(true);
      expect(envEs.fileSystem.exists('/base/content-es.md')).toBe(true);
      
      TestEnvironmentBuilder.cleanup(envEn);
      TestEnvironmentBuilder.cleanup(envEs);
    });
  });
  
  describe('Using MockClock', () => {
    it('should track cache timing', () => {
      const env = setupTestEnv()
        .withBasePath('/docs')
        .withFiles({
          '/docs/content.md': 'Cached content'
        })
        .withMockedTime(1000)
        .build();
      
      // First access
      env.fileCache.set('/docs/content.md', 'Cached content');
      const firstTime = Date.now();
      expect(firstTime).toBe(1000);
      
      // Advance time
      env.clock!.tick(5000);
      
      // Second access
      const cached = env.fileCache.get('/docs/content.md');
      const secondTime = Date.now();
      
      expect(cached?.timestamp).toBe(firstTime);
      expect(secondTime).toBe(6000);
      expect(secondTime - firstTime).toBe(5000);
      
      TestEnvironmentBuilder.cleanup(env);
    });
  });
  
  describe('Using Custom Matchers', () => {
    it('should use custom transclusion matchers', () => {
      const output = `# Title
Section 1
Section 2`;
      
      // Custom matchers
      expect(output).toHaveNoTransclusionErrors();
      expect(output).toContainTransclusions(['Section 1', 'Section 2']);
      
      // Error example
      const errorOutput = '<!-- Error: File not found -->';
      expect(errorOutput).not.toHaveNoTransclusionErrors();
    });
  });
  
  describe('Using MockLogger assertions', () => {
    it('should track warnings and errors', () => {
      const env = setupTestEnv().build();
      
      // Log some messages
      env.logger.warn('Missing file: test.md');
      env.logger.error('Critical error occurred');
      
      // Logger assertions
      expect(env.logger.hasWarning('Missing file')).toBe(true);
      expect(env.logger.hasError('Critical error')).toBe(true);
      expect(env.logger.getWarningCount()).toBe(1);
      expect(env.logger.getErrorCount()).toBe(1);
      
      // This should throw
      expect(() => {
        env.logger.assertNoErrors();
      }).toThrow('Expected no errors but found 1');
      
      TestEnvironmentBuilder.cleanup(env);
    });
  });
  
  describe('MockFileSystem presets', () => {
    it('should create circular reference scenario', () => {
      const fs = MockFileSystem.createWithPreset('circular');
      
      const fileA = fs.readFileSync('/base/a.md');
      const fileB = fs.readFileSync('/base/b.md');
      
      expect(fileA).toContain('![[b]]');
      expect(fileB).toContain('![[a]]');
    });
    
    it('should create multilingual scenario', () => {
      const fs = MockFileSystem.createWithPreset('multilingual');
      
      expect(fs.exists('/base/template.md')).toBe(true);
      expect(fs.exists('/base/content-en.md')).toBe(true);
      expect(fs.exists('/base/content-es.md')).toBe(true);
      expect(fs.exists('/base/content-fr.md')).toBe(true);
      
      const template = fs.readFileSync('/base/template.md');
      expect(template).toContain('![[content-{{lang}}]]');
    });
  });
});