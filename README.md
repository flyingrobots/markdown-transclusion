# markdown-transclusion

Stream-based library for resolving Obsidian-style transclusion references in Markdown documents.

## Overview

`markdown-transclusion` processes Markdown files containing transclusion syntax (`![[filename]]`) and resolves these references by embedding the content of referenced files. This enables modular documentation workflows where content can be composed from reusable components.

Designed for the Universal Charter project's multilingual documentation pipeline, it provides reliable, stream-based processing suitable for CI/CD integration.

## Installation

```bash
npm install markdown-transclusion
```

## Quick Start

### CLI Usage

```bash
# Process a file
npx markdown-transclusion input.md --output output.md

# Use with pipes (POSIX-compliant)
cat input.md | npx markdown-transclusion > output.md

# With variables for multilingual content
npx markdown-transclusion template.md --variables lang=es > output-es.md

# Validate without processing
npx markdown-transclusion template.md --validate-only

# Strict mode (exit with error on missing files)
npx markdown-transclusion input.md --strict

# Specify base path for resolution
npx markdown-transclusion input.md --base-path ./docs

# Multiple variables
npx markdown-transclusion template.md --variables lang=es,version=2.0
```

### Programmatic Usage

```javascript
import { createTransclusionStream, transclude } from 'markdown-transclusion';
import { createReadStream, createWriteStream } from 'fs';

// Stream-based processing
createReadStream('input.md')
  .pipe(createTransclusionStream({
    basePath: './content',
    variables: { lang: 'en' }
  }))
  .pipe(createWriteStream('output.md'));

// Simple async function
const result = await transclude(markdownContent, {
  basePath: './content'
});

if (result.errors.length > 0) {
  console.error('Errors:', result.errors);
}
```

## Transclusion Syntax

```markdown
<!-- Basic transclusion -->
![[introduction]]

<!-- With path -->
![[sections/chapter1]]

<!-- With variables -->
![[content-{{lang}}]]

<!-- Heading-specific transclusion -->
![[document#Section Title]]

<!-- Nested transclusions work recursively -->
![[parent]] <!-- If parent.md contains ![[child]], child.md will be included -->
```

## Features

- **Stream-based processing** for memory efficiency
- **Recursive transclusion** with configurable depth limit
- **Circular reference detection** with clear error messages
- **Security-first design** with path traversal protection
- **Variable substitution** for multilingual workflows
- **Heading extraction** for including specific sections
- **Relative path resolution** from parent file context
- **Built-in caching** (optional) for repeated reads
- **POSIX-compliant** CLI for pipeline integration
- **Zero runtime dependencies**
- **Full TypeScript support**

## CLI Options

```
Usage: markdown-transclusion [input-file] [options]

Options:
  -o, --output <file>       Output file (default: stdout)
  -b, --base-path <path>    Base path for resolving references
  -e, --extensions <exts>   Comma-separated file extensions (default: md,markdown)
  -v, --variables <vars>    Variables as key=value pairs (comma-separated)
  -s, --strict              Exit with error on missing files
  --validate-only           Validate references without processing
  --max-depth <n>           Maximum recursion depth (default: 10)
  --log-level <level>       Log level: ERROR, WARN, INFO, DEBUG
  -h, --help                Show help
  --version                 Show version
```

## Programmatic API

### Stream Processing

```javascript
import { createTransclusionStream } from 'markdown-transclusion';
import { createReadStream, createWriteStream } from 'fs';

const options = {
  basePath: './docs',
  variables: { lang: 'en', version: '1.0' },
  maxDepth: 10
};

createReadStream('input.md')
  .pipe(createTransclusionStream(options))
  .pipe(createWriteStream('output.md'));
```

### Async Processing

```javascript
import { transclude, transcludeFile } from 'markdown-transclusion';

// Process a string
const result = await transclude('# Doc\n![[section]]', {
  basePath: './docs'
});

console.log(result.content);  // Processed content
console.log(result.errors);   // Any errors encountered

// Process a file
const fileResult = await transcludeFile('./template.md', {
  basePath: './docs',
  variables: { lang: 'es' }
});
```

### Error Handling

```javascript
const stream = createTransclusionStream({
  basePath: './docs',
  strict: true  // Throw on errors
});

stream.on('error', (error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});

// Or check errors after processing
stream.on('finish', () => {
  if (stream.errors.length > 0) {
    console.error('Transclusion errors:', stream.errors);
  }
});
```

## Use Cases

### Multilingual Documentation

```bash
# Template file (template.md):
# # User Guide
# ![[introduction-{{lang}}]]
# ![[features-{{lang}}]]

# Generate language versions
for lang in en es fr de; do
  npx markdown-transclusion template.md \
    --variables lang=$lang \
    --output guide-$lang.md
done
```

### Modular Documentation

```markdown
<!-- manual.md -->
# Product Manual

![[sections/overview]]
![[sections/installation]]
![[sections/configuration]]
![[sections/api-reference#REST API]]
![[sections/troubleshooting]]
```

### CI/CD Pipeline Integration

```yaml
# .github/workflows/docs.yml
- name: Build documentation
  run: |
    npx markdown-transclusion docs/template.md \
      --variables version=${{ github.ref_name }} \
      --strict \
      --output dist/README.md
```

## Security

The library includes built-in security features:

- **Path traversal protection**: Prevents `../` escape attempts
- **Absolute path blocking**: Rejects absolute paths
- **Null byte protection**: Blocks null bytes in paths
- **Base path enforcement**: All paths resolved within base directory

```markdown
<!-- These will be rejected -->
![[../../../etc/passwd]]
![[/etc/passwd]]
![[file\x00.md]]
```

## Documentation

- [API Reference](./docs/api.md) - Detailed API documentation
- [Contributing Guide](./docs/contributing.md) - Development setup and guidelines
- [Technical Design](./docs/tech-plan.md) - Architecture and design decisions

## License

MIT