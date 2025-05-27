# markdown-transclusion Implementation Task List

> Every checkbox is a specific, testable task. Complete in order. Each commit boundary is clearly marked.

---

## 🏗️ Phase 1: Foundation & Project Setup

### 📦 Commit 1: Initialize Project Structure
- [ ] Create new npm project with `npm init`
- [ ] Set package name to `markdown-transclusion`
- [ ] Set version to `1.0.0`
- [ ] Add description: "Stream-based library for resolving Obsidian-style transclusion references in Markdown documents"
- [ ] Set main entry point to `dist/index.js`
- [ ] Set bin entry point to `dist/cli.js`
- [ ] Add `files` field: `["dist/**/*", "README.md", "LICENSE"]`
- [ ] Create basic directory structure: `src/`, `tests/`, `tests/fixtures/`, `docs/`
- [ ] Add `.gitignore` with `node_modules/`, `dist/`, `*.log`, `.env`
- [ ] Create `README.md` with basic description and installation instructions

**Commit message**: `feat: initialize project structure and package.json`  
**Tests**: Verify directory structure exists, package.json is valid JSON

### 🔧 Commit 2: Development Tooling Setup  
- [ ] Install TypeScript: `npm install -D typescript @types/node`
- [ ] Install Jest: `npm install -D jest @types/jest ts-jest`
- [ ] Install ESLint: `npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin`
- [ ] Create `tsconfig.json` with target ES2020, module CommonJS, outDir "dist", include "src/**/*"
- [ ] Create `jest.config.js` with preset ts-jest, testEnvironment node, collectCoverageFrom src/**
- [ ] Create `.eslintrc.js` with TypeScript parser and recommended rules
- [ ] Add npm scripts: `build`, `test`, `test:watch`, `lint`, `clean`
- [ ] Create basic `src/index.ts` that exports an empty object
- [ ] Create basic `tests/index.test.ts` that imports from src

**Commit message**: `build: add TypeScript, Jest, and ESLint configuration`  
**Tests**: Run `npm test`, `npm run build`, `npm run lint` - all should pass

### 📋 Commit 3: Core Type Definitions
- [ ] Create `src/types.ts` with all interfaces from tech design
- [ ] Define `TransclusionOptions` interface with all fields and JSDoc comments
- [ ] Define `TransclusionError` interface with message, path, line fields
- [ ] Define `TransclusionResult` interface (for convenience functions)
- [ ] Define internal types: `ParsedReference`, `ResolvedPath`, `FileCache`
- [ ] Add type for `TransclusionTransform` stream class
- [ ] Export all types from `src/index.ts`
- [ ] Create unit test file `tests/types.test.ts` to verify all types compile

**Commit message**: `feat: define core TypeScript interfaces and types`  
**Tests**: TypeScript compilation succeeds, all types are exported correctly

---

## 🔍 Phase 2: Core Parsing & Path Resolution

### 🔎 Commit 4: Transclusion Pattern Recognition
- [ ] Create `src/parser.ts` with regex for basic `![[filename]]` pattern
- [ ] Implement `parseTransclusionReferences(line: string)` function
- [ ] Handle basic patterns: `![[file]]`, `![[path/file]]`, `![[file.md]]`
- [ ] Return array of `ParsedReference` objects with original, path, startIndex, endIndex
- [ ] Handle multiple transclusions on same line: `![[header]] text ![[footer]]`
- [ ] Ignore transclusions inside code blocks (``` fenced and ` inline)
- [ ] Ignore transclusions inside HTML comments `<!-- -->`
- [ ] Handle whitespace variations: `![[file]]`, `![[  file  ]]`
- [ ] Create comprehensive test file `tests/parser.test.ts`

**Commit message**: `feat: implement transclusion pattern parsing with code block detection`  
**Tests**: Test all syntax variations, multiple per line, code block ignoring, whitespace handling

### 🛡️ Commit 5: Security & Path Validation
- [ ] Create `src/security.ts` with path traversal prevention
- [ ] Implement `validatePath(path: string)` function  
- [ ] Reject absolute paths starting with `/` or `C:\`
- [ ] Reject path traversal attempts: `../`, `..\\`, URL-encoded variants
- [ ] Reject null bytes and other dangerous characters
- [ ] Implement `isWithinBasePath(resolvedPath: string, basePath: string)` 
- [ ] Add comprehensive test `tests/security.test.ts`
- [ ] Test path traversal attempts: `../../etc/passwd`, `../../../`
- [ ] Test absolute paths: `/etc/hosts`, `C:\Windows\System32`
- [ ] Test encoded attempts: `%2e%2e%2f`, `..%2f`

**Commit message**: `security: add path traversal prevention and validation`  
**Tests**: All malicious path attempts are rejected, legitimate paths pass

### 🗂️ Commit 6: Basic Path Resolution  
- [ ] Create `src/resolver.ts` with path resolution logic
- [ ] Implement `resolvePath(reference: string, basePath: string)` function
- [ ] Handle relative paths from basePath directory
- [ ] Add `.md` extension if no extension provided
- [ ] Support custom extension list from options
- [ ] Handle nested directory paths: `sections/intro/overview`
- [ ] Integrate security validation from previous commit
- [ ] Return `ResolvedPath` object with absolute path and exists boolean
- [ ] Create test file `tests/resolver.test.ts` with various path scenarios
- [ ] Test with real file fixtures in `tests/fixtures/`

**Commit message**: `feat: implement secure path resolution with extension inference`  
**Tests**: Path resolution works correctly, security validation integrated, fixtures tested

### 🔤 Commit 7: Variable Substitution System
- [ ] Add variable substitution to `src/resolver.ts`
- [ ] Implement `substituteVariables(path: string, variables: Record<string, string>)` 
- [ ] Handle basic substitution: `{{lang}}` → `es`
- [ ] Support multiple variables: `{{type}}-{{lang}}-{{version}}`
- [ ] Handle undefined variables gracefully (return original or throw based on strict mode)
- [ ] Support variables with special characters: `{{var-with-dash}}`
- [ ] Add escaping for literal `{{` and `}}` if needed
- [ ] Update path resolution to integrate variable substitution
- [ ] Extend `tests/resolver.test.ts` with variable substitution tests
- [ ] Test edge cases: undefined variables, multiple variables, special characters

**Commit message**: `feat: add variable substitution system for multilingual templates`  
**Tests**: All variable substitution patterns work, edge cases handled properly

---

## 📂 Phase 3: File Operations & Basic Transclusion

### 📖 Commit 8: File Reading & Caching System
- [ ] Create `src/fileCache.ts` with simple file caching
- [ ] Implement `FileCache` class with `get(path: string)` and `set(path, content)` methods
- [ ] Add cache hit/miss statistics for debugging
- [ ] Create `src/fileReader.ts` with async file operations
- [ ] Implement `readFile(path: string, cache?: FileCache)` function
- [ ] Handle file not found errors gracefully
- [ ] Support different encodings (UTF-8 by default)
- [ ] Handle BOM (Byte Order Mark) in UTF-8 files
- [ ] Add Unicode filename support test cases
- [ ] Create test files with various content: `tests/fixtures/unicode/文档.md`
- [ ] Test binary file detection and rejection

**Commit message**: `feat: implement file reading with caching and Unicode support`  
**Tests**: File reading works, cache functions properly, Unicode filenames supported, BOM handling

### 🔄 Commit 9: Basic Transclusion Engine  
- [ ] Create `src/transclude.ts` with core transclusion logic
- [ ] Implement `processLine(line: string, options: TransclusionOptions)` function
- [ ] Parse transclusion references using parser
- [ ] Resolve paths using resolver with variable substitution
- [ ] Read files using fileReader with caching
- [ ] Replace `![[reference]]` with file contents
- [ ] Handle missing files based on strict/warn mode
- [ ] Insert HTML comments for missing files: `<!-- Missing: path/to/file.md -->`
- [ ] Create comprehensive test file `tests/transclude.test.ts`
- [ ] Test basic transclusion, missing files, multiple per line
- [ ] Create test fixtures with simple transclusion scenarios

**Commit message**: `feat: implement basic transclusion engine with error handling`  
**Tests**: Basic transclusion works, missing files handled properly, multiple transclusions per line

### 🔄 Commit 10: Recursive Transclusion & Circular Detection
- [ ] Add recursive processing to transclusion engine
- [ ] Implement `processContent(content: string, options, visitedFiles: Set<string>)` 
- [ ] Track visited files to detect circular references
- [ ] Process transcluded content recursively
- [ ] Limit recursion depth via `maxDepth` option (default 10)
- [ ] Generate clear error messages with circular reference chain
- [ ] Add comprehensive circular reference detection tests
- [ ] Create test fixtures with circular references: A includes B, B includes A
- [ ] Test deep recursion scenarios (A → B → C → D → E)
- [ ] Test recursion depth limiting

**Commit message**: `feat: add recursive transclusion with circular reference detection`  
**Tests**: Recursive transclusion works, circular references detected and prevented, depth limiting works

---

## 🌊 Phase 4: Stream Implementation

### 📦 Commit 11: Transform Stream Foundation
- [ ] Create `src/stream.ts` with `TransclusionTransform` class
- [ ] Extend Node.js `Transform` stream class
- [ ] Implement basic `_transform(chunk, encoding, callback)` method
- [ ] Add line buffering logic to accumulate partial lines
- [ ] Handle chunk boundaries that split lines
- [ ] Buffer input until complete lines are available
- [ ] Pass through non-transclusion lines unchanged
- [ ] Create basic test file `tests/stream.test.ts`
- [ ] Test line buffering with various chunk sizes
- [ ] Test chunk boundaries splitting lines

**Commit message**: `feat: implement basic Transform stream with line buffering`  
**Tests**: Stream processes chunks correctly, line buffering works, no data loss

### 🔀 Commit 12: Stream Transclusion Integration
- [ ] Integrate transclusion engine into Transform stream
- [ ] Process complete lines for transclusion references
- [ ] Handle async file reading within stream transform
- [ ] Manage stream backpressure during file operations
- [ ] Handle errors in stream (emit 'error' event)
- [ ] Support different error handling modes (strict vs warn)
- [ ] Add stream pausing/resuming during file processing
- [ ] Test with real file fixtures and stream processing
- [ ] Test error propagation through streams
- [ ] Test backpressure handling

**Commit message**: `feat: integrate transclusion processing into Transform stream`  
**Tests**: Stream-based transclusion works, errors handled properly, backpressure managed

### 🔧 Commit 13: Stream Edge Cases & Robustness
- [ ] Handle transclusion syntax split across chunks: `![[fi|le.md]]`
- [ ] Test with very small chunk sizes (1-2 bytes)
- [ ] Handle partial line buffering with very long lines (>64KB)
- [ ] Test memory usage with large files and many transclusions
- [ ] Add stream end handling to flush remaining buffer
- [ ] Handle files with no trailing newline
- [ ] Test concurrent file reads during stream processing
- [ ] Add comprehensive stream edge case tests
- [ ] Test exponential expansion scenarios (many nested transclusions)
- [ ] Performance test with large document processing

**Commit message**: `feat: handle stream edge cases and improve robustness`  
**Tests**: All edge cases handled, memory usage constant, performance acceptable

---

## 💻 Phase 5: CLI Interface & Modes

### ⚙️ Commit 14: Argument Parsing & Basic CLI
- [ ] Create `src/cli.ts` with command-line interface
- [ ] Add shebang line: `#!/usr/bin/env node`
- [ ] Implement argument parsing (no external dependencies)
- [ ] Support basic options: `--variables`, `--base-path`, `--output`
- [ ] Support input from file argument or stdin
- [ ] Output to file or stdout
- [ ] Add `--help` and `--version` flags
- [ ] Create `createTransclusionStream()` export function
- [ ] Wire up CLI to use Transform stream
- [ ] Test CLI with basic scenarios

**Commit message**: `feat: implement basic CLI interface with argument parsing`  
**Tests**: CLI works with file input/output, stdin/stdout, help text displays

### 🔍 Commit 15: Validation Mode Implementation
- [ ] Add `--validate` flag to CLI
- [ ] Implement validation-only mode that doesn't output content
- [ ] Check all transclusion references exist without processing
- [ ] Support multiple language variables for validation: `--variables lang=en,es,fr`
- [ ] Report missing files with clear error messages
- [ ] Exit with error code if validation fails
- [ ] Exit with success code if all references valid
- [ ] Add validation mode tests
- [ ] Test with missing files across multiple languages
- [ ] Test validation performance vs full processing

**Commit message**: `feat: add validation mode for CI/CD reference checking`  
**Tests**: Validation mode works, detects missing files, proper exit codes, performance acceptable

### ⚡ Commit 16: Strict & Warn Error Modes
- [ ] Add `--strict` and `--warn` flags to CLI
- [ ] Implement strict mode: fail immediately on missing files
- [ ] Implement warn mode: log warnings but continue processing
- [ ] Make warn mode the default behavior
- [ ] Provide clear error messages with file paths and context
- [ ] Test strict mode with missing files (should exit with error)
- [ ] Test warn mode with missing files (should continue with warnings)
- [ ] Add verbose logging option `--verbose`
- [ ] Log file resolution and processing steps in verbose mode
- [ ] Test error modes with various scenarios

**Commit message**: `feat: add strict and warn error handling modes`  
**Tests**: Both error modes work correctly, appropriate logging, proper exit codes

---

## 🛡️ Phase 6: Edge Cases & Advanced Features  

### 🔤 Commit 17: Advanced Syntax Support
- [ ] Add heading-specific transclusion support: `![[file#heading]]`
- [ ] Implement heading extraction from Markdown files
- [ ] Support heading IDs and anchor links
- [ ] Handle malformed syntax gracefully: `![[`, `![[]]]`, `![[]]`
- [ ] Handle files with spaces in names: `![[file with spaces]]`
- [ ] Support empty references with helpful error messages
- [ ] Add comprehensive syntax edge case tests
- [ ] Test heading extraction with various Markdown heading formats
- [ ] Test malformed syntax handling
- [ ] Create fixtures for advanced syntax scenarios

**Commit message**: `feat: add heading-specific transclusions and improved syntax handling`  
**Tests**: Heading extraction works, malformed syntax handled gracefully, edge cases covered

### 🔐 Commit 18: Enhanced Security & Symlink Handling
- [ ] Add symlink detection and prevention
- [ ] Implement `fs.lstat()` to check for symlinks
- [ ] Reject symlinks that point outside base directory
- [ ] Add comprehensive security tests
- [ ] Test symlink creation and detection (Unix/Windows compatible)
- [ ] Test files outside base directory access attempts
- [ ] Add option to allow/disallow symlink following
- [ ] Document security considerations in README
- [ ] Test with complex directory structures
- [ ] Verify no information disclosure through error messages

**Commit message**: `security: add symlink detection and enhanced path security`  
**Tests**: Symlinks handled securely, no path traversal possible, no information disclosure

### 🎯 Commit 19: Content & Encoding Edge Cases  
- [ ] Add binary file detection to prevent processing
- [ ] Handle files with no trailing newline
- [ ] Support various text encodings (UTF-8, UTF-16, Latin-1)
- [ ] Handle very long lines without memory issues
- [ ] Add BOM (Byte Order Mark) stripping for UTF files
- [ ] Test with unusual file content scenarios
- [ ] Create fixtures with various encodings and edge cases  
- [ ] Test memory usage with extremely long lines
- [ ] Test processing speed with large files
- [ ] Add encoding detection and conversion if needed

**Commit message**: `feat: handle content edge cases and encoding variations`  
**Tests**: All encoding types supported, binary files rejected, long lines handled efficiently

---

## 🧪 Phase 7: Comprehensive Testing

### 🔬 Commit 20: Unit Test Completion
- [ ] Achieve >95% code coverage across all modules
- [ ] Add missing unit tests for all edge cases
- [ ] Test all error conditions and code paths
- [ ] Add property-based testing for parser with random inputs
- [ ] Test all TypeScript interfaces and type checking
- [ ] Add performance benchmarks for key operations
- [ ] Test memory usage patterns and leaks
- [ ] Create comprehensive test fixture library
- [ ] Document test scenarios and expected behaviors
- [ ] Set up test coverage reporting

**Commit message**: `test: achieve comprehensive unit test coverage >95%`  
**Tests**: All code paths tested, coverage threshold met, performance benchmarks passing

### 🔗 Commit 21: Integration & End-to-End Testing  
- [ ] Create full end-to-end CLI tests
- [ ] Test complete Universal Charter workflow scenarios
- [ ] Test stream processing with large real-world documents
- [ ] Test all CLI flag combinations
- [ ] Test pipeline integration: `cat input | cli | pandoc`
- [ ] Add performance tests for concurrent processing
- [ ] Test error scenarios in full pipeline context
- [ ] Create realistic test documents with complex transclusion hierarchies
- [ ] Test memory usage with production-scale documents
- [ ] Add CI/CD pipeline simulation tests

**Commit message**: `test: add comprehensive integration and end-to-end testing`  
**Tests**: Full workflows tested, pipeline integration verified, performance acceptable

### 🚀 Commit 22: Performance & Stress Testing
- [ ] Add benchmark suite for stream processing throughput
- [ ] Test with exponential expansion scenarios (controlled)
- [ ] Benchmark file caching effectiveness
- [ ] Test concurrent transclusion of same files
- [ ] Measure memory usage with various input sizes
- [ ] Add performance regression tests
- [ ] Optimize critical path operations if needed
- [ ] Document performance characteristics
- [ ] Test scaling behavior with document size
- [ ] Add performance CI checks to prevent regressions

**Commit message**: `perf: add performance testing and optimization`  
**Tests**: Performance benchmarks established, scaling behavior documented, no regressions

---

## 📚 Phase 8: Documentation & Polish

### 📖 Commit 23: API Documentation & Examples
- [ ] Create comprehensive `docs/api.md` with all functions
- [ ] Document all TypeScript interfaces with examples
- [ ] Add JSDoc comments to all public functions
- [ ] Create usage examples for common scenarios
- [ ] Document CLI options and modes completely
- [ ] Add troubleshooting guide for common issues
- [ ] Create migration guide for different use cases
- [ ] Document performance characteristics and limitations
- [ ] Add security considerations documentation
- [ ] Include Universal Charter workflow examples

**Commit message**: `docs: add comprehensive API documentation and examples`  
**Tests**: All public APIs documented, examples work correctly, no broken links

### 🎨 Commit 24: README & Package Polish
- [ ] Write compelling README with clear value proposition
- [ ] Add installation and quick start guide
- [ ] Include Universal Charter use case as primary example
- [ ] Add badges for npm version, build status, coverage
- [ ] Create changelog following conventional commits
- [ ] Add contributing guidelines
- [ ] Set up GitHub issue templates
- [ ] Add proper license file (MIT recommended)
- [ ] Clean up package.json keywords and metadata
- [ ] Add funding information if desired

**Commit message**: `docs: create comprehensive README and package documentation`  
**Tests**: README renders correctly, all examples work, links are valid

### 🚀 Commit 25: Release Preparation
- [ ] Set up semantic versioning and release process
- [ ] Configure npm publish settings and `.npmignore`
- [ ] Set up GitHub Actions for CI/CD
- [ ] Add automated testing on multiple Node.js versions
- [ ] Set up automated npm publishing on tag
- [ ] Create GitHub release template
- [ ] Add security policy and vulnerability reporting
- [ ] Final code review and cleanup
- [ ] Prepare v1.0.0 release notes
- [ ] Tag and publish initial release

**Commit message**: `chore: prepare for v1.0.0 release with CI/CD setup`  
**Tests**: All CI checks pass, package publishes correctly, release artifacts generated

---

## ✅ Definition of Done

Each commit must meet these criteria:
- [ ] All new code has corresponding tests
- [ ] Test coverage remains >95%
- [ ] All existing tests still pass
- [ ] TypeScript compiles without errors or warnings
- [ ] ESLint passes with no violations
- [ ] Code is properly documented with JSDoc
- [ ] Commit message follows conventional commit format
- [ ] Performance impact is measured and acceptable

## 🚨 Critical Success Factors

- **Security First**: Path validation must be bulletproof
- **Stream Performance**: Memory usage must remain constant regardless of file size
- **Error Handling**: All error modes must work reliably for CI/CD
- **Universal Charter Ready**: Must handle multilingual workflows correctly
- **ADHD-Proof Process**: Each task must be completable in one focused session

---

*This task list provides complete implementation guidance for the markdown-transclusion library. Follow each task sequentially for systematic, reliable development.*