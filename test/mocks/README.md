# Mock Infrastructure

A comprehensive testing infrastructure for the markdown-transclusion library.

## Available Mocks

### MockFileSystem
In-memory file system for testing file operations without touching disk.

```typescript
const fs = new MockFileSystem();
fs.addFile('/path/to/file.md', 'content');
fs.readFile('/path/to/file.md'); // Returns: 'content'

// Or use presets
const fs = MockFileSystem.createWithPreset('multilingual');
```

### MockFileCache  
Tracks all cache interactions for verification.

```typescript
const cache = new MockFileCache();
cache.set('/file.md', 'content');
expect(cache.getCalls).toContain('/file.md');
```

### MockLogger
Logger with assertion helpers for testing.

```typescript
const logger = new MockLogger();
logger.warn('Missing file');
expect(logger.hasWarning('Missing')).toBe(true);
logger.assertNoErrors();
```

### MockClock
Controls time for deterministic tests.

```typescript
const clock = new MockClock(1000);
clock.install();
Date.now(); // 1000
clock.tick(5000);
Date.now(); // 6000
clock.uninstall();
```

## Test Environment Builder

Fluent API for setting up test environments:

```typescript
const env = setupTestEnv()
  .withBasePath('/docs')
  .withFiles({
    '/docs/main.md': '# Main\n![[section]]',
    '/docs/section.md': '## Section Content'
  })
  .withVariables({ lang: 'en' })
  .withStrictMode()
  .build();

// Use the environment
const result = await processLine('![[section]]', env.options);

// Cleanup
TestEnvironmentBuilder.cleanup(env);
```

## Test Scenarios

Pre-configured scenarios for common test cases:

```typescript
const env = TestScenarios.multilingual('es');
const env = TestScenarios.nested();
const env = TestScenarios.circular();
const env = TestScenarios.withErrors();
```

## Custom Jest Matchers

Transclusion-specific matchers:

```typescript
expect(output).toHaveNoTransclusionErrors();
expect(output).toContainTransclusions(['Section 1', 'Section 2']);
expect(output).toMatchTransclusionOutput(expected, { lang: 'en' });
```

## Usage Example

See `tests/examples/mockUsage.test.ts` for comprehensive examples.