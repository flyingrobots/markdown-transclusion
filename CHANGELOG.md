# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2025-07-06

### Added
- **Template Variable Substitution** - Dynamic content substitution in transcluded files
  - Support for `{{variable}}` syntax within transcluded content
  - CLI flag `--template-variables` for passing variables from command line
  - Handles all JavaScript types: strings, numbers, booleans, null, undefined, Date objects, functions
  - Function values are called to get dynamic values at substitution time
  - Preserves unmatched variables when values are not provided
  - Stream-based processing handles variables that span chunk boundaries
- **Plugin System Architecture** - Comprehensive plugin system following SOLID principles
  - Plugin loader with file/directory support and validation
  - Plugin registry with lifecycle management and priority-based execution
  - Built-in plugins: CodeHighlighter, MacroExpander, TableFormatter
  - CLI integration with `--plugins` and `--plugin-config` flags
  - Full TypeScript support with dependency injection
- **Enhanced Error Recovery** - Intelligent error suggestions with fuzzy matching
  - Levenshtein distance algorithm for file/heading/variable suggestions
  - Context-aware error messages with confidence percentages
  - Actionable fix recommendations and "did you mean?" prompts
  - Integration with existing error handling while maintaining compatibility
- **Heading Range Extraction** - Advanced transclusion syntax
  - Support for `![[file#start:end]]` syntax to include content between headings
  - Enables precise content selection from large documents
- **CLI Output Control** - Unix-style output modes for different use cases
  - `--verbose` flag for detailed human-readable progress output
  - `--porcelain` flag for machine-readable output suitable for scripting
  - `--progress` flag for real-time progress bars during processing
  - Unix philosophy compliance with "silence is golden" default behavior
- **Docker Development Environment** - Containerized development workflow
  - Complete Docker setup for consistent development environment
  - Docker Compose services for development, testing, and building
  - Helper scripts for common Docker operations

### Changed
- **Feature Organization** - Moved completed features to `docs/features/completed/`
  - Consolidated all completed feature specifications in single directory
  - Consistent naming convention for feature documentation
- **Documentation** - Updated README.md with comprehensive feature coverage
  - Enhanced transclusion syntax documentation with new features
  - Plugin system usage examples and development guide
  - CLI options documentation with all new flags

### Fixed
- **CLI Output Format** - Standardized error and warning output
  - Output 'WARN:' prefix for warnings instead of 'Warning:'
  - Output 'ERROR:' prefix for errors in strict mode  
  - Output 'WARN:' prefix for errors in non-strict mode
  - Fixed log level handling to properly suppress warnings when log level is ERROR
- **TypeScript Errors** - Resolved all TypeScript compilation errors
  - Fixed missing TransclusionError export from core/types module
  - Resolved type errors in stream processing and CLI modules
- **ESLint Compliance** - Fixed all linting errors for CI/CD
  - Removed unused variables and imports
  - Fixed lexical declarations in switch case blocks
  - Corrected parsing errors from automated fixes

### Technical
- All new features follow SOLID principles (SRP, DI, KISS, YAGNI)
- Comprehensive E2E test coverage for all new functionality
- Type-safe plugin development with full TypeScript support
- Error isolation and graceful fallback for plugin failures

## [1.0.0] - 2025-05-29


### Bug Fixes

* **cli:** ensure graceful log flushing before exit in all CLI paths ([8d0a301](https://github.com/flyingrobots/markdown-transclusion/commit/8d0a301ed109696d006d9c107f918483669a12ef))
* **parser:** replace regex with bracket-aware parser for transclusion tokens ([9cd19c1](https://github.com/flyingrobots/markdown-transclusion/commit/9cd19c146c62c0958e3dc15f7db189a823416a54))
* **stream:** avoid leading newline in transclusion output ([9722407](https://github.com/flyingrobots/markdown-transclusion/commit/97224075e4a6c48c74e181765afa19a0c8d01c26))
* **stream:** correct newline formatting and prepare for flush logic ([190e264](https://github.com/flyingrobots/markdown-transclusion/commit/190e264c22ec4091150fcbdb1dc46b88fc1696a7))


### Code Refactoring

* **core:** unify all transclusion logic via LineTranscluder ([d0d77e2](https://github.com/flyingrobots/markdown-transclusion/commit/d0d77e2ac240674d1343ad964ce70ff0c46b3ea6))
* **fileReader:** extract SRP-compliant safeReadFile utils ([a08be53](https://github.com/flyingrobots/markdown-transclusion/commit/a08be532617a16c5f7c763c3dd049e675495248c))


### Features

* **cli:** add CLI entry point with argument parsing and stream pipeline ([3bf0c16](https://github.com/flyingrobots/markdown-transclusion/commit/3bf0c161ffbff4ab6304cff0dc4e3f76bc895eed))
* **cli:** implement argument parser, help and version output ([dca37ac](https://github.com/flyingrobots/markdown-transclusion/commit/dca37aca051116521b56c8db034c80382a51b43a))
* **core:** introduce Result<T, E> type + SRP cleanup checklists ([65734a9](https://github.com/flyingrobots/markdown-transclusion/commit/65734a92b28d981f7d2a1f1cbfbab712e2a5dba7))
* **file:** add file reader and in-memory cache with UTF-8 validation ([7d7338e](https://github.com/flyingrobots/markdown-transclusion/commit/7d7338e19b02207d27d05634c7bcbd30d38caed3))
* **init:** scaffold package.json with project metadata ([1d473c9](https://github.com/flyingrobots/markdown-transclusion/commit/1d473c91c47e2d48e81f7a26b6848ec63a32d804))
* **logger:** add stream-based, silent, and console loggers with log levels ([9828b86](https://github.com/flyingrobots/markdown-transclusion/commit/9828b86f05038d2ac28b091f150f896677142b10))
* **parser:** implement transclusion parser with code/comment masking ([2a7448a](https://github.com/flyingrobots/markdown-transclusion/commit/2a7448a1f865affbc3b69d22e56cb2f10428979e))
* **resolver:** add secure path resolution with extension inference and typed errors ([dfacf9f](https://github.com/flyingrobots/markdown-transclusion/commit/dfacf9fe550bf78315851ba4cdc7aed5b872f9a3))
* **resolver:** add variable substitution support with strict mode for multilingual workflows ([e542f73](https://github.com/flyingrobots/markdown-transclusion/commit/e542f7389d49c6879d27b0220b68987d623d53a8))
* **security:** implement path validation and base directory enforcement ([66399c0](https://github.com/flyingrobots/markdown-transclusion/commit/66399c0c5be1adf1319f6e3a0b3e9da0fb0dff21))
* **transclude:** implement core line processor and stream integration ([d59d28a](https://github.com/flyingrobots/markdown-transclusion/commit/d59d28ad924663ff2746e4512accb74c5edcb63d))
* **transclusion:** add technical design document for initial architecture ([e9d597d](https://github.com/flyingrobots/markdown-transclusion/commit/e9d597d48fa1119951921e9bb7fcff3c085e1e44))
* **types:** define core interfaces and export public API surface ([308ad77](https://github.com/flyingrobots/markdown-transclusion/commit/308ad77348052ba6b63373071e533291d8148df8))


### BREAKING CHANGES

* **core:** processLine() now supports recursive includes, heading extraction, and circular reference detection. Old non-recursive behavior has been removed.
* **fileReader:** internal fileReader logic now delegates to pure utility modules
* **file:** Files larger than 1MB are not supported in buffered mode.
Streaming support will be added in a future commit.



