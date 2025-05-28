# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-05-28

### Added
- Initial release of markdown-transclusion
- Stream-based processing for memory-efficient transclusion resolution
- Support for Obsidian-style `![[filename]]` syntax
- Recursive transclusion with configurable depth limit (default: 10)
- Circular reference detection with clear error reporting
- Variable substitution for multilingual content (`{{variable}}` syntax)
- Heading-specific transclusion (`![[file#heading]]` syntax)
- Relative path resolution from parent file context
- Built-in security features:
  - Path traversal protection
  - Null byte blocking
  - Base path enforcement
- Optional file caching with pluggable cache implementations
- Command-line interface with POSIX compliance:
  - Stream support (stdin/stdout)
  - File input/output
  - Variable substitution
  - Validation mode
  - Strict error handling
- Comprehensive error handling with error codes
- Full TypeScript support with exported types
- Zero runtime dependencies

### Security
- All file paths are validated against path traversal attempts
- Absolute paths are rejected
- File access is restricted to the configured base path

### Performance
- Constant memory usage through streaming
- Line-by-line processing
- Optional caching for repeated file reads

[1.0.0]: https://github.com/anthropics/markdown-transclusion/releases/tag/v1.0.0