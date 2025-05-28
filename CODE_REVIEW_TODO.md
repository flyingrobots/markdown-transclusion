# Code Review TODO

This file tracks technical debt and remaining implementation tasks after the refactoring phase.

## Completed Refactorings ✅

### High Priority - DONE
1. **src/resolver.ts** - Path resolution fully modularized
   - ✅ Variable substitution extracted to `pathTokens.ts`
   - ✅ Extension resolution extracted to `extensionResolver.ts`
   - ✅ Now follows Open/Closed Principle

2. **CLI Implementation** - Properly structured
   - ✅ Argument parsing extracted to `cliArgs.ts`
   - ✅ Structured logging via `Logger` interface
   - ✅ POSIX compliance for stream handling

3. **Type System** - Cleaned up
   - ✅ Renamed vague types for clarity
   - ✅ No dead code or unused types
   - ✅ All TODO comments removed

4. **Test Infrastructure** - Modernized
   - ✅ Comprehensive mock layer created
   - ✅ Test environment builder with fluent API
   - ✅ Custom Jest matchers for transclusions

## Remaining Implementation Tasks

### High Priority - Missing Features

1. **Recursive Transclusion** 
   - **Issue**: Tests written but feature not implemented
   - **Impact**: Core feature missing, integration tests failing
   - **Location**: `LineTranscluder` needs to process content recursively
   - **Fix**: Implement recursive processing with depth tracking

2. **Circular Reference Detection**
   - **Issue**: No detection for circular includes
   - **Impact**: Infinite loops possible
   - **Location**: Need to track file inclusion stack
   - **Fix**: Add visited file tracking with clear error messages

3. **Stream Output Issues**
   - **Issue**: Extra newlines in output
   - **Impact**: Tests failing, output format incorrect
   - **Location**: `stream.ts` line 52
   - **Fix**: Correct newline handling for last line

### Medium Priority - Enhancements

4. **Relative Path Resolution from Parent**
   - **Issue**: Paths always resolve from base, not parent file
   - **Impact**: Limits nested file organization
   - **Fix**: Add parent path context to resolver

5. **Heading-Specific Transclusion**
   - **Issue**: Can't include specific sections
   - **Impact**: Missing Obsidian compatibility feature
   - **Fix**: Parse `#heading` syntax and extract content

6. **Error Message Consistency**
   - **Issue**: "Missing:" vs "Error:" inconsistency
   - **Impact**: Confusing error reporting
   - **Fix**: Standardize all error messages

## Documentation Gaps

- [ ] Create `docs/api.md` with full API reference
- [ ] Update README with CLI usage examples
- [ ] Add contributing guide
- [ ] Document caching strategy
- [ ] Add error handling patterns

## Testing Improvements

- [ ] Fix failing recursive transclusion tests
- [ ] Add circular reference test cases
- [ ] Create property-based tests for parser
- [ ] Add performance benchmarks

## Performance Considerations

- [ ] Profile memory usage with deep nesting
- [ ] Consider streaming for large files
- [ ] Benchmark cache effectiveness
- [ ] Optimize recursive processing

## Technical Debt (Low Priority)

Some functions still have mixed responsibilities but are acceptable:
- `fileReader.ts` - I/O and validation coupled (standard pattern)
- `stream.ts` - Stream management is inherently stateful
- `parser.ts` - Regex and construction tightly coupled

---

*Last Updated: 2025-05-28*
*Status: Refactoring phase complete, implementation phase beginning*