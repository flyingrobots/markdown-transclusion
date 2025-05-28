# Code Review TODO

This file tracks technical debt, SRP violations, and refactoring opportunities identified during code review.

## SRP Violations

### High Priority

1. **src/fileReader.ts** - `readFile()` / `readFileSync()`
   - **Issue**: Mixing I/O, validation, encoding, and content processing
   - **Impact**: Hard to test individual behaviors, requires file system for all tests
   - **Suggested Fix**: Extract pure functions for validation and processing

2. **src/stream.ts** - `TransclusionTransform`
   - **Issue**: Managing state, processing, caching, and stream control in one class
   - **Impact**: Complex testing, difficult to reason about state changes
   - **Suggested Fix**: Extract TransclusionProcessor to handle non-stream logic

3. **src/transclude.ts** - `processLine()`
   - **Issue**: Parsing, resolving, reading, and formatting all in one function
   - **Impact**: Can't test resolution logic without file I/O
   - **Suggested Fix**: Break into pipeline of focused functions

### Medium Priority

4. **src/resolver.ts** - `resolvePath()`
   - **Issue**: Variable substitution mixed with path resolution
   - **Impact**: Can't test variable substitution in isolation
   - **Suggested Fix**: Separate concerns into composable functions

5. **src/parser.ts** - `parseTransclusionReferences()`
   - **Issue**: Regex matching and object construction combined
   - **Impact**: Hard to modify parsing logic without affecting construction
   - **Suggested Fix**: Separate tokenization from AST building

### Low Priority

6. **Missing recursive transclusion implementation**
   - **Issue**: Tests written but feature not implemented
   - **Impact**: Core feature gap
   - **Suggested Fix**: Implement in TransclusionProcessor after SRP refactor

## Testing Improvements

- [ ] Replace remaining jest.spyOn usage with test doubles
- [ ] Add integration tests for error scenarios
- [ ] Create property-based tests for parser edge cases

## Documentation Gaps

- [ ] Document caching strategy in API docs
- [ ] Add examples of custom FileCache implementations
- [ ] Document error handling patterns

## Performance Considerations

- [ ] Profile memory usage with large nested transclusions
- [ ] Consider streaming for individual file reads (currently buffered)
- [ ] Benchmark cache hit/miss ratios in real usage

---

*Last Updated: 2025-05-27*