# API Reference

## Overview

The `markdown-transclusion` library provides both programmatic and command-line interfaces for processing Obsidian-style transclusions in Markdown documents.

## Installation

```bash
npm install markdown-transclusion
```

## Core API

### transclude(input, options)

Processes a complete Markdown string, replacing all transclusion references with file contents.

```typescript
import { transclude } from 'markdown-transclusion';

const result = await transclude(`# My Document
![[intro]]
Some content here.
![[conclusion]]`, {
  basePath: './docs',
  variables: { version: '2.0' }
});

console.log(result.content);       // Fully processed content
console.log(result.errors);        // Array of any errors
console.log(result.processedFiles); // Array of all files that were processed
```

**Returns:**
```typescript
interface TransclusionResult {
  content: string;               // Processed content with all transclusions resolved
  errors: TransclusionError[];   // Array of errors encountered
  processedFiles: string[];      // Array of absolute paths to all processed files
}
```

### transcludeFile(filePath, options)

Processes a Markdown file, replacing all transclusion references with file contents.

```typescript
import { transcludeFile } from 'markdown-transclusion';

const result = await transcludeFile('./README.md', {
  variables: { lang: 'es' }
});

console.log(result.content);       // Fully processed content
console.log(result.errors);        // Array of any errors
console.log(result.processedFiles); // Includes README.md and all transcluded files
```

**Note:** If `basePath` is not specified in options, it defaults to the directory containing the file being processed.

**Returns:** Same as `transclude()` - a `TransclusionResult` object.

### processLine(line, options)

Processes a single line of text for transclusions. This is the core function used internally by the stream and other convenience methods.

```typescript
import { processLine } from 'markdown-transclusion';

const result = await processLine('Before ![[section]] after', {
  basePath: './docs',
  extensions: ['md']
});

console.log(result.output);  // "Before <content of section.md> after"
console.log(result.errors);  // Array of any errors encountered

// 🛠️ .errors is a custom property on TransclusionTransform. You won't find it in a regular Node stream. Capisce?
```

**Returns:**
```typescript
interface TransclusionLineResult {
  output: string;              // Processed line with transclusions resolved
  errors: TransclusionError[]; // Array of errors encountered
}
```

**CLI Equivalent:**
```bash
echo "Before ![[section]] after" | markdown-transclusion --base-path ./docs
```

### createTransclusionStream(options)

Creates a Node.js transform stream that processes transclusions. Ideal for processing large files or piping data.

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
  basePath?: string;             // Base directory for resolving references (default: process.cwd())
  extensions?: string[];         // File extensions to try (default: ['md', 'markdown'])
  variables?: Record<string, string>; // Variables for substitution
  strict?: boolean;              // Exit with error on transclusion failure (default: false)
  cache?: FileCache;             // Optional file cache implementation
  maxDepth?: number;             // Maximum recursion depth (default: 10)
  validateOnly?: boolean;        // Only validate, don't output content (default: false)
}
```

**Returns:** A Node.js Transform stream instance

**CLI Equivalent:**
```bash
markdown-transclusion input.md --base-path ./docs
```

### TransclusionTransform class

The transform stream class that extends Node.js Transform stream.

```typescript
import { TransclusionTransform } from 'markdown-transclusion';

const transform = new TransclusionTransform({
  basePath: './docs',
  maxDepth: 5
});

// Access errors after processing
transform.on('finish', () => {
  const errors = transform.errors;
  console.log(`Processed with ${errors.length} errors`);
});
```

**Properties:**
- `errors: TransclusionError[]` - Array of errors encountered during processing

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
  TransclusionLineResult,
  TransclusionTransform,
  FileCache,
  CachedFileContent,
  TransclusionToken,
  FileResolution
} from 'markdown-transclusion';
```

### Main Types

```typescript
// Result from processLine function
interface TransclusionLineResult {
  output: string;
  errors: TransclusionError[];
}

// Parsed transclusion reference
interface TransclusionToken {
  raw: string;        // Original ![[...]] text
  path: string;       // File path extracted
  heading?: string;   // Optional heading after #
  start: number;      // Start position in line
  end: number;        // End position in line
}

// Resolved file information
interface FileResolution {
  absolutePath: string;
  exists: boolean;
  originalReference: string;
  error?: string;
  errorCode?: string;
}
```

## Examples

### Multilingual Documentation

```typescript
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createTransclusionStream } from 'markdown-transclusion';

const languages = ['en', 'es', 'fr', 'de'];

for (const lang of languages) {
  const stream = createTransclusionStream({
    basePath: './docs',
    variables: { lang }
  });
  
  await pipeline(
    createReadStream('template.md'),
    stream,
    createWriteStream(`output-${lang}.md`)
  );
}
```

**CLI Equivalent:**
```bash
for lang in en es fr de; do
  markdown-transclusion template.md --variables "lang=$lang" -o "output-$lang.md"
done
```

### Validation Mode

```typescript
import { createTransclusionStream } from 'markdown-transclusion';
import { createReadStream } from 'fs';

const stream = createTransclusionStream({
  basePath: './docs',
  validateOnly: true
});

const errors: TransclusionError[] = [];

stream.on('finish', () => {
  if (stream.errors.length > 0) {
    console.error(`Found ${stream.errors.length} invalid transclusions`);
    stream.errors.forEach(err => {
      console.error(`- ${err.path}: ${err.message}`);
    });
    process.exit(1);
  }
});

createReadStream('document.md').pipe(stream);
```

**CLI Equivalent:**
```bash
markdown-transclusion document.md --validate-only --strict
```

### Custom Error Handling

```typescript
import { processLine } from 'markdown-transclusion';

const lines = content.split('\n');
const output: string[] = [];
let hasErrors = false;

for (const line of lines) {
  const result = await processLine(line, {
    basePath: './docs',
    strict: false
  });
  
  output.push(result.output);
  
  result.errors.forEach(error => {
    switch (error.code) {
      case 'FILE_NOT_FOUND':
        console.warn(`Missing file: ${error.path}`);
        break;
      case 'CIRCULAR_REFERENCE':
        console.error(`Circular reference: ${error.message}`);
        hasErrors = true;
        break;
      case 'MAX_DEPTH_EXCEEDED':
        console.error(`Too deep: ${error.message}`);
        hasErrors = true;
        break;
      default:
        console.error(`Error: ${error.message}`);
    }
  });
}

const finalOutput = output.join('\n');
```

### CLI Examples

```bash
# Basic usage
markdown-transclusion input.md

# With options
markdown-transclusion input.md --base-path ./docs --output output.md

# Variable substitution
markdown-transclusion template.md --variables "version=2.0,lang=en"

# Validation only
markdown-transclusion document.md --validate-only

# Strict mode (exit on error)
markdown-transclusion input.md --strict

# Custom log level
markdown-transclusion input.md --log-level WARN

# Piping
cat input.md | markdown-transclusion > output.md

# ⚠️ On Windows, use Git Bash or PowerShell. CMD can't handle the pipework.

# Multiple files (using shell)
for file in docs/*.md; do
  markdown-transclusion "$file" -o "processed/$(basename $file)"
done
```