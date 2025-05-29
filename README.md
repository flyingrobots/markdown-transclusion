# markdown-transclusion

[![npm version](https://img.shields.io/npm/v/markdown-transclusion.svg)](https://www.npmjs.com/package/markdown-transclusion)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/markdown-transclusion.svg)](https://nodejs.org)

Stream-based library and CLI for resolving Obsidian-style transclusion references in Markdown documents.

## Overview

`markdown-transclusion` processes Markdown files containing transclusion syntax (`![[filename]]`) and resolves these references by embedding the content of referenced files. This enables modular documentation workflows where content can be composed from reusable components.

Designed for the Universal Charter project's multilingual documentation pipeline, it provides reliable, stream-based processing suitable for CI/CD integration.

## Features

✅ **Recursive transclusion** - Include files within files with automatic depth limiting  
✅ **Circular reference detection** - Prevents infinite loops with clear error reporting  
✅ **Heading extraction** - Include specific sections using `![[file#heading]]` syntax  
✅ **Variable substitution** - Dynamic file references with `{{variable}}` placeholders  
✅ **Stream processing** - Memory-efficient processing of large documents  
✅ **Path resolution** - Relative paths resolved from parent file context  
✅ **Security built-in** - Path traversal protection and base directory enforcement  
✅ **CLI & API** - Use as a command-line tool or Node.js library  
✅ **Error recovery** - Graceful handling of missing files with inline error comments  
✅ **Zero dependencies** - No runtime dependencies for security and simplicity

## Installation

```bash
# Global CLI installation
npm install -g markdown-transclusion

# Local project installation
npm install markdown-transclusion

# Or use directly with npx
npx markdown-transclusion --help
```

## Quick Start

### CLI Usage

```bash
# Process a single file
markdown-transclusion input.md

# Output to file instead of stdout
markdown-transclusion input.md --output output.md

# Process with variables
markdown-transclusion template.md --variables "lang=es,version=2.0"

# Validate references without processing
markdown-transclusion docs/index.md --validate-only --strict

# Use from a different directory
markdown-transclusion README.md --base-path ./docs

# Pipe to other tools
markdown-transclusion input.md | pandoc -o output.pdf

# ⚠️ On Windows, use Git Bash or PowerShell. CMD can't handle the pipework.
```

### Example

Given these files:

`main.md`:
```markdown
# Documentation
![[intro]]
![[features#Overview]]
![[api/endpoints]]
```

`intro.md`:
```markdown
Welcome to our project! This tool helps you create modular documentation.
```

`features.md`:
```markdown
# Features

## Overview
Our tool supports transclusion, making documentation maintenance easier.

## Details
...
```

Running `markdown-transclusion main.md` produces:
```markdown
# Documentation
Welcome to our project! This tool helps you create modular documentation.
## Overview
Our tool supports transclusion, making documentation maintenance easier.
![[api/endpoints]]
<!-- Error: File not found: api/endpoints -->
```

### Programmatic Usage

```javascript
import { processLine, createTransclusionStream } from 'markdown-transclusion';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

// Process a single line
const result = await processLine('Check the ![[api-guide]]', {
  basePath: './docs'
});
console.log(result.output);  // "Check the <content of api-guide.md>"

// Stream processing for large files
const stream = createTransclusionStream({
  basePath: './docs',
  variables: { version: '2.0' },
  maxDepth: 5
});

await pipeline(
  createReadStream('input.md'),
  stream,
  createWriteStream('output.md')
);

// Check for errors after processing
if (stream.errors.length > 0) {
  console.error('Transclusion errors:', stream.errors);
}
```

## Transclusion Syntax

### Basic Syntax

| Syntax | Description | Example Output |
|--------|-------------|----------------|
| `![[filename]]` | Include entire file | Contents of `filename.md` |
| `![[folder/file]]` | Include file from folder | Contents of `folder/file.md` |
| `![[file#heading]]` | Include specific section | Content under `# heading` until next heading |
| `![[file#What We Don't Talk About]]` | Include section with spaces | Content under heading with spaces |
| `![[file-{{var}}]]` | Variable substitution | With `var=en`: contents of `file-en.md` |

### Advanced Examples

```markdown
<!-- Nested transclusion -->
![[chapter1]]  <!-- If chapter1.md contains ![[section1]], it will be included -->

<!-- Multiple variables -->
![[docs/{{lang}}/intro-{{version}}]]  <!-- Variables: lang=es, version=2 → docs/es/intro-2.md -->

<!-- Heading with spaces -->
![[architecture#System Overview]]

<!-- Error handling - missing file -->
![[missing-file]]
<!-- Error: File not found: missing-file -->

<!-- Circular reference protection -->
<!-- If A includes B, and B includes A, it will show: -->
![[/path/to/A.md]]
<!-- Error: Circular reference detected: /path/to/A.md → /path/to/B.md → /path/to/A.md -->
```


## Try It Out

We include a complete example project:

```bash
# Clone the repository
git clone https://github.com/flyingrobots/markdown-transclusion.git
cd markdown-transclusion/examples/basic

# Run the example
npx markdown-transclusion main.md --variables "lang=en"

# Try different languages
npx markdown-transclusion main.md --variables "lang=es"
```

See [examples/basic/README.md](./examples/basic/README.md) for a full walkthrough.


## Real-World Use Cases

### 1. Multilingual Documentation

Maintain documentation in multiple languages without duplication:

```bash
# template.md contains: ![[content-{{lang}}]]
for lang in en es fr de zh; do
  markdown-transclusion template.md \
    --variables "lang=$lang" \
    --output docs/$lang/guide.md
done
```

### 2. Version-Specific Documentation

```markdown
<!-- template.md -->
# API Documentation v{{version}}

![[changelog-{{version}}]]
![[api/endpoints-{{version}}]]
![[migration-guide-{{prev_version}}-to-{{version}}]]
```

### 3. Modular Course Content

```markdown
<!-- course.md -->
# JavaScript Course

![[modules/intro]]
![[modules/basics#Variables and Types]]
![[modules/functions]]
![[exercises/week-1]]
```

### 4. Configuration Documentation

```markdown
<!-- config-guide.md -->
# Configuration Guide

## Development Settings
![[configs/development]]

## Production Settings  
![[configs/production]]

## Common Issues
![[troubleshooting#Configuration Errors]]
```

### 5. CI/CD Integration

```yaml
# .github/workflows/docs.yml
name: Build Documentation
on:
  push:
    branches: [main]
    
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build docs
        run: |
          npm install -g markdown-transclusion
          markdown-transclusion docs/index.md \
            --variables "version=${{ github.ref_name }}" \
            --strict \
            --output dist/documentation.md
            
      - name: Validate links
        run: |
          markdown-transclusion docs/index.md \
            --validate-only \
            --strict
```

## API Reference

### Core Functions

#### `processLine(line, options)`

Process a single line of text for transclusions.

```typescript
const result = await processLine('See ![[notes]]', {
  basePath: './docs',
  extensions: ['md', 'txt']
});
// result.output: "See <contents of notes.md>"
// result.errors: Array of any errors
```

#### `createTransclusionStream(options)`

Create a transform stream for processing large files.

```typescript
const stream = createTransclusionStream({
  basePath: './docs',
  variables: { env: 'prod' },
  maxDepth: 5
});
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `basePath` | string | cwd | Base directory for resolving references |
| `extensions` | string[] | ['md', 'markdown'] | File extensions to try |
| `variables` | object | {} | Variables for substitution |
| `maxDepth` | number | 10 | Maximum recursion depth |
| `strict` | boolean | false | Exit on errors |
| `validateOnly` | boolean | false | Only validate, don't output |
| `cache` | FileCache | none | Optional file cache |

### Error Codes

- `FILE_NOT_FOUND` - Referenced file doesn't exist
- `CIRCULAR_REFERENCE` - Circular inclusion detected  
- `MAX_DEPTH_EXCEEDED` - Too many nested includes
- `READ_ERROR` - File read failure
- `SECURITY_ERROR` - Path security violation

See [docs/api.md](./docs/api.md) for complete API documentation.

## CLI Reference

```bash
markdown-transclusion --help
```

Key options:
- `-o, --output` - Output file (default: stdout)
- `-b, --base-path` - Base directory for references
- `--variables` - Variable substitutions (key=value)
- `-s, --strict` - Exit on any error
- `--validate-only` - Check references without output
- `--log-level` - Set verbosity (ERROR/WARN/INFO/DEBUG)

## Security

Built-in protection against:
- **Path traversal** - `../../../etc/passwd` → rejected
- **Absolute paths** - `/etc/passwd` → rejected  
- **Null bytes** - `file\x00.md` → rejected
- **Symbolic links** - Resolved within base directory

All file access is restricted to the configured base path.

## Documentation

- 📖 [API Reference](./docs/api.md) - Complete API documentation
- 🛠️ [Contributing Guide](./docs/contributing.md) - Development setup and guidelines
- 🏗️ [Technical Design](./docs/tech-plan.md) - Architecture and design decisions
- 📦 [Example Project](./examples/basic/) - Working example with all features
- 📝 [CHANGELOG](./CHANGELOG.md) - Version history and migration notes

## Contributing

We welcome contributions! Please see our [Contributing Guide](./docs/contributing.md) for details on:

- Setting up the development environment
- Running tests and linting
- Submitting pull requests
- Adding new features

## Support

- 🐛 [Report bugs](https://github.com/flyingrobots/markdown-transclusion/issues)
- 💡 [Request features](https://github.com/flyingrobots/markdown-transclusion/discussions)
- 📚 [Read the docs](./docs/)
- ⭐ Star the project on GitHub!

## Performance

- **Stream processing** - Constant memory usage regardless of file size
- **Lazy evaluation** - Files are read only when needed
- **Efficient parsing** - Single-pass line processing
- **Optional caching** - Reduce file system calls for repeated includes

Benchmarks on a MacBook Pro M1:
- 1MB file with 50 transclusions: ~15ms
- 10MB file with 500 transclusions: ~120ms
- Memory usage: ~5MB constant

## Comparison with Alternatives

| Feature | markdown-transclusion | mdbook | pandoc-include |
|---------|---------------------|--------|----------------|
| Obsidian syntax | ✅ | ❌ | ❌ |
| Streaming | ✅ | ❌ | ❌ |
| Recursive includes | ✅ | ✅ | ⚠️ |
| Circular detection | ✅ | ❌ | ❌ |
| Variables | ✅ | ⚠️ | ❌ |
| Heading extraction | ✅ | ❌ | ❌ |
| Zero dependencies | ✅ | ❌ | ❌ |

## License

MIT License

Copyright © 2025 J. Kirby Ross a.k.a. flyingrobots

See [LICENSE](./LICENSE) for details.