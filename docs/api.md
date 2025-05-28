# API Reference

## Overview

The `markdown-transclusion` library provides both programmatic and command-line interfaces for processing Obsidian-style transclusions in Markdown documents.

## Installation

```bash
npm install markdown-transclusion
```

## Core API

### createTransclusionStream(options)

Creates a transform stream that processes transclusions.

```typescript
import { createTransclusionStream } from 'markdown-transclusion';

const stream = createTransclusionStream({
  basePath: './docs',
  extensions: ['.md', '.markdown'],
  variables: { lang: 'en' },
  strict: false,
  maxDepth: 10
});
```

#### Options

```typescript
interface TransclusionOptions {
  basePath: string;              // Base directory for resolving references
  extensions?: string[];         // File extensions to try (default: ['.md', '.markdown'])
  variables?: Record<string, string>; // Variables for substitution
  strict?: boolean;              // Throw on errors (default: false)
  cache?: FileCache;             // Optional file cache implementation
  maxDepth?: number;             // Maximum recursion depth (default: 10)
  validateOnly?: boolean;        // Only validate, don't process content
}
```

### transclude(input, options)

Convenience function for processing a string.

```typescript
import { transclude } from 'markdown-transclusion';

const result = await transclude('# Doc\n![[section]]', {
  basePath: './docs'
});

console.log(result.content);  // Processed content
console.log(result.errors);   // Any errors encountered
```

### transcludeFile(filePath, options)

Convenience function for processing a file.

```typescript
import { transcludeFile } from 'markdown-transclusion';

const result = await transcludeFile('./template.md', {
  basePath: './docs',
  variables: { version: '1.0' }
});
```

## Error Handling

### TransclusionError

All errors follow this structure:

```typescript
interface TransclusionError {
  message: string;    // Human-readable error message
  path: string;       // Path that caused the error
  line?: number;      // Line number (if applicable)
  code?: string;      // Error code for programmatic handling
}
```

### Error Codes

- `FILE_NOT_FOUND` - Referenced file doesn't exist
- `READ_ERROR` - Error reading file
- `CIRCULAR_REFERENCE` - Circular transclusion detected
- `MAX_DEPTH_EXCEEDED` - Maximum recursion depth exceeded
- `HEADING_NOT_FOUND` - Specified heading not found in file
- `SECURITY_ERROR` - Path traversal or security violation

## Transclusion Syntax

### Basic Transclusion

```markdown
![[filename]]
![[path/to/file]]
```

### With Variables

```markdown
![[content-{{lang}}]]
![[sections/{{version}}/intro]]
```

### Heading-Specific

```markdown
![[document#Section Title]]
![[api-guide#Authentication]]
```

## Stream Usage

### Basic Pipeline

```typescript
import { createReadStream, createWriteStream } from 'fs';
import { createTransclusionStream } from 'markdown-transclusion';

createReadStream('input.md')
  .pipe(createTransclusionStream({ basePath: './docs' }))
  .pipe(createWriteStream('output.md'));
```

### With Error Handling

```typescript
const transclusionStream = createTransclusionStream({
  basePath: './docs',
  strict: true
});

transclusionStream.on('error', (error) => {
  console.error('Transclusion error:', error);
  process.exit(1);
});

process.stdin
  .pipe(transclusionStream)
  .pipe(process.stdout);
```

### Accessing Errors After Processing

```typescript
const stream = createTransclusionStream({ basePath: './docs' });

stream.on('finish', () => {
  const errors = stream.errors;
  if (errors.length > 0) {
    console.error(`Found ${errors.length} errors:`);
    errors.forEach(err => console.error(`- ${err.path}: ${err.message}`));
  }
});
```

## File Caching

### Using Built-in Cache

```typescript
import { MemoryFileCache, createTransclusionStream } from 'markdown-transclusion';

const cache = new MemoryFileCache();
const stream = createTransclusionStream({
  basePath: './docs',
  cache
});

// Check cache statistics
console.log(cache.stats());
// { size: 10, hits: 25, misses: 10 }
```

### Custom Cache Implementation

```typescript
class RedisFileCache implements FileCache {
  get(path: string): CachedFileContent | undefined {
    // Retrieve from Redis
  }
  
  set(path: string, content: string): void {
    // Store in Redis
  }
  
  clear(): void {
    // Clear Redis cache
  }
  
  stats() {
    return { size: 0, hits: 0, misses: 0 };
  }
}
```

## Security

The library includes built-in security features:

- **Path Traversal Protection**: Prevents `../` and absolute paths
- **Null Byte Protection**: Blocks null bytes in paths
- **Base Path Enforcement**: All paths resolved within base directory

```typescript
// These will be rejected:
![[../../../etc/passwd]]
![[/etc/passwd]]
![[file\x00.md]]
```

## Performance Considerations

### Streaming

- Files are processed line-by-line
- Memory usage is constant regardless of file size
- Suitable for large documents

### Recursion Limits

- Default maximum depth: 10
- Prevents infinite loops
- Configurable via `maxDepth` option

### Caching

- No caching by default
- Optional in-memory cache available
- Custom cache implementations supported

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  TransclusionOptions,
  TransclusionError,
  TransclusionResult,
  TransclusionTransform,
  FileCache,
  CachedFileContent
} from 'markdown-transclusion';
```

## Examples

### Multilingual Documentation

```typescript
const languages = ['en', 'es', 'fr', 'de'];

for (const lang of languages) {
  await transcludeFile('template.md', {
    basePath: './docs',
    variables: { lang },
    output: `output-${lang}.md`
  });
}
```

### Validation Mode

```typescript
const result = await transclude(content, {
  basePath: './docs',
  validateOnly: true
});

if (result.errors.length > 0) {
  console.error('Invalid transclusions found');
}
```

### Custom Error Handling

```typescript
const result = await transclude(content, {
  basePath: './docs',
  strict: false
});

result.errors.forEach(error => {
  switch (error.code) {
    case 'FILE_NOT_FOUND':
      console.warn(`Missing file: ${error.path}`);
      break;
    case 'CIRCULAR_REFERENCE':
      console.error(`Circular reference: ${error.message}`);
      break;
    default:
      console.error(`Error: ${error.message}`);
  }
});
```