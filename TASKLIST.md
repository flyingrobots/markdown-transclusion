✅ markdown-transclusion Remaining Task List (Post-Refactor Phase)

This list aligns with the current implementation state and requirements from tech-plan.md.

**COMPLETED WORK:**
- ✅ Core file reading with UTF-8 validation and BOM handling
- ✅ In-memory file cache implementation (now optional)
- ✅ Parser for transclusion references
- ✅ Path resolver with variable substitution (fully modularized)
- ✅ Security validation for path traversal
- ✅ Stream-based transclusion processing
- ✅ Line processor integration
- ✅ NoopFileCache implementation for opt-in caching strategy
- ✅ CLI implementation with argument parsing and structured logging
- ✅ CLI test coverage with POSIX compliance
- ✅ Type system cleanup and renaming for clarity
- ✅ Comprehensive mock infrastructure for testing

**RECENT REFACTORING ACHIEVEMENTS:**
- ✅ Quest 1: Modularized path resolution (pathTokens.ts, extensionResolver.ts)
- ✅ Quest 2: Improved CLI with proper argument parsing and logging
- ✅ Quest 4: Cleaned up types (renamed for clarity, no dead code)
- ✅ Side Quest: Built comprehensive mock testing infrastructure

⸻

📂 PHASE 1: Fix Failing Tests & Missing Features

✅ Task 1: Fix Stream Output Issues
	- [ ]	Fix extra newlines in stream output (line 52 in stream.ts)
	- [ ]	Update tests to expect correct output format
	- [ ]	Ensure last line handling is correct

Commit message: fix(stream): correct newline handling in stream output

⸻

✅ Task 2: Implement Recursive Transclusion
	- [ ]	Modify LineTranscluder to support recursive processing
	- [ ]	Track depth to prevent infinite recursion
	- [ ]	Process transcluded content recursively
	- [ ]	Update failing integration tests

Note: Tests are already written but failing - need implementation.

Commit message: feat(transclude): implement recursive transclusion processing

⸻

✅ Task 3: Implement Circular Reference Detection
	- [ ]	Track file inclusion stack (visitedFiles)
	- [ ]	Detect when a file is already in the stack
	- [ ]	Return error with clear path trace
	- [ ]	Update tests to verify detection works

Commit message: feat(transclude): add circular reference detection

⸻

✅ Task 4: Fix Error Message Format
	- [ ]	Change "Missing:" to "Error:" for consistency
	- [ ]	Update all tests expecting error format
	- [ ]	Ensure error messages are informative

Commit message: fix(transclude): standardize error message format

⸻

📂 PHASE 2: Advanced Features

✅ Task 5: Relative Includes within Transcluded Files
	- [ ]	Modify resolver to support relative references from parent file
	- [ ]	Add parentPath tracking in processing
	- [ ]	Resolve paths relative to parent when enabled
	- [ ]	Add tests for nested relative includes

Commit message: feat(resolver): support relative includes from parent context

⸻

✅ Task 6: Markdown Snippet Extraction (Optional)
	- [ ]	Parse syntax like `![[file#heading]]`
	- [ ]	Extract content for specific heading
	- [ ]	Find heading and extract until next same/higher level
	- [ ]	Add test fixtures for heading extraction

Commit message: feat(parser): implement heading-specific transclusion

⸻

📂 PHASE 3: Documentation

✅ Task 7: API Documentation
	- [ ]	Create docs/api.md
	- [ ]	Document all public APIs
	- [ ]	Include TypeScript interfaces
	- [ ]	Add usage examples
	- [ ]	Document error handling

Commit message: docs(api): add comprehensive API documentation

⸻

✅ Task 8: Update README
	- [ ]	Add CLI usage examples
	- [ ]	Document stream processing
	- [ ]	Explain validation mode
	- [ ]	Show multilingual examples
	- [ ]	Add pipeline examples

Commit message: docs(readme): update with CLI usage and examples

⸻

✅ Task 9: Contributing Guide
	- [ ]	Create docs/contributing.md
	- [ ]	Explain project structure
	- [ ]	Document test strategy
	- [ ]	Add development setup
	- [ ]	Include code style guide

Commit message: docs(contributing): add developer contribution guide

⸻

📂 PHASE 4: Release Preparation

✅ Task 10: Release Pipeline
	- [ ]	Add CHANGELOG.md
	- [ ]	Setup GitHub Actions CI
	- [ ]	Configure npm publishing
	- [ ]	Create v1.0.0 release
	- [ ]	Publish to npm

Commit message: chore(release): prepare v1.0.0 release

⸻

✅ DEFINITION OF DONE
	- [ ]	All tests passing (including recursive transclusion)
	- [ ]	CLI fully functional with all options
	- [ ]	>95% test coverage maintained
	- [ ]	Documentation complete
	- [ ]	Ready for Universal Charter project use